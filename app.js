const DB="ARS_SPRINT_V32";
const state={stream:null,pose:null,raf:0,armed:false,running:false,finished:false,calibrated:false,poseLoading:false,direction:1,gates:{0:.10,5:.30,10:.50,20:.90},tracks:[],filtered:null,startT:null,recorder:null,chunks:[],recording:false,gateTimes:{5:null,10:null,20:null},frameCount:0,validFrames:0,lastRaw:null,moveSamples:0,stableHistory:[],stableScore:0,preStartX:null,preStartY:null,lastProcessT:null};
const $=id=>document.getElementById(id); const screens=[$("setup"),$("run"),$("result"),$("history")]; const db=()=>JSON.parse(localStorage.getItem(DB)||'{"athletes":["Atleta 1"],"results":[]}'); const saveDB=x=>localStorage.setItem(DB,JSON.stringify(x)); const show=s=>{screens.forEach(x=>x.classList.remove("active"));s.classList.add("active")}; const fmt=x=>Number.isFinite(x)?x.toFixed(3):"—";
function populate(){const d=db();$("athleteSelect").innerHTML=d.athletes.length?d.athletes.map((a,i)=>`<option value="${i}">${a}</option>`).join(""):"<option>Atleta 1</option>"} populate();
function setStep(id,label,ok=false){const e=$(id);if(!e)return;e.classList.toggle("ok",ok);e.querySelector("small").textContent=label}
function syncReadiness(){const body=!!state.pose,cam=!!state.stream,cal=state.calibrated; setStep("stepCamera",cam?"Activa":"Pendiente",cam);setStep("stepLevel",state.tiltOk!==false?"OK":"Ajustar",cam&&state.tiltOk!==false);setStep("stepBody",body?"Detectado":"Cargando",body);setStep("stepCal",cal?"Lista":"Pendiente",cal);$("armBtn").disabled=!(cam&&body&&cal); if(cam&&body&&cal){$("readyTitle").textContent="Listo para armar";$("readyText").textContent="Coloca al atleta en 0 m, quieto y en posición de salida."}else{$("readyTitle").textContent="Esperando configuración";$("readyText").textContent="Activa cámara, detecta el cuerpo y confirma la calibración."}}
async function initPose(){
 if(state.pose||state.poseLoading)return !!state.pose; state.poseLoading=true; $("bodyStatus").textContent="● Motor corporal: cargando…"; $("bodyStatus").classList.remove("error");
 const urls=["https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/+esm","https://unpkg.com/@mediapipe/tasks-vision@0.10.22/+esm"]; let mod=null,last=null;
 for(const u of urls){try{mod=await import(u);break}catch(e){last=e}}
 try{if(!mod)throw last||new Error("No se pudo cargar Tasks Vision"); const {PoseLandmarker,FilesetResolver}=mod; const wasm=["https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm","https://unpkg.com/@mediapipe/tasks-vision@0.10.22/wasm"];let fs=null;for(const w of wasm){try{fs=await FilesetResolver.forVisionTasks(w);break}catch(e){last=e}}if(!fs)throw last||new Error("WASM no disponible");
  const models=["https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"]; state.pose=await PoseLandmarker.createFromOptions(fs,{baseOptions:{modelAssetPath:models[0],delegate:"GPU"},runningMode:"VIDEO",numPoses:1,minPoseDetectionConfidence:.55,minPosePresenceConfidence:.55,minTrackingConfidence:.55});
  $("bodyStatus").textContent="● Motor corporal activo · esperando atleta"; $("bodyStatus").classList.remove("error"); $("checkAthlete").textContent="○ Buscando atleta"; syncReadiness(); loop(); return true;
 }catch(e){console.warn("Pose init failed",e);$("bodyStatus").textContent="● Motor corporal no disponible · revisa Internet";$("bodyStatus").classList.add("error");$("checkAthlete").textContent="○ Motor corporal no disponible";state.pose=null;syncReadiness();return false}finally{state.poseLoading=false}
}
async function camera(){try{if(!navigator.mediaDevices?.getUserMedia)throw new Error("getUserMedia unavailable");state.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"},width:{ideal:1920},height:{ideal:1080},frameRate:{ideal:60}},audio:true});["video","calVideo","runVideo"].forEach(id=>$(id).srcObject=state.stream);await Promise.all([$("video").play(),$("calVideo").play(),$("runVideo").play()]);$("cameraMessage").textContent="Cámara activa — nivela y encuadra la pista";$("connectionBadge").textContent="CÁMARA ACTIVA";$("stepCamera").textContent="Activa";if(window.DeviceOrientationEvent)window.addEventListener("deviceorientation",orientation,{passive:true});state.tiltOk=true;syncReadiness();await initPose();}catch(e){console.warn(e);alert("No se pudo activar la cámara. Usa HTTPS/localhost y concede permisos.")}}
$("startCameraBtn").onclick=camera;
function orientation(e){const b=Number(e.beta),g=Number(e.gamma);if(!Number.isFinite(b)||!Number.isFinite(g))return;const landscape=Math.abs(g)>35||Math.abs(b)<55;const tilt=Math.min(Math.abs(g),Math.abs(b-90),Math.abs(b+90));state.tiltOk=tilt<7;$("tiltIndicator").textContent=`Nivel: ${Math.abs(tilt).toFixed(1)}°`;$("checkTilt").classList.toggle("ok",state.tiltOk);$("checkTilt").textContent=(state.tiltOk?"● ":"○ ")+"Cámara nivelada";$("checkOrientation").classList.toggle("ok",landscape);$("checkOrientation").textContent=(landscape?"● ":"○ ")+"Horizontal";syncReadiness()}
function applyDirection(dir){state.direction=dir;$("directionSelect").value=dir>0?"forward":"reverse";const xs=[state.gates[0],state.gates[5],state.gates[10],state.gates[20]].sort((a,b)=>a-b);if(dir<0){state.gates={0:xs[3],5:xs[2],10:xs[1],20:xs[0]}}else{state.gates={0:xs[0],5:xs[1],10:xs[2],20:xs[3]}};drawCalibration();drawRunOverlay()}
$("flipBtn").onclick=()=>{if(!state.calibrated)applyDirection(state.direction*-1)};$("directionSelect").onchange=e=>{if(!state.calibrated)applyDirection(e.target.value==="forward"?1:-1);else e.target.value=state.direction>0?"forward":"reverse"};
function fit(c,v){const r=v.getBoundingClientRect(),d=devicePixelRatio||1;c.width=Math.max(1,r.width*d);c.height=Math.max(1,r.height*d);return[r.width,r.height,d]}
function point(res){const p=res?.landmarks?.[0];if(!p)return null;const ids=[23,24,11,12,25,26],q=ids.map(i=>p[i]).filter(x=>x&&Number(x.visibility??1)>.45);if(q.length<2)return null;return{x:q.reduce((s,a)=>s+a.x,0)/q.length,y:q.reduce((s,a)=>s+a.y,0)/q.length,conf:q.reduce((s,a)=>s+(a.visibility??1),0)/q.length,landmarks:p}}
function drawSkeleton(ctx,p,w,h){if(!p?.landmarks)return;const lm=p.landmarks;const pairs=[[11,12],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28],[11,13],[13,15],[12,14],[14,16]];ctx.strokeStyle="#5ee78b";ctx.lineWidth=2;for(const [a,b] of pairs){if(!lm[a]||!lm[b])continue;ctx.beginPath();ctx.moveTo(lm[a].x*w,lm[a].y*h);ctx.lineTo(lm[b].x*w,lm[b].y*h);ctx.stroke()}for(const i of [11,12,23,24,25,26,27,28]){if(!lm[i])continue;ctx.fillStyle="#b8ffcc";ctx.beginPath();ctx.arc(lm[i].x*w,lm[i].y*h,4,0,Math.PI*2);ctx.fill()}}
function drawCalibration(){const c=$("calOverlay"),v=$("calVideo");const [w,h,d]=fit(c,v);const ctx=c.getContext("2d");ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,w,h);Object.entries(state.gates).forEach(([m,x])=>{ctx.strokeStyle=m==0?"#ffffff":"#62ed90";ctx.lineWidth=m==0?3:2;ctx.setLineDash(m==0?[]:[8,6]);ctx.beginPath();ctx.moveTo(x*w,0);ctx.lineTo(x*w,h);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle="#07100cdd";ctx.fillRect(x*w-23,10,46,23);ctx.fillStyle="#fff";ctx.font="900 11px sans-serif";ctx.textAlign="center";ctx.fillText(m+" m",x*w,26);ctx.beginPath();ctx.arc(x*w,h-28,8,0,Math.PI*2);ctx.fillStyle="#0b0e12";ctx.fill();ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.stroke()});if(state.lastRaw)drawSkeleton(ctx,state.lastRaw,w,h)}
function drawRunOverlay(){const c=$("runOverlay"),v=$("runVideo");const [w,h,d]=fit(c,v);const ctx=c.getContext("2d");ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,w,h);Object.entries(state.gates).forEach(([m,x])=>{ctx.strokeStyle=state.gateTimes[m]?"#5ee78b":"#cbd1d7";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x*w,0);ctx.lineTo(x*w,h);ctx.stroke();ctx.fillStyle="#07100cdd";ctx.fillRect(x*w-23,10,46,23);ctx.fillStyle="#fff";ctx.font="900 11px sans-serif";ctx.textAlign="center";ctx.fillText(m+" m",x*w,26)});if(state.lastRaw)drawSkeleton(ctx,state.lastRaw,w,h)}
function smooth(p,now){const a=.28;if(!state.filtered)return state.filtered={...p,t:now};state.filtered.x=a*p.x+(1-a)*state.filtered.x;state.filtered.y=a*p.y+(1-a)*state.filtered.y;state.filtered.conf=a*p.conf+(1-a)*state.filtered.conf;state.filtered.t=now;return state.filtered}
async function loop(){
 if(!state.pose||!$("video").videoWidth){state.raf=requestAnimationFrame(loop);return}
 const now=performance.now();
 try{
  const res=state.pose.detectForVideo($("video"),now),p=point(res);
  state.lastRaw=p;
  drawCalibration();
  updateCameraStability();
  if(p){
   $("checkAthlete").textContent=state.armed||state.running?"● Atleta fijado":"● Atleta detectado";
   $("checkAthlete").classList.add("ok");
   if(state.armed)process(p,now);
  }else{
   $("checkAthlete").textContent="○ Atleta no detectado";
   $("checkAthlete").classList.remove("ok");
  }
  syncReadiness();
 }catch(e){console.warn("Pose frame error",e)}
 state.raf=requestAnimationFrame(loop)
}
let stabilityCanvas=null,stabilityCtx=null,lastStabilitySample=null;
function updateCameraStability(){
 if(state.running)return;
 const v=$("video"); if(!v.videoWidth||!v.videoHeight)return;
 if(!stabilityCanvas){stabilityCanvas=document.createElement("canvas");stabilityCanvas.width=32;stabilityCanvas.height=18;stabilityCtx=stabilityCanvas.getContext("2d",{willReadFrequently:true})}
 try{
  // Sample the upper/background band to avoid the athlete as much as possible.
  stabilityCtx.drawImage(v,0,0,32,18);
  const data=stabilityCtx.getImageData(0,0,32,10).data;
  let diff=0,n=0;
  if(lastStabilitySample){for(let i=0;i<data.length;i+=4){diff+=Math.abs(data[i]-lastStabilitySample[i])+Math.abs(data[i+1]-lastStabilitySample[i+1])+Math.abs(data[i+2]-lastStabilitySample[i+2]);n+=3}}
  lastStabilitySample=data;
  const score=n?Math.max(0,1-diff/(n*18)):1;
  state.stableHistory.push(score); if(state.stableHistory.length>12)state.stableHistory.shift();
  state.stableScore=state.stableHistory.reduce((a,b)=>a+b,0)/state.stableHistory.length;
  const ok=state.stableScore>.86;
  $("checkStable").textContent=(ok?"● ":"○ ")+"Cámara estable"; $("checkStable").classList.toggle("ok",ok);
  $("stableIndicator").textContent=`Estabilidad: ${ok?"OK":"Ajustar"}`;
 }catch(e){}
}

function gatePointer(ev){if(state.calibrated)return;const gate=ev.target.closest(".gate-handle");if(!gate)return;const m=Number(gate.dataset.gate),rect=$("calVideo").getBoundingClientRect();const move=e=>{state.gates[m]=Math.max(.02,Math.min(.98,(e.clientX-rect.left)/rect.width));drawCalibration()};const up=()=>{removeEventListener("pointermove",move);removeEventListener("pointerup",up)};addEventListener("pointermove",move);addEventListener("pointerup",up)}
$("calOverlay").addEventListener("pointerdown",e=>{if(state.calibrated)return;const r=$("calVideo").getBoundingClientRect(),x=(e.clientX-r.left)/r.width;let best=0,bd=99;for(const [m,g] of Object.entries(state.gates)){const d=Math.abs(x-g);if(d<bd){bd=d;best=Number(m)}}if(bd<.045){const move=ev=>{state.gates[best]=Math.max(.02,Math.min(.98,(ev.clientX-r.left)/r.width));drawCalibration()};const up=()=>{removeEventListener("pointermove",move);removeEventListener("pointerup",up)};addEventListener("pointermove",move);addEventListener("pointerup",up)}});
$("resetGatesBtn").onclick=()=>{if(state.calibrated)return;state.gates={0:.10,5:.30,10:.50,20:.90};drawCalibration();$("calibrationStatus").textContent="Pendiente · coloca 0 / 5 / 10 / 20 m";$("calibrationQuality").textContent="REQUIERE VALIDACIÓN"};
$("calibrateBtn").onclick=()=>{if(!state.stream){$("calibrationStatus").textContent="Activa primero la cámara";return}const xs=[state.gates[0],state.gates[5],state.gates[10],state.gates[20]];const increasing=state.direction>0?xs.every((x,i)=>i===0||x>xs[i-1]):xs.every((x,i)=>i===0||x<xs[i-1]);const gaps=xs.slice(1).map((x,i)=>Math.abs(x-xs[i]));const d05=Math.abs(xs[1]-xs[0]),d510=Math.abs(xs[2]-xs[1]),d1020=Math.abs(xs[3]-xs[2]);const spacingOk=d05>.035&&d510>.035&&d1020>.035; if(!increasing||!spacingOk||Math.abs(xs[3]-xs[0])<.35){$("calibrationQuality").textContent="NO VÁLIDA";$("calibrationStatus").textContent="Corrige orden y separación de gates";return}state.calibrated=true;$("calibrationQuality").textContent="VÁLIDA · 0/5/10/20";$("calibrationStatus").textContent="Calibración bloqueada · gates fijados";$("calibrateBtn").disabled=true;$("flipBtn").disabled=true;syncReadiness();drawCalibration()};
$("armBtn").onclick=()=>{if(!state.calibrated||!state.pose)return;state.armed=true;state.running=false;state.finished=false;state.filtered=null;state.tracks=[];state.validFrames=0;state.frameCount=0;state.gateTimes={5:null,10:null,20:null};state.preStartX=null;state.preStartY=null;state.moveSamples=0;state.stableHistory=[];state.stableScore=0;$("split5").textContent=$("split10").textContent=$("split20").textContent="—";$("liveTime").textContent="0.000";$("runState").textContent="BUSCANDO ATLETA";$("runHint").textContent="Coloca al atleta en 0 m…";show($("run"));startRecorder();syncReadiness()};
function startRecorder(){try{const stream=state.stream,mime=["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"].find(x=>window.MediaRecorder?.isTypeSupported(x));if(!stream||!mime){$("recordStatus").textContent="● Live · sin grabación";return}state.chunks=[];state.recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:6000000});state.recorder.ondataavailable=e=>{if(e.data.size)state.chunks.push(e.data)};state.recorder.start(250);state.recording=true;$("recordStatus").textContent="● Grabando"}catch(e){$("recordStatus").textContent="● Live · sin grabación"}}
function process(raw,now){
 const p=smooth(raw,now),prev=state.tracks.at(-1);
 state.frameCount++;
 if(p.conf<.58)return;
 state.validFrames++;
 $("trackConfidence").textContent=`Tracking: ${(p.conf*100).toFixed(0)}%`;
 const dt=prev?(now-prev.t)/1000:0;
 if(dt>0&&dt<.2)$("frameRate").textContent=`FPS: ${(1/dt).toFixed(0)}`;
 const dx=prev?state.direction*(p.x-prev.x):0;
 const near=Math.abs(state.direction*(p.x-state.gates[0]))<.085;
 if(!state.running){
   // Require a stable athlete near 0 m, then several consecutive forward frames.
   if(near){
     if(!state.preStartX){state.preStartX=p.x;state.preStartY=p.y;state.moveSamples=0}
     const forward=dx>.0025;
     state.moveSamples=forward?state.moveSamples+1:Math.max(0,state.moveSamples-1);
     $("runState").textContent=state.moveSamples>=2?"LISTO PARA SALIR":"LISTO PARA SALIR";
     $("runHint").textContent="Corre cuando estés preparado";
     if(state.moveSamples>=3){
       state.running=true; state.startT=now; state.tracks=[{t:now,x:p.x,y:p.y,c:p.conf}]; state.lastProcessT=now;
       $("runState").textContent="SPRINT"; $("runHint").textContent="Atleta en movimiento";
     }
   }else{
     state.preStartX=null;state.preStartY=null;state.moveSamples=0;
     $("runState").textContent="BUSCANDO ATLETA";
     $("runHint").textContent="Coloca al atleta en 0 m…";
   }
   if(!state.running)return;
 }
 state.tracks.push({t:now,x:p.x,y:p.y,c:p.conf});
 const elapsed=(now-state.startT)/1000; $("liveTime").textContent=Math.max(0,elapsed).toFixed(3);
 [5,10,20].forEach(g=>{
   if(state.gateTimes[g]!=null)return;
   const gx=state.gates[g];
   const cross=state.direction>0?p.x>=gx:p.x<=gx;
   const was=prev&&(state.direction>0?prev.x<gx:prev.x>gx);
   if(cross&&was){
     const span=Math.abs(p.x-prev.x);
     const ratio=span?Math.abs(gx-prev.x)/span:1;
     const ct=prev.t+Math.max(0,Math.min(1,ratio))*(now-prev.t);
     state.gateTimes[g]=(ct-state.startT)/1000;
     $("split"+g).textContent=fmt(state.gateTimes[g]);
   }
 });
 const target=Number($("distanceSelect").value);
 if(state.gateTimes[target]!=null)finish();
}

async function finish(){
 if(state.finished)return; state.finished=true; state.running=false; state.armed=false;
 await stopRecorder();
 const d=Number($("distanceSelect").value),times=state.gateTimes;
 const samples=state.tracks.filter(x=>x.t>=state.startT&&x.c>=.58);
 const refs=[0,5,10,20].map(m=>({m,x:state.gates[m]})).filter(r=>r.m<=d);
 function pxToM(px){for(let i=1;i<refs.length;i++){const a=refs[i-1],b=refs[i];if((px>=a.x&&px<=b.x)||(px<=a.x&&px>=b.x))return a.m+(px-a.x)/(b.x-a.x||1)*(b.m-a.m)}return NaN}
 const rawVel=[];
 for(let i=1;i<samples.length;i++){
   const a=samples[i-1],b=samples[i],dt=(b.t-a.t)/1000; if(dt<=.005||dt>.12)continue;
   const ma=pxToM(a.x),mb=pxToM(b.x); if(!Number.isFinite(ma)||!Number.isFinite(mb))continue;
   const v=Math.abs(mb-ma)/dt; if(v>0&&v<12)rawVel.push({v,m:mb,t:b.t});
 }
 // Median window suppresses pose jitter while preserving the true acceleration peak.
 const vel=[];
 for(let i=0;i<rawVel.length;i++){const lo=Math.max(0,i-2),hi=Math.min(rawVel.length,i+3);const w=rawVel.slice(lo,hi).map(z=>z.v).sort((a,b)=>a-b);vel.push({v:w[Math.floor(w.length/2)],m:rawVel[i].m,t:rawVel[i].t})}
 let peak=vel.reduce((best,z)=>!best||z.v>best.v?z:best,null);
 const ratio=state.validFrames/Math.max(state.frameCount,1);
 const quality=ratio>.88&&state.stableScore>.82?"Buena":ratio>.65?"Aceptable":"Limitada";
 const rec={date:new Date().toISOString(),athlete:$("athleteSelect").selectedOptions[0]?.text||"Atleta 1",distance:d,t5:times[5],t10:times[10],t20:times[20],vmax:peak?.v??null,vmaxAt:peak?.m??null,frames:state.frameCount,validFrames:state.validFrames,quality,profile:vel.map(z=>({t:(z.t-state.startT)/1000,m:z.m,v:z.v})).filter(z=>z.m>=0&&z.m<=d)};
 const data=db();data.results.unshift(rec);saveDB(data);showResult(rec);
}

function stopRecorder(){return new Promise(resolve=>{if(!state.recorder||!state.recording){state.recording=false;return resolve()}const r=state.recorder;state.recording=false;r.onstop=()=>resolve();try{r.stop()}catch{resolve()}})}
function showResult(r){$("resultTitle").textContent=`${r.athlete} · ${r.distance} m`;$("resultSubtitle").textContent=new Date(r.date).toLocaleString("es-PE");$("r5").textContent=fmt(r.t5)+" s";$("r10").textContent=fmt(r.t10)+" s";$("r20").textContent=fmt(r.t20)+" s";$("rVmax").textContent=Number.isFinite(r.vmax)?(r.vmax*3.6).toFixed(2)+" km/h":"—";$("rVmaxAt").textContent=Number.isFinite(r.vmaxAt)?`Pico ≈ ${r.vmaxAt.toFixed(1)} m`:"";$("rQuality").textContent=r.quality;$("rFrames").textContent=`${r.validFrames}/${r.frames}`;$("rDistance").textContent=r.distance+" m";drawCurve(r);const old=$("resultVideoLink");if(old)old.remove();if(state.chunks.length){const blob=new Blob(state.chunks,{type:state.recorder?.mimeType||"video/webm"}),a=document.createElement("a");a.id="resultVideoLink";a.className="secondary";a.textContent="Guardar vídeo del sprint";a.href=URL.createObjectURL(blob);a.download=`ARS-SPRINT-${Date.now()}.webm`;$("result").querySelector(".actions").appendChild(a)}}
function drawCurve(r){const c=$("curve"),dpr=devicePixelRatio||1,w=c.clientWidth||600,h=240;c.width=w*dpr;c.height=h*dpr;const ctx=c.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);const pts=r.profile?.length?r.profile.map(z=>[z.m,z.v]):[[0,0],[5,r.t5?5/r.t5:NaN],[10,r.t10?10/r.t10:NaN],[20,r.t20?20/r.t20:NaN]].filter(p=>Number.isFinite(p[1]));if(pts.length<2)return;const max=Math.max(...pts.map(p=>p[1]),1),dist=Math.max(r.distance,5);ctx.strokeStyle="#303740";ctx.lineWidth=1;for(let i=1;i<5;i++){ctx.beginPath();ctx.moveTo(0,i*h/5);ctx.lineTo(w,i*h/5);ctx.stroke()}ctx.strokeStyle="#62ed90";ctx.lineWidth=3;ctx.beginPath();pts.forEach((p,i)=>{const x=Math.max(0,Math.min(w,p[0]/dist*w)),y=h-12-(p[1]/max)*(h-25);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke()}
$("newSprintBtn").onclick=()=>{show($("setup"));$("armBtn").disabled=!(state.calibrated&&state.pose&&state.stream)};$("historyBtn").onclick=()=>{renderHistory();show($("history"))};$("backSetup").onclick=()=>{stopRecorder();state.armed=false;state.running=false;show($("setup"))};$("clearHistory").onclick=()=>{if(confirm("¿Borrar todos los resultados?")){const d=db();d.results=[];saveDB(d);renderHistory()}};function renderHistory(){const rows=db().results.map(r=>`<tr><td>${new Date(r.date).toLocaleDateString("es-PE")}</td><td>${r.athlete}</td><td>${r.distance} m</td><td>${fmt(r.t5)}</td><td>${fmt(r.t10)}</td><td>${fmt(r.t20)}</td><td>${Number.isFinite(r.vmax)?(r.vmax*3.6).toFixed(2)+" km/h":"—"}</td></tr>`).join("");$("historyBody").innerHTML=rows||'<tr><td colspan="7">Sin resultados.</td></tr>'}renderHistory();syncReadiness();
window.addEventListener("resize",()=>{drawCalibration();drawRunOverlay()});
