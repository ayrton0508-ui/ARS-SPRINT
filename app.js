const DB="ARS_SPRINT_V31";
const state={
 stream:null,pose:null,raf:0,armed:false,running:false,finished:false,calibrated:false,
 direction:1,gates:{0:.10,5:.30,10:.50,20:.90},tracks:[],filtered:null,
 startT:null, attempt:null, recorder:null,chunks:[],recording:false,
 gateTimes:{5:null,10:null,20:null},lastFrameAt:0,frameCount:0,validFrames:0,
 cameraStable:true, tiltOk:true
};
const $=id=>document.getElementById(id);
const screens=[$("setup"),$("run"),$("result"),$("history")];
const db=()=>JSON.parse(localStorage.getItem(DB)||'{"athletes":["Atleta 1"],"results":[]}');
const saveDB=x=>localStorage.setItem(DB,JSON.stringify(x));
const show=s=>{screens.forEach(x=>x.classList.remove("active"));s.classList.add("active")};
const fmt=x=>Number.isFinite(x)?x.toFixed(3):"—";
function populate(){const d=db();$("athleteSelect").innerHTML=d.athletes.length?d.athletes.map((a,i)=>`<option value="${i}">${a}</option>`).join(""):"<option>Atleta 1</option>"}
populate();

async function initPose(){
 try{
  const {PoseLandmarker,FilesetResolver}=await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/+esm");
  const fs=await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm");
  state.pose=await PoseLandmarker.createFromOptions(fs,{baseOptions:{modelAssetPath:"https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",delegate:"GPU"},runningMode:"VIDEO",numPoses:1,minPoseDetectionConfidence:.65,minPosePresenceConfidence:.65,minTrackingConfidence:.65});
  return true;
 }catch(e){console.warn(e);return false}
}
async function camera(){
 try{
  state.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment",width:{ideal:1920},height:{ideal:1080},frameRate:{ideal:60}},audio:true});
  $("video").srcObject=state.stream;$("runVideo").srcObject=state.stream;
  await $("video").play();await $("runVideo").play();
  $("cameraMessage").textContent="Cámara activa — nivela y encuadra la pista";
  $("connectionBadge").textContent="CÁMARA ACTIVA";
  if(window.DeviceOrientationEvent)window.addEventListener("deviceorientation",orientation,{passive:true});
  const ok=await initPose();
  $("checkAthlete").textContent=ok?"○ Buscando atleta":"○ Motor corporal no disponible";
  if(ok)loop();
 }catch(e){alert("Activa la cámara desde HTTPS y concede permiso de cámara/micrófono.")}
}
$("startCameraBtn").onclick=camera;
function orientation(e){
 const b=Number(e.beta),g=Number(e.gamma);
 if(!Number.isFinite(b)||!Number.isFinite(g))return;
 const landscape=Math.abs(g)>35||Math.abs(b)<55;
 const tilt=Math.min(Math.abs(g),Math.abs(b-90),Math.abs(b+90));
 state.tiltOk=tilt<7;
 $("tiltIndicator").textContent=`Nivel: ${Math.abs(tilt).toFixed(1)}°`;
 $("checkTilt").classList.toggle("ok",state.tiltOk);
 $("checkTilt").textContent=(state.tiltOk?"● ":"○ ")+"Cámara nivelada";
}
function applyDirection(dir){
 state.direction=dir;
 $("directionSelect").value=dir>0?"forward":"reverse";
 // The logical 0 m start moves to the opposite end, matching the sideline workflow.
 if(dir<0){
   const old={...state.gates};
   state.gates[0]=old[20]; state.gates[5]=old[10]; state.gates[10]=old[5]; state.gates[20]=old[0];
 } else {
   const xs=[state.gates[0],state.gates[5],state.gates[10],state.gates[20]];
   const min=Math.min(...xs),max=Math.max(...xs);
   const ordered=xs.slice().sort((a,b)=>a-b);
   state.gates[0]=ordered[0];state.gates[5]=ordered[1];state.gates[10]=ordered[2];state.gates[20]=ordered[3];
 }
 [0,5,10,20].forEach(m=>{const el=document.querySelector(`.gate-line[data-gate="${m}"]`);if(el)el.style.left=(state.gates[m]*100)+"%"});
}
$("flipBtn").onclick=()=>applyDirection(state.direction*-1);
$("directionSelect").onchange=e=>applyDirection(e.target.value==="forward"?1:-1);

function fit(c,v){const r=v.getBoundingClientRect(),d=devicePixelRatio||1;c.width=r.width*d;c.height=r.height*d;return[r.width,r.height,d]}
function point(res){
 const p=res?.landmarks?.[0];if(!p)return null;
 const ids=[23,24,11,12],q=ids.map(i=>p[i]).filter(x=>x&&Number(x.visibility??1)>.55);
 if(q.length<2)return null;
 return {x:q.reduce((s,a)=>s+a.x,0)/q.length,y:q.reduce((s,a)=>s+a.y,0)/q.length,conf:q.reduce((s,a)=>s+(a.visibility??1),0)/q.length};
}
function draw(c,v,pt){
 const [w,h,d]=fit(c,v),ctx=c.getContext("2d");ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,w,h);
 Object.entries(state.gates).forEach(([m,x])=>{ctx.strokeStyle=state.running&&state.gateTimes[m]?"#8bd49a":"#c4c9cf";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x*w,0);ctx.lineTo(x*w,h);ctx.stroke();ctx.fillStyle="#0b0d10dd";ctx.fillRect(x*w-21,9,42,20);ctx.fillStyle="#fff";ctx.font="11px sans-serif";ctx.textAlign="center";ctx.fillText(m+" m",x*w,23)});
 if(pt){ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(pt.x*w,pt.y*h,7,0,Math.PI*2);ctx.fill()}
}
async function loop(){
 if(!state.pose||!$("video").videoWidth){state.raf=requestAnimationFrame(loop);return}
 const now=performance.now();
 try{
  const res=state.pose.detectForVideo($("video"),now),p=point(res);
  draw(overlay,$("video"),p);
  if(p){
   $("checkAthlete").textContent=state.armed||state.running?"● Atleta fijado":"● Atleta detectado";
   $("checkAthlete").classList.add("ok");
   if(state.armed) process(p,now);
  }
 }catch(e){}
 state.raf=requestAnimationFrame(loop);
}
function smooth(p,now){
 const a=.32;
 if(!state.filtered)return state.filtered={...p,t:now};
 state.filtered.x=a*p.x+(1-a)*state.filtered.x;
 state.filtered.y=a*p.y+(1-a)*state.filtered.y;
 state.filtered.conf=a*p.conf+(1-a)*state.filtered.conf;
 state.filtered.t=now;return state.filtered;
}
$("calibrateBtn").onclick=()=>{
 // Gates remain user-positioned; calibration only locks them after the four reference positions exist.
 const xs=[state.gates[0],state.gates[5],state.gates[10],state.gates[20]];
 const increasing=state.direction>0?xs.every((x,i)=>i===0||x>xs[i-1]):xs.every((x,i)=>i===0||x<xs[i-1]);
 const gaps=xs.slice(1).map((x,i)=>Math.abs(x-xs[i]));
 const spread=Math.abs(state.gates[20]-state.gates[0]);
 const spacingOK=gaps.every(g=>g>.04);
 if(!increasing||!spacingOK||spread<.35){$("calibrationStatus").textContent="Corrige el orden/espaciado de los gates";$("calibrationQuality").textContent="NO VÁLIDA";return}
 state.calibrated=true;
 $("calibrationStatus").textContent="Calibración bloqueada";
 $("calibrationQuality").textContent="VÁLIDA · 0/5/10/20";
 $("armBtn").disabled=false;
};
$("trackEditor").addEventListener("pointerdown",e=>{
 const gate=e.target.closest(".gate-line");if(!gate||state.calibrated)return;
 const rect=$("trackEditor").getBoundingClientRect(),m=Number(gate.dataset.gate);
 const move=ev=>{const x=Math.max(.02,Math.min(.98,(ev.clientX-rect.left)/rect.width));state.gates[m]=x;gate.style.left=x*100+"%"};
 const up=()=>{removeEventListener("pointermove",move);removeEventListener("pointerup",up)};
 addEventListener("pointermove",move);addEventListener("pointerup",up);
});
$("armBtn").onclick=async()=>{
 if(!state.calibrated||!state.pose)return;
 state.armed=true;state.running=false;state.finished=false;state.filtered=null;state.tracks=[];state.validFrames=0;state.frameCount=0;state.gateTimes={5:null,10:null,20:null};
 $("split5").textContent=$("split10").textContent=$("split20").textContent="—";
 show($("run"));$("runState").textContent="BUSCANDO ATLETA";$("runHint").textContent="Looking for athlete";
 startRecorder();
};
function startRecorder(){
 try{
  const v=$("runVideo");const stream=v.srcObject;
  const tracks=stream?.getAudioTracks?stream.getAudioTracks():[];
  const mime=["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"].find(x=>MediaRecorder.isTypeSupported(x));
  if(!stream||!mime)return;
  state.chunks=[];state.recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:6000000});
  state.recorder.ondataavailable=e=>{if(e.data.size)state.chunks.push(e.data)};
  state.recorder.start(250);state.recording=true;$("recordStatus").textContent="● Recording";
 }catch(e){$("recordStatus").textContent="● Live only"}
}
function process(raw,now){
 const p=smooth(raw,now),prev=state.tracks.at(-1);
 state.tracks.push({t:now,x:p.x,y:p.y,c:p.conf}); state.frameCount++;
 if(p.conf<.62)return;
 state.validFrames++;
 $("trackConfidence").textContent=`Tracking: ${(p.conf*100).toFixed(0)}%`;
 if(prev){const dt=(now-prev.t)/1000; if(dt>0) $("frameRate").textContent=`FPS: ${(1/dt).toFixed(0)}`;}
 const startX=state.gates[0];
 const forward=state.direction*(p.x-startX);
 const nearStart=Math.abs(forward)<.085;
 const moving=prev && state.direction*(p.x-prev.x)>.0045;
 if(!state.running){
   if(nearStart){
     state.armed=true; $("runState").textContent="LISTO PARA SALIR"; $("runHint").textContent="Run when ready";
   }
   if(state.armed && nearStart && moving){
     state.running=true; state.startT=now;
     state.tracks=[{t:now,x:p.x,y:p.y,c:p.conf}];
     $("runState").textContent="SPRINT"; $("runHint").textContent="Tracking athlete";
   }
   return;
 }
 const elapsed=(now-state.startT)/1000; $("liveTime").textContent=elapsed.toFixed(3);
 [5,10,20].forEach(g=>{
   if(state.gateTimes[g]!=null)return;
   const gx=state.gates[g];
   const crossed=state.direction>0 ? p.x>=gx : p.x<=gx;
   const was=prev && (state.direction>0 ? prev.x<gx : prev.x>gx);
   if(crossed&&was){
     const dx=p.x-prev.x, ratio=Math.abs(gx-prev.x)/(Math.abs(dx)||1);
     const ct=prev.t+Math.max(0,Math.min(1,ratio))*(now-prev.t);
     state.gateTimes[g]=(ct-state.startT)/1000;
     $("split"+g).textContent=fmt(state.gateTimes[g]);
   }
 });
 const target=Number($("distanceSelect").value);
 if(state.gateTimes[target]!=null) finish();
}
async function finish(){
 if(state.finished)return;
 state.finished=true; state.running=false; state.armed=false;
 await stopRecorder();
 const d=Number($("distanceSelect").value), times=state.gateTimes;
 const samples=state.tracks.filter(x=>x.t>=state.startT&&x.c>=.62);
 const refs=[0,5,10,20].map(m=>({m,x:state.gates[m]})).filter(r=>r.m<=d).sort((a,b)=>a.x-b.x);
 function pxToM(px){
   if(refs.length<2)return NaN;
   for(let i=1;i<refs.length;i++){
     const a=refs[i-1],b=refs[i];
     if((px>=a.x&&px<=b.x)||(px<=a.x&&px>=b.x)){
       const q=(px-a.x)/(b.x-a.x||1); return a.m+q*(b.m-a.m);
     }
   }
   const a=refs[0],b=refs.at(-1),q=(px-a.x)/(b.x-a.x||1);
   return a.m+q*(b.m-a.m);
 }
 const vel=[];
 for(let i=1;i<samples.length;i++){
   const a=samples[i-1],b=samples[i],dt=(b.t-a.t)/1000;
   const ma=pxToM(a.x),mb=pxToM(b.x);
   if(dt>0.005&&dt<0.2&&Number.isFinite(ma)&&Number.isFinite(mb)){
     const v=Math.abs(mb-ma)/dt;
     if(v<12) vel.push({v,x:b.x,m:mb,t:b.t});
   }
 }
 // Robust peak: median over a short neighbourhood, rejecting one-frame spikes.
 let peak=null;
 for(let i=2;i<vel.length-2;i++){
   const win=vel.slice(i-2,i+3).map(z=>z.v).sort((a,b)=>a-b),med=win[2];
   if(!peak||med>peak.v) peak={v:med,m:vel[i].m,t:vel[i].t};
 }
 if(!peak && vel.length) peak=vel.reduce((a,b)=>!a||b.v>a.v?b:a,null);
 const qualityRatio=state.validFrames/Math.max(state.frameCount,1);
 const rec={date:new Date().toISOString(),athlete:$("athleteSelect").selectedOptions[0]?.text||"Atleta 1",distance:d,t5:times[5],t10:times[10],t20:times[20],vmax:peak?.v??null,vmaxAt:peak&&Number.isFinite(peak.m)?peak.m:null,frames:state.frameCount,validFrames:state.validFrames,quality:qualityRatio>.8?"Buena":qualityRatio>.6?"Aceptable":"Limitada",profile:vel.map(z=>({t:(z.t-state.startT)/1000,m:z.m,v:z.v})).filter(z=>z.m>=0&&z.m<=d)};
 const data=db(); data.results.unshift(rec); saveDB(data); showResult(rec);
}
function stopRecorder(){
 return new Promise(resolve=>{
   if(!state.recorder||!state.recording){state.recording=false; $("recordStatus").textContent="● Captura finalizada"; return resolve();}
   const r=state.recorder; state.recording=false;
   r.onstop=()=>{ $("recordStatus").textContent="● Captura finalizada"; resolve(); };
   try{r.stop()}catch{$("recordStatus").textContent="● Captura finalizada";resolve();}
 });
}
function showResult(r){
 $("resultTitle").textContent=`${r.athlete} · ${r.distance} m`;$("resultSubtitle").textContent=new Date(r.date).toLocaleString("es-PE");
 $("r5").textContent=fmt(r.t5)+" s";$("r10").textContent=fmt(r.t10)+" s";$("r20").textContent=fmt(r.t20)+" s";
 $("rVmax").textContent=Number.isFinite(r.vmax)?(r.vmax*3.6).toFixed(2)+" km/h":"—";$("rVmaxAt").textContent=Number.isFinite(r.vmaxAt)?`Pico ≈ ${r.vmaxAt.toFixed(1)} m`:"";
 $("rQuality").textContent=r.quality;$("rFrames").textContent=`${r.validFrames}/${r.frames}`;$("rDistance").textContent=r.distance+" m";drawCurve(r);
 const oldVideo=document.getElementById("resultVideoLink"); if(oldVideo) oldVideo.remove();
 if(state.chunks.length){
   const blob=new Blob(state.chunks,{type:state.recorder?.mimeType||"video/webm"});
   const a=document.createElement("a");a.id="resultVideoLink";a.className="secondary";a.textContent="Guardar vídeo del sprint";a.href=URL.createObjectURL(blob);a.download=`ARS-SPRINT-${Date.now()}.webm`;
   document.querySelector("#result .actions").appendChild(a);
 }
}
function drawCurve(r){
 const c=$("curve"),dpr=devicePixelRatio||1,w=c.clientWidth||600,h=240;c.width=w*dpr;c.height=h*dpr;
 const ctx=c.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 const pts=r.profile?.length?r.profile.map(z=>[z.m,z.v]):[[0,0],[5,Number.isFinite(r.t5)?5/r.t5:NaN],[10,Number.isFinite(r.t10)?10/r.t10:NaN],[20,Number.isFinite(r.t20)?20/r.t20:NaN]].filter(p=>Number.isFinite(p[1]));
 if(pts.length<2)return;
 const max=Math.max(...pts.map(p=>p[1]),1),dist=Math.max(r.distance,5);
 ctx.strokeStyle="#303740";ctx.lineWidth=1;for(let i=1;i<5;i++){ctx.beginPath();ctx.moveTo(0,i*h/5);ctx.lineTo(w,i*h/5);ctx.stroke()}
 ctx.strokeStyle="#f0f2f4";ctx.lineWidth=3;ctx.beginPath();pts.forEach((p,i)=>{const x=Math.max(0,Math.min(w,p[0]/dist*w)),y=h-12-(p[1]/max)*(h-25);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke();
}
$("newSprintBtn").onclick=()=>{show($("setup"));$("armBtn").disabled=!state.calibrated};
$("historyBtn").onclick=()=>{renderHistory();show($("history"))};
$("backSetup").onclick=()=>{stopRecorder();state.armed=false;state.running=false;show($("setup"))};
$("clearHistory").onclick=()=>{if(confirm("¿Borrar todos los resultados?")){const d=db();d.results=[];saveDB(d);renderHistory()}};
function renderHistory(){const rows=db().results.map(r=>`<tr><td>${new Date(r.date).toLocaleDateString("es-PE")}</td><td>${r.athlete}</td><td>${r.distance} m</td><td>${fmt(r.t5)}</td><td>${fmt(r.t10)}</td><td>${fmt(r.t20)}</td><td>${Number.isFinite(r.vmax)?(r.vmax*3.6).toFixed(2)+" km/h":"—"}</td></tr>`).join("");$("historyBody").innerHTML=rows||'<tr><td colspan="7">Sin resultados.</td></tr>'}
renderHistory();
