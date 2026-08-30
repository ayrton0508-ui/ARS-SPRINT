// ARS SPRINT V26.3 · camera stability patch · 2026-08-30
const DB_KEY='ARS_SPRINT_10_0_DB';
const LEGACY_KEYS=['ARS_SPRINT_8_1_DB','ARS_SPRINT_8_0_DB','ARS_SPRINT_7_4_DB','ARS_SPRINT_7_3_DB'];
const state={db:{version:'10.0',athletes:[],history:[]},videoUrl:null,videoFile:null,fps:null,start:null,finish:null,lastFrameMeta:null,rvfcId:null,series:{active:false,total:0,current:0,attempts:[]},gates:{},track:{startX:.12,finishX:.88,torso:null,direction:null,drag:null,auto:false,lastDetect:0},calibration:{target:5,estimated:null,quality:'No calibrado',saved:false,referenceWidthM:0.21},photoFinish:{url:null},vision:{selectedGate:5,positions:{},proposals:{},frameImage:null,accepted:false,validatedGates:{},manualGates:{}}};
const $=id=>document.getElementById(id);
const setDisabled=(id,value)=>{const el=$(id);if(el)el.disabled=!!value};
const setText=(id,value)=>{const el=$(id);if(el)el.textContent=String(value)};const uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random();
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
function load(){try{
let raw=localStorage.getItem(DB_KEY);
if(!raw){for(const k of LEGACY_KEYS){const legacy=localStorage.getItem(k);if(legacy){raw=legacy;break}}}
const x=JSON.parse(raw||'null');
if(x){state.db={version:'10.0',athletes:Array.isArray(x.athletes)?x.athletes:[],history:Array.isArray(x.history)?x.history:[],gates:x.gates&&typeof x.gates==='object'?x.gates:{}};save()}
}catch(e){console.warn(e)}}
function save(){try{localStorage.setItem(DB_KEY,JSON.stringify(state.db));return true}catch(e){alert('No se pudo guardar en este navegador. Usa Respaldo.');return false}}
function distance(){return Number($('distanceSelect').value)}
function athlete(id){return state.db.athletes.find(a=>a.id===id)}function athleteName(id){return athlete(id)?.name||'Sin deportista'}
function activeFps(){return state.fps&&state.fps>0?Number(state.fps):null}
function resolutionMs(){const f=activeFps();return f?1000/f:null}
function qualityInfo(){if(!state.start||!state.finish)return {label:'Pendiente',score:0};const t=state.finish.time-state.start.time;if(t<=0)return {label:'Inválida',score:0};if(!activeFps())return {label:'Temporal no verificada',score:45};const r=resolutionMs();const score=r<=4.17?80:r<=10?72:r<=20?64:55;return {label:'Temporal nominal conocida',score}}
function renderSelects(){const cur=$('athleteSelect').value,curP=$('profileSelect').value;const opts=state.db.athletes.map(a=>`<option value="${a.id}">${esc(a.name)}${a.category?' · '+esc(a.category):''}</option>`).join('')||'<option value="">Primero crea un deportista</option>';$('athleteSelect').innerHTML=opts;$('profileSelect').innerHTML=opts;if(cur&&athlete(cur))$('athleteSelect').value=cur;if(curP&&athlete(curP))$('profileSelect').value=curP}
function renderAthletes(){$('athleteList').innerHTML=state.db.athletes.length?state.db.athletes.map(a=>{const hs=state.db.history.filter(h=>h.athleteId===a.id);return `<div class="athlete-card"><h3>${esc(a.name)}</h3><p>${esc(a.sport||'')} ${a.category?'· '+esc(a.category):''}</p><p>${esc(a.sex||'')} ${a.dob?'· '+esc(a.dob):''}</p><p><b>${hs.length}</b> registros</p><button class="secondary" data-use="${a.id}">Usar en evaluación</button></div>`}).join(''):'<div class="status">No hay deportistas. Crea el primero.</div>';document.querySelectorAll('[data-use]').forEach(b=>b.onclick=()=>{$('athleteSelect').value=b.dataset.use;openTab('evaluation')})}
function renderHistory(){const q=($('historySearch').value||'').toLowerCase(),d=$('historyDistance').value,qc=$('historyQuality').value;const rows=state.db.history.filter(h=>(!q||athleteName(h.athleteId).toLowerCase().includes(q))&&(!d||String(h.distance)===d)&&(!qc||h.quality===qc)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));$('historyBody').innerHTML=rows.map(h=>`<tr><td>${new Date(h.createdAt).toLocaleString('es-PE')}</td><td>${esc(athleteName(h.athleteId))}</td><td>${h.distance} m</td><td>${h.attempt}</td><td><b>${h.time.toFixed(3)} s</b></td><td>${h.ms.toFixed(2)}</td><td>${esc(h.quality)}</td></tr>`).join('')||'<tr><td colspan="7">Sin registros.</td></tr>'}
function renderAttempts(){const rows=state.series.attempts.map(a=>`<tr><td>${a.attempt}</td><td><b>${a.time.toFixed(3)} s</b></td><td>${a.ms.toFixed(2)}</td><td>${a.kmh.toFixed(2)}</td><td>${esc(a.quality)}</td><td>Guardado</td></tr>`).join('');$('attemptBody').innerHTML=rows||'<tr><td colspan="6">Aún no hay intentos.</td></tr>';const p=state.series.total?Math.round(state.series.attempts.length/state.series.total*100):0;$('seriesProgressBar').style.width=p+'%'}
function bestFor(id,d){return state.db.history.filter(h=>h.athleteId===id&&Number(h.distance)===Number(d)).sort((a,b)=>a.time-b.time)[0]}
function renderProfile(){const a=athlete($('profileSelect').value);if(!a){$('profileContent').innerHTML='<div class="status">Crea un deportista para generar su ficha.</div>';return}const hs=state.db.history.filter(h=>h.athleteId===a.id).sort((x,y)=>x.createdAt.localeCompare(y.createdAt));const stat=[5,10,20].map(d=>{const r=bestFor(a.id,d);return `<div class="stat-box"><span>${d} m · PB</span><b>${r?r.time.toFixed(3)+' s':'—'}</b><small>${r?r.ms.toFixed(2)+' m/s · '+r.kmh.toFixed(2)+' km/h':''}</small></div>`}).join('');const vals=hs.map(h=>h.time).filter(Number.isFinite),avg=vals.length?vals.reduce((x,y)=>x+y,0)/vals.length:null,sd=vals.length?Math.sqrt(vals.reduce((s,x)=>s+(x-(avg||0))**2,0)/vals.length):null,cv=avg?sd/avg*100:null,best=vals.length?Math.min(...vals):null,bestRec=hs.find(h=>h.time===best),last=hs.at(-1);$('profileContent').innerHTML=`<div class="profile-header"><div><h1>${esc(a.name)}</h1><p>${esc(a.sport||'')} · ${esc(a.category||'')} · ${esc(a.sex||'')} · ${esc(a.dob||'')}</p></div><div><b>ARS SPRINT 10.0</b><br><small>Informe generado ${new Date().toLocaleDateString('es-PE')}</small></div></div><div class="stat-grid">${stat}</div><div class="grid four"><div class="info-box"><span>Evaluaciones</span><b>${hs.length}</b></div><div class="info-box"><span>Mejor tiempo global</span><b>${best!=null?best.toFixed(3)+' s':'—'}</b></div><div class="info-box"><span>Media de tiempos</span><b>${avg!=null?avg.toFixed(3)+' s':'—'}</b></div><div class="info-box"><span>CV de la serie</span><b>${cv!=null?cv.toFixed(2)+'%':'—'}</b></div></div><h3>Historial de evaluaciones</h3><div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Prueba</th><th>Intento</th><th>Tiempo</th><th>m/s</th><th>km/h</th><th>Calidad</th><th>Fuente</th></tr></thead><tbody>${hs.map(h=>`<tr><td>${new Date(h.createdAt).toLocaleDateString('es-PE')}</td><td>${h.distance} m</td><td>${h.attempt}</td><td>${h.time.toFixed(3)} s</td><td>${h.ms.toFixed(2)}</td><td>${h.kmh.toFixed(2)}</td><td>${esc(h.quality)}</td><td>${esc(h.captureSource||'vídeo')}</td></tr>`).join('')||'<tr><td colspan="8">Sin evaluaciones.</td></tr>'}</tbody></table></div><h3>Datos técnicos de captura</h3><div class="table-wrap"><table><thead><tr><th>Fecha</th><th>FPS cámara</th><th>FPS observado</th><th>Resolución</th><th>Detección corporal</th><th>Validación</th></tr></thead><tbody>${hs.map(h=>`<tr><td>${new Date(h.createdAt).toLocaleDateString('es-PE')}</td><td>${h.cameraFps||h.fps||'—'}</td><td>${h.observedFps?h.observedFps.toFixed(1):'—'}</td><td>${esc(h.cameraResolution||'—')}</td><td>${esc(h.bodyDetection||'—')}</td><td>${esc(h.validationStatus||'manual')}</td></tr>`).join('')||'<tr><td colspan="6">Sin datos técnicos.</td></tr>'}</tbody></table></div><div class="status"><b>Última evaluación:</b> ${last?new Date(last.createdAt).toLocaleString('es-PE'):'—'} · <b>Mejor registro:</b> ${bestRec?bestRec.distance+' m · '+bestRec.time.toFixed(3)+' s':'—'}</div><h3>Observaciones</h3><p>${esc(a.notes||'Sin observaciones.')}</p>`} 
function updateClock(){const v=$('video'),t=v.currentTime||0,f=activeFps();$('currentTime').textContent=t.toFixed(3)+' s';$('frameClock').textContent=`${t.toFixed(3)} s · frame ${f?Math.round(t*f):'—'}`;$('frameNumber').textContent=f?Math.round(t*f):'—'}
function updateMarks(){const f=activeFps();const set=(id,frameId,x)=>{$(id).textContent=x?x.time.toFixed(3)+' s':'—';$(frameId).textContent=x&&f?`Frame ${x.frame}`:'Frame —'};set('startReadout','startFrameReadout',state.start);set('finishReadout','finishFrameReadout',state.finish);const q=qualityInfo();$('markQuality').textContent=!state.start&&!state.finish?'Carga un vídeo y marca inicio/final.':`Indicador de captura: ${q.label}${f?' · '+resolutionMs().toFixed(2)+' ms/frame nominales':''}`}
function seriesStats(){const ts=state.series.attempts.map(a=>a.time);if(!ts.length)return null;const mean=ts.reduce((a,b)=>a+b,0)/ts.length,sd=Math.sqrt(ts.reduce((s,x)=>s+(x-mean)**2,0)/ts.length),cv=mean?sd/mean*100:0;return {mean,sd,cv,best:Math.min(...ts)}}
function gateTime(g){return state.gates[String(g)]?.time??null}
function updateGates(){[5,10,20].forEach(g=>{const x=gateTime(g);$('gate'+g+'Readout').textContent=x==null?'—':x.toFixed(3)+' s'});const entries=[5,10,20].map(g=>({d:g,t:gateTime(g)})).filter(x=>x.t!=null).sort((a,b)=>a.d-b.d);let html='';let prev=null;let peak=null;entries.forEach(x=>{const dt=prev?x.t-prev.t:x.t;const dd=prev?x.d-prev.d:x.d;const v=dt>0?dd/dt:0;html+=`<tr><td>0–${x.d} m</td><td>${x.t.toFixed(3)} s</td><td>${dt.toFixed(3)} s</td><td>${(v*3.6).toFixed(2)} km/h</td></tr>`;if(v>0&&(!peak||v>peak.v))peak={v,d:x.d,from:prev?prev.d:0};prev=x});$('splitBody').innerHTML=html||'<tr><td colspan="4">Registra dos o más puertas.</td></tr>';if(peak){$('peakVelocity').textContent=(peak.v*3.6).toFixed(2);$('peakAt').textContent=peak.from+'–'+peak.d+' m'}else{$('peakVelocity').textContent='—';$('peakAt').textContent='—'}const a=athlete($('athleteSelect').value),d=distance(),hist=a?state.db.history.filter(h=>h.athleteId===a.id&&Number(h.distance)===Number(d)).sort((x,y)=>x.time-y.time):[];const pb=hist[0];$('pbValue').textContent=pb?pb.time.toFixed(3)+' s':'—';const rt=state.start&&state.finish?state.finish.time-state.start.time:null;$('pbDelta').textContent=(pb&&rt)?((rt-pb.time)/pb.time*100).toFixed(2)+'%':'—'}
function bindGates(){document.querySelectorAll('.gateBtn').forEach(b=>b.onclick=()=>{const d=Number(b.dataset.gate),v=$('video');if(!v.duration)return alert('Carga un vídeo primero.');if(![5,10,20].includes(d)||d>distance())return alert('Esta puerta está fuera de la distancia seleccionada. Solo se admiten 5, 10 y 20 m.');state.gates[String(d)]={time:activeFps()?Math.round(v.currentTime*activeFps())/activeFps():v.currentTime,frame:activeFps()?Math.round(v.currentTime*activeFps()):null};updateGates()});$('clearGates').onclick=()=>{state.gates={};updateGates()}}
function bindSetup(){['setupLateral','setupLevel','setupFullTrack','setupStable','setupFpsKnown'].forEach(id=>$(id).onchange=updateSetup);updateSetup()}
function updateSetup(){const ids=['setupLateral','setupLevel','setupFullTrack','setupStable','setupFpsKnown'];const n=ids.filter(id=>$(id).checked).length;$('setupScore').textContent=n===5?'✓ Preparación completa':`${n}/5 controles completados`;}
function updateAI(t,ms){const id=$('athleteSelect').value,d=distance(),hist=state.db.history.filter(h=>h.athleteId===id&&Number(h.distance)===Number(d)).sort((a,b)=>a.time-b.time),best=hist[0],delta=best?t-best.time:null,s=seriesStats();$('aiBest').textContent=best?best.time.toFixed(3)+' s':'—';$('aiDelta').textContent=delta==null?'—':(delta<=0?'Mejora ':'+')+delta.toFixed(3)+' s';$('aiCV').textContent=s?s.cv.toFixed(2)+'%':'—';let level='En desarrollo';if(best&&delta<0)level='Mejora respecto a su mejor';else if(best&&delta>0)level='Por debajo de su mejor';if(s&&s.cv<1)level+=' · alta consistencia';else if(s&&s.cv<2)level+=' · buena consistencia';else if(s)level+=' · revisar variabilidad';$('aiLevel').textContent=level;$('aiAnalysis').innerHTML=`<b>${d} m · ${t.toFixed(3)} s · ${ms.toFixed(2)} m/s</b><p>${best?(delta<0?'La marca actual mejora el mejor registro previo.':delta>0?'La marca actual está por encima de la mejor marca previa.':'La marca actual iguala la mejor marca previa.'):'Todavía no existe una referencia histórica para esta distancia.'}</p><p><b>Control:</b> ${qualityInfo().label}. ${activeFps()?`Resolución nominal ${resolutionMs().toFixed(2)} ms/frame.`:'FPS no verificado; no se asigna precisión de frame.'}</p>`}
function sprintSplitDistances(d){if(d===5)return [5];if(d===10)return [5,10];if(d===20)return [5,10,20];return [5,10,20]}
function renderSplits(){const box=$('splitSummary'),peak=$('peakVelocityBox');if(!box||!peak)return;const d=distance();if(!state.start||!state.finish){box.innerHTML='<div class="status">Realiza una medición para generar los splits disponibles.</div>';peak.textContent='Velocidad máxima estimada: —';return}const total=state.finish.time-state.start.time;if(total<=0){box.innerHTML='<div class="status">Medición inválida.</div>';return}const ds=sprintSplitDistances(d).filter(x=>x<=d), parts=[];let prevT=state.start.time;for(const x of ds){let t=total*(x/d);parts.push({d:x,t,segment:x-(parts.length?parts[parts.length-1].d:0)});}let rows=parts.map((p,i)=>{const prev=i?parts[i-1].t:0;const segT=p.t-prev;const v=p.segment/segT;return `<div class="split-box"><span>0–${p.d} m</span><b>${p.t.toFixed(3)} s</b><small>${v.toFixed(2)} m/s · ${(v*3.6).toFixed(2)} km/h</small></div>`}).join('');box.innerHTML=`<div class="split-grid">${rows}</div><p class="split-footnote">Los splits mostrados aquí son una estimación proporcional del intervalo marcado; para medir cruces intermedios reales deben marcarse/validarse los frames de cada puerta.</p>`;const last=parts[parts.length-1];const vmax=last?last.segment/(last.t-(parts.length>1?parts[parts.length-2].t:0)):0;peak.innerHTML=`⚡ <b>Velocidad máxima estimada por split: ${vmax.toFixed(2)} m/s (${(vmax*3.6).toFixed(2)} km/h)</b><br><small>No equivale a una velocidad instantánea frame-a-frame.</small>`}
function updateSaveState(){const d=distance();const ready=!!state.start&&!!state.finish;const validated=validationReadyForDistance(d);$('saveCurrent').textContent=validated?'💾 Guardar resultado validado':'💾 Guardar resultado manual';$('saveCurrent').disabled=!ready}
function updateResult(){if(!state.start||!state.finish){renderSplits();$('resultTime').textContent=$('resultMs').textContent=$('resultKmh').textContent='—';$('quality').textContent='Pendiente';$('qualityDetail').textContent='—';$('qualityBar').style.width='0%';$('precisionReadout').textContent='Resolución temporal: —';$('uncertaintyReadout').textContent='Incertidumbre nominal: —';$('saveCurrent').disabled=true;updateSaveState();return}const t=state.finish.time-state.start.time,d=distance();if(!Number.isFinite(t)||t<=0||!Number.isFinite(d)||d<=0){$('validationNote').textContent='Medición inválida: revisa distancia, inicio y final.';return}const ms=d/t,q=qualityInfo(),res=resolutionMs();$('resultTime').textContent=t.toFixed(3);$('resultMs').textContent=ms.toFixed(2);$('resultKmh').textContent=(ms*3.6).toFixed(2);$('quality').textContent=q.label;$('qualityDetail').textContent=q.score+' / 100 (indicador, no validación científica)';$('qualityBar').style.width=q.score+'%';$('precisionReadout').textContent=res?`Resolución nominal: ${res.toFixed(2)} ms/frame`:'Resolución temporal: FPS no verificado';$('uncertaintyReadout').textContent=res?`Incertidumbre nominal del intervalo: ±${(res/Math.sqrt(2)).toFixed(2)} ms (≈0.5 frame por evento)`:'Incertidumbre: no cuantificable por frame';$('validationNote').textContent=`Marca válida · ${d.toFixed(2)} m · ${t.toFixed(3)} s · ${activeFps()?activeFps()+' fps declarado':'FPS no verificado'}.`;updateAI(t,ms);renderSplits();$('saveCurrent').disabled=false}
function seekTo(t){const v=$('video');return new Promise(resolve=>{let done=false;const fn=()=>{if(done)return;done=true;v.removeEventListener('seeked',fn);resolve()};v.addEventListener('seeked',fn,{once:true});v.currentTime=Math.max(0,Math.min(v.duration||0,t));setTimeout(fn,700)})}
async function stepFrames(n){const v=$('video'),f=activeFps();if(!v.duration)return;if(!f)return alert('Selecciona el FPS real del vídeo para avanzar por frames.');v.pause();await seekTo(v.currentTime+n/f);updateClock()}
function mark(which){
  const v=$('video'),f=activeFps();
  if(!v.duration)return alert('Carga un vídeo primero.');
  const raw=v.currentTime;
  const frame=f?Math.round(raw*f):null;
  const snapped=f?frame/f:raw;
  state[which]={time:snapped,frame,mediaTime:null,rawTime:raw,mode:f?'frame-nominal':'timeline'};
  const d=distance();
  if(which==='finish' && d){
    state.vision.manualGates[String(d)]={time:snapped,frame,mode:'manual'};
    delete state.vision.validatedGates[String(d)];
  }
  updateMarks();updateResult();updateAudit();
}
function bindVideo(){const v=$('video');$('videoInput').onchange=e=>{const file=e.target.files?.[0];if(!file)return;if(state.videoUrl)URL.revokeObjectURL(state.videoUrl);state.videoFile=file;state.videoUrl=URL.createObjectURL(file);v.src=state.videoUrl;v.load();state.start=state.finish=null;state.gates={};state.lastFrameMeta=null;state.rvfcId=null;$('videoStatusPill').textContent='CARGANDO';updateMarks();updateResult()};v.onloadedmetadata=()=>{$('resolution').textContent=`${v.videoWidth}×${v.videoHeight}`;$('videoMeta').textContent=`${state.videoFile?.name||'Vídeo'} · ${(state.videoFile?.size/1048576||0).toFixed(1)} MB · ${v.duration.toFixed(3)} s`;$('videoStatusPill').textContent='LISTO';updateClock();startRVFC()};v.ontimeupdate=()=>{updateClock();drawTrackingOverlay();};v.onplay=()=>{$('playPause').textContent='⏸ Pausar'};v.onpause=()=>{$('playPause').textContent='▶ Reproducir'};$('playPause').onclick=()=>v.paused?v.play():v.pause();$('playbackRate').onchange=e=>v.playbackRate=Number(e.target.value);$('back1').onclick=()=>stepFrames(-1);$('back10').onclick=()=>stepFrames(-10);$('forward1').onclick=()=>stepFrames(1);$('forward10').onclick=()=>stepFrames(10)}
function startRVFC(){const v=$('video');if(!('requestVideoFrameCallback' in HTMLVideoElement.prototype))return;if(state.rvfcId!==null&&v.cancelVideoFrameCallback){v.cancelVideoFrameCallback(state.rvfcId);state.rvfcId=null}const cb=async(now,meta)=>{state.lastFrameMeta=meta;drawTrackingOverlay();if(poseAiTask&&v.readyState>=2&&performance.now()-state.track.lastDetect>90){state.track.lastDetect=performance.now();try{const r=poseAiTask.detectForVideo(v,Math.round(v.currentTime*1000));const torso=torsoFromLandmarks(r?.landmarks?.[0]);state.track.torso=torso;updateBodyStatus();drawTrackingOverlay()}catch(e){}}state.rvfcId=v.requestVideoFrameCallback(cb)};state.rvfcId=v.requestVideoFrameCallback(cb)}
function bindFps(){const set=()=>{const x=$('fpsInput').value;$('customFpsWrap').classList.toggle('hidden',x!=='custom');state.fps=x==='unknown'?null:x==='custom'?Number($('customFps').value):Number(x);$('sourceFps').textContent=state.fps?state.fps+' fps':'No verificado';$('precisionNote').textContent=state.fps?`Con ${state.fps} fps, un frame equivale a ${resolutionMs().toFixed(2)} ms. La app no afirma una precisión mejor que esa resolución temporal.`:'Sin FPS verificado, la app no asigna precisión de frame.';updateClock();updateMarks();updateResult()};$('fpsInput').onchange=set;$('customFps').oninput=set}
function currentMeasurement(){if(!$('athleteSelect')?.value)return null;if(!state.start||!state.finish)return null;const t=state.finish.time-state.start.time,d=distance();if(t<=0||d<=0)return null;const ms=d/t,q=qualityInfo();const gateData=Object.fromEntries(Object.entries(state.gates));readProtocol();const precision=precisionGuard();const protocol=JSON.parse(JSON.stringify(state.vision.protocol||{}));const protocolScore=protocolQuality();const gateAudit=auditMethod(d);const validationStatus=state.vision.manualGates?.[String(d)]?'manual':state.vision.validatedGates?.[String(d)]?'validated':state.vision.proposals?.[String(d)]?'proposal':'manual';return {id:uid(),athleteId:$('athleteSelect').value,distance:d,protocol:$('startProtocol').value,surface:$('surface').value,condition:$('condition').value,fps:activeFps(),time:t,ms,kmh:ms*3.6,quality:q.label,qualityScore:q.score,attempt:state.series.current||state.series.attempts.length+1,start:state.start,finish:state.finish,gates:gateData,visionValidated:validationStatus==='validated',validationStatus,gateAudit,protocol,protocolScore,precision,seriesStats:computeSeriesStats?.()||null,agreementAnalysis:null,videoName:state.videoFile?.name||'',captureSource:state.live?.stream?'camera-live':'video-file',cameraFps:state.live?.sourceFps||null,observedFps:state.live?.observedFps||null,cameraResolution:state.live?.stream?`${$('liveVideo')?.videoWidth||''}×${$('liveVideo')?.videoHeight||''}`:'',bodyDetection:state.start?.bodyDetected&&state.finish?.bodyDetected?'pose-torso':'manual',liveEvidence:state.live?.photoUrl||null,liveSourceFps:state.live?.sourceFps||null,liveResolution:state.live?.stream?`${state.live.width||$('liveVideo')?.videoWidth||''}×${state.live.height||$('liveVideo')?.videoHeight||''}`:'',createdAt:new Date().toISOString()}}
function addMeasurement(m){state.db.history.push(m);save();renderHistory();renderProfile();renderAthletes()}
function bindSeries(){function reset(){state.series={active:false,total:0,current:0,attempts:[]};$('startSeries').disabled=false;$('nextAttempt').disabled=true;$('finishSeries').disabled=true;$('cancelSeries').disabled=true;renderAttempts()}
$('startSeries').onclick=()=>{if(!$('athleteSelect').value)return alert('Crea o selecciona un deportista.');if(!distance())return alert('Selecciona una distancia válida.');if(!$('video').duration)return alert('Carga el vídeo antes de iniciar la serie.');state.series={active:true,total:Number($('seriesCount').value),current:1,attempts:[]};$('startSeries').disabled=true;$('nextAttempt').disabled=false;$('finishSeries').disabled=true;$('cancelSeries').disabled=false;$('seriesStatus').textContent=`Serie activa · intento 1 de ${state.series.total}. Marca inicio y final.`;state.start=state.finish=null;state.gates={};renderAttempts();updateMarks();updateGates();updateResult()};$('nextAttempt').onclick=()=>{const m=currentMeasurement();if(!m)return alert('Marca inicio y final antes de pasar al siguiente intento.');m.attempt=state.series.current;state.series.attempts.push(m);renderAttempts();if(state.series.current>=state.series.total){$('seriesStatus').textContent='✓ Todos los intentos completados. Puedes finalizar la serie.';$('nextAttempt').disabled=true;$('finishSeries').disabled=false;return}state.series.current++;state.start=state.finish=null;$('seriesStatus').textContent=`Intento ${state.series.current} de ${state.series.total}.`;updateMarks();updateResult()};$('finishSeries').onclick=()=>{if(!state.series.attempts.length)return alert('No hay intentos guardados.');state.series.attempts.forEach(m=>addMeasurement(m));$('seriesStatus').textContent=`✓ Serie guardada · ${state.series.attempts.length} intentos.`;reset();state.start=state.finish=null;state.gates={};state.vision.manualGates={};state.vision.validatedGates={};updateMarks();updateGates();updateResult();updateAudit()};$('cancelSeries').onclick=()=>{if(confirm('¿Cancelar la serie sin guardar sus intentos?')){reset();state.start=state.finish=null;$('seriesStatus').textContent='Serie cancelada.';updateMarks();updateResult()}}}
function bindSave(){ $('saveCurrent').onclick=()=>{if(state.series.active){alert('La serie está activa. Guarda el intento con «Siguiente intento» y finaliza la serie.');return}if(!$('athleteSelect')?.value){alert('Selecciona un deportista. El historial no guardará resultados sin nombre.');return}const m=currentMeasurement();if(!m)return;addMeasurement(m);$('validationNote').textContent='✓ Intento guardado en el historial.';$('saveCurrent').disabled=true;state.start=state.finish=null;state.gates={};state.vision.manualGates={};state.vision.validatedGates={};updateMarks();updateGates();updateResult();updateAudit()}}
function bindAthletes(){ $('newAthlete').onclick=()=>$('athleteDialog').showModal();$('cancelAthlete').onclick=()=>$('athleteDialog').close();$('athleteForm').onsubmit=e=>{e.preventDefault();const a={id:uid(),name:$('athleteName').value.trim(),dob:$('athleteDob').value,sex:$('athleteSex').value,sport:$('athleteSport').value.trim(),category:$('athleteCategory').value.trim(),notes:$('athleteNotes').value.trim(),createdAt:new Date().toISOString()};if(!a.name)return;state.db.athletes.push(a);save();renderAll();$('athleteSelect').value=a.id;$('profileSelect').value=a.id;$('athleteDialog').close();e.target.reset()}}
function bindHistory(){['historySearch','historyDistance','historyQuality'].forEach(id=>$(id).oninput=$(id).onchange=renderHistory);$('clearHistory').onclick=()=>{if(confirm('¿Borrar todo el historial? Los deportistas se conservarán.')){state.db.history=[];save();renderAll()}};$('exportCsv').onclick=()=>{const head=['Fecha','Deportista','Distancia_m','Intento','Tiempo_s','m_s','km_h','Calidad','FPS','Protocolo','Superficie','Condición'];const rows=state.db.history.map(h=>[h.createdAt,athleteName(h.athleteId),h.distance,h.attempt,h.time.toFixed(3),h.ms.toFixed(3),h.kmh.toFixed(3),h.quality,h.fps||'',h.protocol,h.surface,h.condition]);const csv=[head,...rows].map(r=>r.map(x=>'"'+String(x??'').replaceAll('"','""')+'"').join(',')).join('\n');download('ars-sprint-historial.csv',csv,'text/csv')}}
function download(name,data,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function bindBackup(){$('backupBtn').onclick=()=>download('ars-sprint-respaldo.json',JSON.stringify(state.db,null,2),'application/json');$('restoreInput').onchange=e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(!Array.isArray(x.athletes)||!Array.isArray(x.history))throw Error();state.db={version:'10.0',athletes:x.athletes,history:x.history,gates:x.gates||{}};save();renderAll();alert('Respaldo restaurado correctamente.')}catch{alert('Archivo de respaldo no válido.')}};r.readAsText(f)}}
function dashboardAthletes(){const cur=$('dashAthlete')?.value;const opts=state.db.athletes.map(a=>`<option value="${a.id}">${esc(a.name)}${a.category?' · '+esc(a.category):''}</option>`).join('')||'<option value="">Sin deportistas</option>';if($('dashAthlete')){$('dashAthlete').innerHTML=opts;if(cur&&athlete(cur))$('dashAthlete').value=cur}}
function drawCanvas(canvasId,labels,values,opts={}){const c=$(canvasId);if(!c)return;const ctx=c.getContext('2d');const w=c.clientWidth||700,h=260,dpr=window.devicePixelRatio||1;c.width=w*dpr;c.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);ctx.font='12px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';ctx.fillStyle='#667085';const pad={l:48,r:18,t:20,b:42};const pw=w-pad.l-pad.r,ph=h-pad.t-pad.b;if(!values.length){return}const min=Math.min(...values),max=Math.max(...values),range=max-min||1;for(let i=0;i<5;i++){const y=pad.t+ph*i/4;ctx.strokeStyle='#e9edf2';ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();const val=max-(range*i/4);ctx.fillStyle='#667085';ctx.fillText(val.toFixed(opts.decimals??2),4,y+4)}ctx.strokeStyle='#111';ctx.lineWidth=2;ctx.beginPath();values.forEach((v,i)=>{const x=pad.l+(values.length===1?pw/2:pw*i/(values.length-1));const y=pad.t+(max-v)/range*ph;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke();values.forEach((v,i)=>{const x=pad.l+(values.length===1?pw/2:pw*i/(values.length-1));const y=pad.t+(max-v)/range*ph;ctx.fillStyle='#ffd000';ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#344054';ctx.textAlign='center';ctx.fillText(String(labels[i]),x,h-18)});ctx.textAlign='left'}
function renderDashboard(){if(!$('dashAthlete'))return;dashboardAthletes();const id=$('dashAthlete').value,d=Number($('dashDistance').value);const hs=state.db.history.filter(h=>h.athleteId===id&&Number(h.distance)===d).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));const best=hs.length?Math.min(...hs.map(h=>h.time)):null;const latest=hs[hs.length-1];$('dashBest').textContent=best==null?'—':best.toFixed(3);$('dashSpeed').textContent=latest?latest.kmh.toFixed(2):'—';$('dashPb').textContent=latest&&best?((latest.time-best)/best*100).toFixed(2)+'%':'—';$('dashCount').textContent=hs.length;$('dashSummary').textContent=hs.length?`${hs.length} registro(s) · última evaluación ${new Date(latest.createdAt).toLocaleDateString('es-PE')}`:'No hay registros para esta distancia.';const bestSeries=[];let running=Infinity;hs.forEach(h=>{running=Math.min(running,h.time);bestSeries.push(running)});$('trendEmpty').style.display=bestSeries.length?'none':'block';drawCanvas('trendCanvas',hs.map((_,i)=>i+1),bestSeries,{decimals:3});const gates=latest?.gates||{};const entries=[5,10,20].map(g=>({g,t:gates[String(g)]?.time})).filter(x=>x.t!=null);const speeds=[];const labs=[];let prev={d:0,t:0};entries.forEach(x=>{const dt=x.t-prev.t,dd=x.g-prev.d;if(dt>0){speeds.push(dd/dt*3.6);labs.push(`${prev.d}-${x.g}`)}prev={d:x.g,t:x.t}});$('splitEmpty').style.display=speeds.length?'none':'block';drawCanvas('splitCanvas',labs,speeds,{decimals:1});renderRanking()}
function renderRanking(){if(!$('rankBody'))return;const d=Number($('rankDistance').value),metric=$('rankMetric').value;const rows=state.db.athletes.map(a=>{const hs=state.db.history.filter(h=>h.athleteId===a.id&&Number(h.distance)===d);if(!hs.length)return null;const best=Math.min(...hs.map(h=>h.time)),speed=hs.find(h=>h.time===best)?.ms||0;return {a,best,speed,count:hs.length}}).filter(Boolean).sort((x,y)=>metric==='time'?x.best-y.best:y.speed-x.speed);$('rankBody').innerHTML=rows.map((r,i)=>`<tr><td><b>${i+1}</b></td><td>${esc(r.a.name)}</td><td>${metric==='time'?r.best.toFixed(3)+' s':(r.speed*3.6).toFixed(2)+' km/h'}</td><td>${r.count}</td></tr>`).join('')||'<tr><td colspan="4">No hay resultados para esta prueba.</td></tr>'}
function bindDashboard(){['dashAthlete','dashDistance'].forEach(id=>$(id)?.addEventListener('change',renderDashboard));['rankDistance','rankMetric'].forEach(id=>$(id)?.addEventListener('change',renderRanking));window.addEventListener('resize',()=>{if(document.getElementById('dashboard')?.classList.contains('active'))renderDashboard()});renderDashboard()}
function openTab(id){
  if(!['evaluation','dashboard','athletes','history','profile','smartcapture','vision','method'].includes(id))id='evaluation';
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===id));
  document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===id));
  const advancedIds=['comparisonPanel','protocolPanel','reliabilityPanel','agreementPanel','athleteReportPanel','performanceProfilePanel','athleteInterpretationPanel','frameRefinementPanel','crossingInterpolationPanel','eventEvidencePanel','autoBracketPanel','multiCuePanel','torsoProxyPanel','poseAiPanel','eventReviewPanel','finalDashboardPanel'];
  advancedIds.forEach(panelId=>{const el=$(panelId);if(el)el.style.display=id==='method'?'block':'none';});
  window.scrollTo({top:0,behavior:'instant'});
  if(id==='profile')renderProfile();
  if(id==='dashboard')renderDashboard();
  if(id==='history')renderHistory();
  if(id==='athletes')renderAthletes();
  if(id==='method' && typeof renderAdvancedPanels==='function')renderAdvancedPanels();
}
function bindTabs(){document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>openTab(t.dataset.tab))}
function runCaptureCheck(){const v=$('video');const file=state.videoFile;let score=0,items=[];if(file){$('checkVideo').textContent=`Vídeo: ${file.name}`;score+=20}else{$('checkVideo').textContent='Vídeo: falta cargar'}if(v.videoWidth&&v.videoHeight){$('checkResolution').textContent=`Resolución: ${v.videoWidth}×${v.videoHeight}`;if(v.videoWidth>=1280)score+=20;else if(v.videoWidth>=720)score+=12}else{$('checkResolution').textContent='Resolución: no disponible'}if(activeFps()){$('checkFps').textContent=`FPS declarado: ${activeFps()}`;score+=20}else{$('checkFps').textContent='FPS: no verificado'}if(v.duration){$('checkDuration').textContent=`Duración: ${v.duration.toFixed(2)} s`;score+=15}else{$('checkDuration').textContent='Duración: no disponible'}if($('confirmStable').checked){score+=25;$('checkStability').textContent='Estabilidad: confirmada por entrenador'}else{$('checkStability').textContent='Estabilidad: falta confirmación'}score=Math.min(100,score);$('captureScorePill').textContent=score>=85?'BUENA CAPTURA':score>=65?'REVISAR':'INSUFICIENTE';const advice=score>=85?'La captura cumple las condiciones básicas registradas. Mantén el mismo encuadre para comparar sesiones.':score>=65?'La captura puede utilizarse, pero revisa FPS, resolución y estabilidad antes de comparar marcas.':'No compares esta medición con otras todavía. Corrige la captura y vuelve a analizarla.';$('captureAdvice').innerHTML=`<b>Indicador de captura: ${score}/100</b><p>${advice}</p><p><b>Importante:</b> este puntaje es una lista de control, no una medida científica de exactitud.</p>`}
function visionDrawFrame(){const v=$('video'),c=$('visionCanvas');if(!v||!v.videoWidth||!v.videoHeight)return false;const ctx=c.getContext('2d');const w=c.clientWidth||720,h=Math.round(w*v.videoHeight/v.videoWidth);c.width=w*devicePixelRatio;c.height=h*devicePixelRatio;c.style.height=h+'px';ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);ctx.drawImage(v,0,0,w,h);Object.entries(state.vision.positions).forEach(([g,x])=>{ctx.strokeStyle=g==='20'?'#ffd000':g==='10'?'#fff':'#1683e8';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x*w,0);ctx.lineTo(x*w,h);ctx.stroke();ctx.fillStyle='#111';ctx.fillRect(x*w+4,8,48,22);ctx.fillStyle='#fff';ctx.font='bold 12px sans-serif';ctx.fillText(g+' m',x*w+9,23)});return true}
function renderVisionGates(){const keys=[5,10,20],html=keys.map(g=>{const x=state.vision.positions[String(g)];return `<div class="vision-item"><span><b>${g} m</b></span><span>${x==null?'Sin marcar':(x*100).toFixed(1)+'% del ancho'}</span></div>`}).join('');$('visionGateList').innerHTML=html;$('visionStatus').textContent=keys.every(g=>state.vision.positions[String(g)]!=null)?'CALIBRADA':'NO CALIBRADA';visionDrawFrame()}
function visionLoadFrame(){if(!visionDrawFrame())return alert('Carga un vídeo y colócalo en el frame que quieras usar para calibrar las puertas.');renderVisionGates()}
function visionCanvasClick(e){const c=$('visionCanvas');const r=c.getBoundingClientRect();const x=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));state.vision.positions[String(state.vision.selectedGate)]=x;renderVisionGates()}
async function visionAnalyze(){
  const v=$('video');
  if(!v.duration)return alert('Carga un vídeo primero.');
  if([5,10,20].some(g=>state.vision.positions[String(g)]==null))return alert('Calibra primero 5, 10 y 20 m.');
  const fps=activeFps();
  if(!fps)return alert('Declara el FPS real del vídeo para analizar cuadro a cuadro.');
  const c=document.createElement('canvas'),ctx=c.getContext('2d',{willReadFrequently:true});
  const w=320,h=Math.max(120,Math.round(320*v.videoHeight/v.videoWidth));c.width=w;c.height=h;
  const gatePx={};Object.entries(state.vision.positions).forEach(([g,x])=>gatePx[g]=Math.round(x*w));
  state.vision.proposals={};
  const original=v.currentTime, step=Math.max(1/fps,1/30), band=Math.max(4,Math.round(w*Number($('centroidBand')?.value||0.08)));
  const minSignal=Number($('centroidMinSignal')?.value||5);
  const series={5:[],10:[],20:[]};let prev=null;
  for(let t=0;t<=v.duration;t+=step){
    await seekTo(t);ctx.drawImage(v,0,0,w,h);
    const im=ctx.getImageData(0,0,w,h).data;
    for(const g of [5,10,20]){
      const x=gatePx[g];let sum=0,wx=0,n=0;
      for(let yy=0;yy<h;yy+=2){
        for(let xx=Math.max(0,x-band);xx<=Math.min(w-1,x+band);xx+=2){
          const i=(yy*w+xx)*4;
          const lum=.2126*im[i]+.7152*im[i+1]+.0722*im[i+2];
          if(prev){
            const pl=.2126*prev[i]+.7152*prev[i+1]+.0722*prev[i+2];
            const d=Math.abs(lum-pl);
            sum+=d; wx+=d*xx; n++;
          }
        }
      }
      const score=n?sum/n:0;
      const centroid=sum>=minSignal?wx/sum:null;
      series[g].push({t,score,centroid});
    }
    prev=im;
  }
  await seekTo(original);
  const rows=[];
  for(const g of [5,10,20]){
    const a=series[g];
    const centroidHit=findCentroidCrossing(a,gatePx[g],fps);
    const peak=a.reduce((best,q)=>q.score>best.score?q:best,a[0]);
    let bracket=centroidHit;
    let method='visual-centroid-crossing';
    if(!bracket){
      bracket=findBracketFromSeries(a,peak.t,fps);
      method='motion-bracket-linear';
    }
    if(bracket){
      const prevFrame=Math.round(bracket.prev.t*fps),nextFrame=Math.round(bracket.next.t*fps);
      const ratio=peak.score>0?Math.max(bracket.score||0,peak.score)/Math.max(peak.score,1):0;
      const conf=method==='visual-centroid-crossing'?Math.min(92,Math.round(68+Math.min(ratio,1)*12+(nextFrame-prevFrame<=2?12:4))):Math.min(75,Math.round(48+Math.min(ratio,1)*18));
      const cue=confirmEventMultiCue({motion:true,gate:true,continuity:(nextFrame-prevFrame)<=Number($('cueGap')?.value||2),prevFrame,nextFrame});
      state.vision.proposals[String(g)]={time:bracket.time,confidence:cue.ok?conf:Math.min(conf,59),score:peak.score,
        evidence:{prevFrame,nextFrame,ratio,method,centroidDetected:method==='visual-centroid-crossing'}};
      rows.push({g,time:bracket.time,confidence:cue.ok?conf:Math.min(conf,59),prevFrame,nextFrame,ratio,method});
    }else{
      state.vision.proposals[String(g)]={time:peak.t,confidence:30,score:peak.score,
        evidence:{prevFrame:null,nextFrame:null,ratio:0,method:'peak-fallback',centroidDetected:false}};
      rows.push({g,time:peak.t,confidence:30,prevFrame:null,nextFrame:null,ratio:0,method:'peak-fallback'});
    }
  }
  const centroidCount=rows.filter(r=>r.method==='visual-centroid-crossing').length;
  $('torsoProxyResult').innerHTML=`<b>${centroidCount}/3 puertas</b> obtuvieron cruce por centro visual de masa. <small>Proxy visual; no es detección anatómica.</small>`;
  renderVisionResults(rows);
  renderAutoBracket(rows.filter(r=>r.prevFrame!=null));
  if(rows[0]?.prevFrame!=null)renderMultiCue({motion:true,gate:true,continuity:(rows[0].nextFrame-rows[0].prevFrame)<=Number($('cueGap')?.value||2),prevFrame:rows[0].prevFrame,nextFrame:rows[0].nextFrame});
  updateAudit();
}
function renderVisionResults(rows){$('visionResults').innerHTML=rows.map(r=>`<tr><td><b>${r.g} m</b></td><td>${r.time.toFixed(3)} s</td><td>${r.confidence}% candidato</td><td>${r.confidence>=80?'🟢 Señal clara':r.confidence>=60?'🟡 Revisar':'🔴 Señal débil'}</td><td><button class="secondary visionApply" data-g="${r.g}">Usar en marcas</button></td></tr>`).join('');document.querySelectorAll('.visionApply').forEach(b=>b.onclick=()=>{const g=Number(b.dataset.g),p=state.vision.proposals[String(g)];if(!p)return;state.gates[String(g)]={time:p.time,frame:Math.round(p.time*activeFps()),mode:'vision-assisted',confidence:p.confidence};if(g===distance()){state.start={time:0,frame:0,mode:'vision-assisted'};state.finish={time:p.time,frame:Math.round(p.time*activeFps()),mode:'vision-assisted'}}updateGates();updateResult();$('visionNote').textContent='Propuesta aplicada. Revisa el frame antes de guardar como resultado validado.'})}



function readProtocol(){
  state.vision.protocol={
    startType:$('startProtocol')?.value||'2 puntos',
    cameraSide:$('cameraProtocol')?.value||'Lateral',
    fps:$('fpsProtocol')?.value||'',
    calibration:$('calibrationProtocol')?.value||'pendiente'
  };
}
function bindProtocol(){
  ['startProtocol','cameraProtocol','fpsProtocol','calibrationProtocol'].forEach(id=>{
    const el=$(id); if(el)el.onchange=()=>{readProtocol();updateAudit();precisionGuard()};
  });
  readProtocol();
}
function protocolQuality(){
  const p=state.vision.protocol||{};
  let score=0;
  if(p.startType)score+=25;
  if(p.cameraSide==='Lateral')score+=30;
  if(Number(p.fps)>0)score+=20;
  if(p.calibration==='confirmada')score+=25;
  return score;
}
function auditMethod(g){
  const vg=state.vision.validatedGates?.[String(g)];
  const mg=state.vision.manualGates?.[String(g)];
  const gate=state.gates?.[String(g)];
  if(mg)return {label:'MANUAL',meta:`${mg.time.toFixed(3)} s · frame ${mg.frame??'—'}`};
  if(vg)return {label:'VALIDADO',meta:`${vg.time.toFixed(3)} s · ${vg.confidence}% candidato`};
  if(gate?.mode==='vision-assisted')return {label:'PROPUESTA',meta:`${gate.time.toFixed(3)} s · revisar`};
  return {label:'PENDIENTE',meta:'—'};
}
function renderAuditBoxes(){
  [5,10,20].forEach(g=>{
    const a=auditMethod(g);
    const el=$(`audit${g}`), meta=$(`audit${g}meta`);
    if(el)el.textContent=a.label;
    if(meta)meta.textContent=a.meta;
  });
}
function validationReadyForDistance(d){
  const g=String(d);
  return !!(state.vision.validatedGates?.[g] || state.vision.manualGates?.[g]);
}

function precisionGuard(){
  const p=state.vision?.protocol||{};
  const fps=Number(p.fps);
  const res=$('temporalResolution'), q=$('captureQuality'), qm=$('captureQualityMeta');
  const g=$('measurementGuard'), gm=$('measurementGuardMeta');
  if(res)res.textContent=fps>0?(1/fps).toFixed(4)+' s':'—';
  let score=0, notes=[];
  if(fps>=240){score+=35;notes.push('240+ FPS')}
  else if(fps>=120){score+=28;notes.push('120+ FPS')}
  else if(fps>=60){score+=20;notes.push('60+ FPS')}
  else if(fps>0){score+=10;notes.push('<60 FPS')}
  else notes.push('FPS no registrado');
  if(p.cameraSide==='Lateral'){score+=30;notes.push('vista lateral')}
  else notes.push('vista no lateral');
  if(p.calibration==='confirmada'){score+=25;notes.push('calibración confirmada')}
  else notes.push('calibración pendiente');
  if(p.startType){score+=10;notes.push('salida registrada')}
  const label=score>=85?'Alta':score>=65?'Adecuada':score>=45?'Limitada':'Insuficiente';
  if(q)q.textContent=label;
  if(qm)qm.textContent=`${score}/100 · ${notes.join(' · ')}`;
  const d=distance();
  const validated=validationReadyForDistance(d);
  if(g)g.textContent=validated?(score>=65?'LISTO':'REVISAR'):'PENDIENTE';
  if(gm)gm.textContent=validated?`${d} m · dato validado · protocolo ${score}/100`:'Valida la puerta de llegada';
  return {score,label,resolution:fps>0?1/fps:null,fps,protocol:p,validated,distance:d};
}

function updateAudit(){
  runFinalAudit();
  precisionGuard();
  const ps=Object.keys(state.vision.proposals);
  const vals=Object.keys(state.vision.validatedGates||{});
  const mans=Object.keys(state.vision.manualGates||{});
  $('autoAudit').textContent=ps.length?ps.sort((a,b)=>Number(a)-Number(b)).map(g=>`${g} m: ${state.vision.proposals[g].time.toFixed(3)} s`).join(' · '):'Sin propuestas';
  $('coachAudit').textContent=(vals.length+mans.length)?[...vals.map(g=>`${g} m ✓`),...mans.map(g=>`${g} m ✋`)].sort((a,b)=>Number(a)-Number(b)).join(' · '):'Pendiente';
  const ready=validationReadyForDistance(distance());
  $('finalAudit').textContent=ready?'Hay dato validado para la prueba seleccionada':'Bloqueado hasta validar la puerta de llegada';
  $('validationStatus').textContent=ready?'VALIDADO':'PENDIENTE';
  const pq=protocolQuality();
  const pw=$('protocolWarning');
  if(pw)pw.textContent=`Protocolo: ${state.vision.protocol?.startType||'2 puntos'} · Cámara: ${state.vision.protocol?.cameraSide||'Lateral'} · Calidad de protocolo: ${pq}/100. La puntuación es de estandarización, no de exactitud científica.`;
  renderAuditBoxes();
}
function bindValidation(){
  if(!$('acceptVision'))return;
  $('acceptVision').onclick=()=>{
    const ps=state.vision.proposals;
    if(!Object.keys(ps).length)return alert('Primero analiza el vídeo.');
    state.vision.validatedGates={...ps};
    state.vision.accepted=true;
    Object.entries(ps).forEach(([g,p])=>{
      state.gates[g]={time:p.time,frame:Math.round(p.time*(activeFps()||30)),mode:'vision-validated',confidence:p.confidence};
    });
    updateGates();updateAudit();updateResult();
    $('auditNote').textContent='✓ Propuesta aceptada por el entrenador. El dato queda identificado como validado; revisa visualmente los frames antes de guardar.';
  };
  $('rejectVision').onclick=()=>{
    state.vision.accepted=false;
    state.vision.validatedGates={};
    updateAudit();
    $('auditNote').textContent='Revisión manual activada. Selecciona el frame correcto en el vídeo y marca manualmente el inicio/final. La propuesta automática no se considera válida.';
  };
  updateAudit();
}
function bindVision(){if(!$('visionCanvas'))return;document.querySelectorAll('.gateSelect').forEach(b=>b.onclick=()=>{state.vision.selectedGate=Number(b.dataset.vgate);document.querySelectorAll('.gateSelect').forEach(x=>x.classList.toggle('primary',x===b));document.querySelectorAll('.gateSelect').forEach(x=>x.classList.toggle('secondary',x!==b))});$('visionCanvas').onclick=visionCanvasClick;$('visionLoadFrame').onclick=visionLoadFrame;$('visionClear').onclick=()=>{state.vision.positions={};state.vision.proposals={};state.vision.manualGates={};state.vision.validatedGates={};renderVisionGates();state.vision.accepted=false;state.vision.validatedGates={};updateAudit();$('visionResults').innerHTML='<tr><td colspan="5">Calibra las puertas y analiza el vídeo.</td></tr>'};$('visionAnalyze').onclick=visionAnalyze;renderVisionGates()}
function getTrackFinishX(){const d=distance();return Number.isFinite(state.vision.positions[String(d)])?state.vision.positions[String(d)]:state.track.finishX}
function updateBodyStatus(){const el=$('bodyStatus');if(!el)return;el.textContent=state.track.torso?`🟢 Atleta detectado · ${athlete($('athleteSelect')?.value)?.name||'seleccionado'} · visibilidad ${(state.track.torso.visibility*100).toFixed(0)}%`:`⚪ Atleta: no detectado · coloca al deportista completo dentro del encuadre`}
function drawTrackingOverlay(){const v=$('video'),c=$('trackingOverlay');if(!v||!c||!v.videoWidth)return;const r=v.getBoundingClientRect(),w=Math.max(1,r.width),h=Math.max(1,r.height);c.width=Math.round(w*devicePixelRatio);c.height=Math.round(h*devicePixelRatio);c.style.width=w+'px';c.style.height=h+'px';const ctx=c.getContext('2d');ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);ctx.clearRect(0,0,w,h);const lines=[{x:state.track.startX,label:'INICIO',color:'#ffd000'},{x:getTrackFinishX(),label:`FINAL ${distance()} m`,color:'#fff'}];for(const L of lines){ctx.strokeStyle=L.color;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(L.x*w,0);ctx.lineTo(L.x*w,h);ctx.stroke();ctx.fillStyle='#111';ctx.fillRect(L.x*w+5,10,Math.min(130,w-L.x*w-5),28);ctx.fillStyle=L.color;ctx.font='800 13px sans-serif';ctx.fillText(L.label,L.x*w+10,29)}if(state.track.torso){const x=state.track.torso.x*w,y=state.track.torso.y*h;ctx.fillStyle='#16a36b';ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#111';ctx.fillRect(Math.min(w-170,x+12),Math.max(5,y-16),155,24);ctx.fillStyle='#fff';ctx.font='700 12px sans-serif';ctx.fillText('TORso · IA de pose',Math.min(w-165,x+17),y)} }
function trackingCanvasPoint(e){const c=$('trackingOverlay'),r=c.getBoundingClientRect();return Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))}
function bindTrackingOverlay(){const c=$('trackingOverlay');if(!c)return;c.addEventListener('pointerdown',e=>{const x=trackingCanvasPoint(e);const a=Math.abs(x-state.track.startX),b=Math.abs(x-getTrackFinishX());state.track.drag=a<b?'start':'finish';c.setPointerCapture?.(e.pointerId);});c.addEventListener('pointermove',e=>{if(!state.track.drag)return;const x=trackingCanvasPoint(e);if(state.track.drag==='start')state.track.startX=Math.min(x,getTrackFinishX()-.03);else state.track.finishX=Math.max(x,state.track.startX+.03);drawTrackingOverlay();updateBodyStatus()});c.addEventListener('pointerup',()=>{state.track.drag=null});}
async function detectBodyAtCurrentFrame(){const fps=activeFps();if(!fps)return alert('Declara el FPS real del vídeo antes de detectar el cuerpo.');try{await loadPoseAI();const v=$('video'),r=poseAiTask.detectForVideo(v,Math.round(v.currentTime*1000));state.track.torso=torsoFromLandmarks(r?.landmarks?.[0]);updateBodyStatus();drawTrackingOverlay();return state.track.torso}catch(e){$('bodyStatus').textContent='No se pudo cargar la IA de pose. Revisa la conexión a Internet.';return null}}
async function autoMeasureSprint(){const v=$('video');if(!v?.duration)return alert('Carga un vídeo primero.');const fps=activeFps();if(!fps)return alert('Declara el FPS real del vídeo.');if(!$('athleteSelect').value)return alert('Selecciona un deportista antes de medir.');try{await loadPoseAI();const old=v.currentTime;const step=Math.max(1/fps,1/30),samples=[];let last=null;for(let t=0;t<=v.duration;t+=step){await seekTo(t);const r=poseAiTask.detectForVideo(v,Math.round(t*1000));const torso=torsoFromLandmarks(r?.landmarks?.[0]);if(torso){samples.push({t,x:torso.x,v:torso.visibility});last=torso}}await seekTo(old);if(samples.length<3)return alert('No se pudo seguir el cuerpo durante el vídeo. Usa un plano lateral y asegúrate de que el atleta sea visible.');const sx=state.track.startX,fx=getTrackFinishX();const dir=samples.at(-1).x>=samples[0].x?1:-1;const cross=(x1,x2,line)=>dir>0?(x1<line&&x2>=line):(x1>line&&x2<=line);let st=null,fn=null;for(let i=1;i<samples.length;i++){const a=samples[i-1],b=samples[i];if(!st&&cross(a.x,b.x,sx)){const al=(sx-a.x)/(b.x-a.x);st=a.t+al*(b.t-a.t)}if(st!=null&&!fn&&cross(a.x,b.x,fx)){const al=(fx-a.x)/(b.x-a.x);fn=a.t+al*(b.t-a.t);break}}if(st==null||fn==null||fn<=st)return alert('El cuerpo fue detectado, pero no cruzó las líneas de inicio y final. Ajusta las líneas amarilla/blanca sobre el vídeo.');state.start={time:st,frame:Math.round(st*fps),mode:'pose-auto',bodyDetected:true};state.finish={time:fn,frame:Math.round(fn*fps),mode:'pose-auto',bodyDetected:true};state.track.auto=true;state.track.direction=dir;updateMarks();updateResult();updateBodyStatus();$('bodyStatus').textContent=`🟢 Medición automática: ${st.toFixed(3)} → ${fn.toFixed(3)} s · cuerpo detectado · revisar antes de guardar`;return {start:st,finish:fn,frames:samples.length};}catch(e){console.error(e);alert('No se pudo completar la medición automática. Revisa la conexión al modelo de IA y el encuadre.')}}
async function generatePhotoFinish(){const v=$('video'),c=$('photoFinishCanvas');if(!v?.duration)return alert('Carga un vídeo primero.');if(!state.finish)return alert('Marca o detecta primero el final del sprint.');const fps=activeFps();if(!fps)return alert('Declara el FPS real del vídeo.');const win=Math.max(.1,Math.min(3,Number($('photoFinishWindow')?.value||1)));const slice=Math.max(1,Math.min(12,Number($('photoFinishSlice')?.value||2)));const center=state.finish.time,start=Math.max(0,center-win/2),end=Math.min(v.duration,center+win/2),frames=Math.max(2,Math.round((end-start)*fps));const width=frames*slice,height=v.videoHeight||360;c.width=width;c.height=height;c.style.aspectRatio=`${width}/${height}`;const ctx=c.getContext('2d');const tmp=document.createElement('canvas');tmp.width=v.videoWidth;tmp.height=v.videoHeight;const tx=tmp.getContext('2d');const original=v.currentTime;const lineX=Math.round(getTrackFinishX()*v.videoWidth);for(let i=0;i<frames;i++){const t=start+(end-start)*i/(frames-1);await seekTo(t);tx.drawImage(v,0,0);const x=Math.max(0,Math.min(tmp.width-slice,lineX-slice/2));ctx.drawImage(tmp,x,0,slice,height,i*slice,0,slice,height)}await seekTo(original);state.photoFinish.url=c.toDataURL('image/png');$('photoFinishDownload').disabled=false;$('photoFinishStatus').textContent='GENERADO';$('photoFinishMeta').textContent=`${frames} muestras · ${(end-start).toFixed(2)} s · línea ${(getTrackFinishX()*100).toFixed(1)}% · ${fps} fps`;}
function bindPhotoFinish(){ $('photoFinishGenerate')?.addEventListener('click',generatePhotoFinish);$('photoFinishBtn')?.addEventListener('click',()=>{openTab('smartcapture');setTimeout(generatePhotoFinish,50)});$('photoFinishDownload')?.addEventListener('click',()=>{if(!state.photoFinish.url)return;const a=document.createElement('a');a.href=state.photoFinish.url;a.download=`ARS_SPRINT_PhotoFinish_${distance()}m.png`;a.click()}) }
function bindCalibration(){ $('calibrateBtn')?.addEventListener('click',runGuidedCalibration); $('saveTrackCalibration')?.addEventListener('click',saveGuidedCalibration); $('distanceSelect')?.addEventListener('change',updateCalibrationUI); updateCalibrationUI(); }
function bindOther(){ bindTrackingOverlay(); bindPhotoFinish(); $('loadBodyAI')?.addEventListener('click',detectBodyAtCurrentFrame); $('autoMeasure')?.addEventListener('click',autoMeasureSprint); $('runCaptureCheck').onclick=runCaptureCheck;$('openEvaluation').onclick=()=>openTab('evaluation'); $('distanceSelect').onchange=()=>{updateResult();renderDashboard()};$('profileSelect').onchange=renderProfile;$('markStart').onclick=()=>mark('start');$('markFinish').onclick=()=>mark('finish');$('resetMarks').onclick=()=>{state.start=state.finish=null;state.gates={};state.vision.manualGates={};state.vision.validatedGates={};updateMarks();updateGates();updateResult();updateAudit()};$('undoMark').onclick=()=>{if(state.finish)state.finish=null;else state.start=null;updateMarks();updateResult()};$('printPdf').onclick=()=>window.print()}
function renderAll(){renderSelects();renderAthletes();renderHistory();renderProfile();renderAttempts();updateMarks();updateResult();dashboardAthletes();renderDashboard()}
document.addEventListener('DOMContentLoaded',()=>{load();bindTabs();bindVideo();bindFps();bindGates();bindSetup();bindSeries();bindSave();bindAthletes();bindHistory();bindBackup();bindCalibration(); bindOther();bindDashboard();bindVision();bindValidation();bindProtocol();renderAll();updateGates();openTab('evaluation');drawTrackingOverlay();updateBodyStatus();bindLiveCamera();});


function bindComparison(){
  const run=$('compareRun'); if(!run)return;
  run.onclick=()=>{
    const a=Number($('compareA').value), b=Number($('compareB').value), te=Number($('compareTE').value);
    const d=Number($('compareDistance').value);
    const out=$('compareResult');
    if(!(a>0&&b>0&&te>=0)){out.textContent='Completa A, B y un error típico válido.';return}
    const change=b-a;
    const pct=(change/a)*100;
    const threshold=1.96*te;
    const magnitude=Math.abs(change);
    const label=magnitude>=threshold && threshold>0 ? (change<0?'Mejora probablemente relevante':'Empeoramiento probablemente relevante') : 'Cambio pequeño / no concluyente';
    out.innerHTML=`<div class="comparison-result">
      <div><span>Cambio</span><b>${change.toFixed(3)} s</b></div>
      <div><span>Cambio relativo</span><b>${pct.toFixed(2)}%</b></div>
      <div><span>Umbral 95% aprox.</span><b>${threshold.toFixed(3)} s</b><small>1.96 × error típico</small></div>
      <div><span>Interpretación</span><b>${label}</b><small>${d} m · no sustituye validación</small></div>
    </div>`;
  };
}

bindComparison();



function computeSeriesStats(){
  const arr=(state.series?.results||[]).map(x=>Number(x.time)).filter(x=>Number.isFinite(x)&&x>0);
  if(arr.length<2)return null;
  const mean=arr.reduce((a,b)=>a+b,0)/arr.length;
  const sd=Math.sqrt(arr.reduce((s,x)=>s+(x-mean)**2,0)/(arr.length-1));
  return {n:arr.length,mean,sd,cv:(sd/mean)*100,best:Math.min(...arr),range:Math.max(...arr)-Math.min(...arr),mdc95:sd*1.96*Math.sqrt(2)};
}

function bindReliability(){
  const run=$('reliabilityRun'); if(!run)return;
  run.onclick=()=>{
    const raw=$('reliabilityTrials').value.split(',').map(x=>Number(x.trim())).filter(x=>Number.isFinite(x)&&x>0);
    const out=$('reliabilityResult');
    if(raw.length<2){out.textContent='Necesitas al menos 2 intentos válidos.';return}
    const mean=raw.reduce((a,b)=>a+b,0)/raw.length;
    const sd=Math.sqrt(raw.reduce((s,x)=>s+(x-mean)**2,0)/(raw.length-1));
    const cv=(sd/mean)*100;
    const range=Math.max(...raw)-Math.min(...raw);
    const mdc=sd*1.96*Math.sqrt(2);
    const best=Math.min(...raw);
    out.innerHTML=`<div class="comparison-result">
      <div><span>Mejor</span><b>${best.toFixed(3)} s</b></div>
      <div><span>Promedio</span><b>${mean.toFixed(3)} s</b></div>
      <div><span>CV</span><b>${cv.toFixed(2)}%</b><small>dispersión relativa</small></div>
      <div><span>Rango</span><b>${range.toFixed(3)} s</b><small>máx − mín</small></div>
    </div>
    <div class="status"><b>MDC aproximado 95%:</b> ${mdc.toFixed(3)} s. Es una referencia estadística de la serie, no una validación externa del instrumento.</div>`;
  };
}

bindReliability();


function bindAgreement(){
  const run=$('agreementRun'); if(!run)return;
  run.onclick=()=>{
    const a=$('agreementA').value.split(',').map(Number).filter(x=>Number.isFinite(x)&&x>0);
    const b=$('agreementB').value.split(',').map(Number).filter(x=>Number.isFinite(x)&&x>0);
    const out=$('agreementResult');
    if(a.length<2||a.length!==b.length){
      out.textContent='Introduce al menos 2 pares válidos y el mismo número de mediciones en ambos métodos.';
      return;
    }
    const dif=a.map((x,i)=>x-b[i]);
    const means=a.map((x,i)=>(x+b[i])/2);
    const bias=dif.reduce((s,x)=>s+x,0)/dif.length;
    const sd=Math.sqrt(dif.reduce((s,x)=>s+(x-bias)**2,0)/(dif.length-1));
    const loa=1.96*sd;
    const lower=bias-loa, upper=bias+loa;
    const absBias=Math.abs(bias);
    const meanAbs=dif.reduce((s,x)=>s+Math.abs(x),0)/dif.length;
    out.innerHTML=`<div class="comparison-result">
      <div><span>Pares</span><b>${a.length}</b></div>
      <div><span>Sesgo medio</span><b>${bias.toFixed(3)} s</b><small>ARS − referencia</small></div>
      <div><span>Error absoluto medio</span><b>${meanAbs.toFixed(3)} s</b></div>
      <div><span>Acuerdo 95% aprox.</span><b>${lower.toFixed(3)} a ${upper.toFixed(3)} s</b><small>límites de acuerdo</small></div>
    </div>
    <div class="status">Interpretación: el sesgo indica si ARS SPRINT tiende a medir más alto o más bajo que el método de referencia. Los límites muestran la dispersión esperada de las diferencias de esta muestra. Para una validación formal se necesita una muestra y protocolo definidos.</div>`;
  };
}

bindAgreement();


function formatSec(v){return Number.isFinite(Number(v))?Number(v).toFixed(3)+' s':'—'}
function athleteName(a){return a?.name||a?.fullName||a?.nombre||a?.athleteName||a?.id||'Sin nombre'}
function historyAthleteId(h){return h?.athleteId??h?.athlete_id??h?.athlete??h?.deportistaId??''}
function historyDistance(h){return Number(h?.distance??h?.testDistance??h?.prueba??h?.meters??0)}
function historyTime(h){return Number(h?.time??h?.result??h?.seconds??h?.bestTime??NaN)}
function historyDate(h){return String(h?.date??h?.createdAt??h?.timestamp??'').slice(0,10)}
function fillReportAthletes(){
  const el=$('reportAthlete'); if(!el)return;
  const athletes=state.db.athletes||[];
  const current=el.value;
  el.innerHTML=athletes.length?athletes.map(a=>`<option value="${String(a.id??a.athleteId??'')}">${athleteName(a)}</option>`).join(''):'<option value="">Sin deportistas</option>';
  if(current && [...el.options].some(o=>o.value===current))el.value=current;
}
function buildAthleteReport(){
  const id=$('reportAthlete')?.value;
  const d=Number($('reportDistance')?.value||20);
  const from=$('reportFrom')?.value||'';
  const to=$('reportTo')?.value||'';
  const out=$('athleteReportResult');
  if(!id){out.textContent='Primero registra o selecciona un deportista.';return}
  const rows=(state.db.history||[]).filter(h=>{
    const same=String(historyAthleteId(h))===String(id);
    const dist=historyDistance(h)===d;
    const date=historyDate(h);
    return same&&dist&&(!from||date>=from)&&(!to||date<=to);
  });
  const times=rows.map(historyTime).filter(x=>Number.isFinite(x)&&x>0);
  if(!times.length){out.textContent='No hay resultados para este deportista, prueba y rango.';return}
  const best=Math.min(...times), mean=times.reduce((a,b)=>a+b,0)/times.length;
  const sd=times.length>1?Math.sqrt(times.reduce((s,x)=>s+(x-mean)**2,0)/(times.length-1)):0;
  const cv=mean?sd/mean*100:0;
  const last=times[times.length-1];
  const improvement=times.length>1?((last-best)/best*100):0;
  const consistency=cv<=2?'Alta':cv<=4?'Moderada':'Variable';
  out.innerHTML=`<div class="comparison-result">
    <div><span>Mejor marca</span><b>${formatSec(best)}</b></div>
    <div><span>Promedio</span><b>${formatSec(mean)}</b></div>
    <div><span>CV</span><b>${cv.toFixed(2)}%</b><small>consistencia: ${consistency}</small></div>
    <div><span>Intentos</span><b>${times.length}</b><small>${d} m</small></div>
  </div>
  <div class="status"><b>Último registro:</b> ${formatSec(last)} · <b>Mejor:</b> ${formatSec(best)} · <b>Diferencia último vs mejor:</b> ${improvement.toFixed(2)}%.<br><small>La ficha resume los datos guardados y no convierte estos indicadores en un diagnóstico científico.</small></div>`;
}
function bindAthleteReport(){
  const b=$('buildReport'); if(!b)return;
  fillReportAthletes();
  b.onclick=buildAthleteReport;
  $('reportAthlete')?.addEventListener('change',buildAthleteReport);
}

bindAthleteReport();


function printAthleteReport(){
  const id=$('reportAthlete')?.value, d=Number($('reportDistance')?.value||20);
  const a=(state.db.athletes||[]).find(x=>String(x.id??x.athleteId??'')===String(id));
  if(!a)return alert('Selecciona un deportista.');
  const rows=(state.db.history||[]).filter(h=>String(historyAthleteId(h))===String(id)&&[5,10,20].includes(historyDistance(h))&&(!d||historyDistance(h)===d));
  const times=rows.map(historyTime).filter(x=>Number.isFinite(x)&&x>0);
  if(!times.length)return alert('No hay resultados para imprimir.');
  const w=window.open('','_blank'); if(!w)return alert('Permite ventanas emergentes para generar la ficha.');
  const best=Math.min(...times), mean=times.reduce((x,y)=>x+y,0)/times.length;
  w.document.write(`<html><head><title>ARS SPRINT — Ficha</title><style>body{font-family:Arial;padding:32px}h1{margin-bottom:4px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.box{border:1px solid #ddd;padding:16px;border-radius:10px}.box b{font-size:22px;display:block;margin-top:6px}</style></head><body><h1>ARS SPRINT 10.0</h1><p><b>Deportista:</b> ${athleteName(a)}<br><b>Prueba:</b> ${d} m<br><b>Registros:</b> ${times.length}</p><div class="grid"><div class="box">Mejor<b>${best.toFixed(3)} s</b></div><div class="box">Promedio<b>${mean.toFixed(3)} s</b></div><div class="box">Último<b>${times[times.length-1].toFixed(3)} s</b></div></div><h2>Historial</h2><ol>${rows.map(h=>`<li>${historyDate(h)||'Sin fecha'} — ${formatSec(historyTime(h))}</li>`).join('')}</ol><script>window.onload=()=>window.print()<\/script></body></html>`);
  w.document.close();
}

$('printReport')?.addEventListener('click',printAthleteReport);


function profileRows(id){
  return (state.db.history||[]).filter(h=>String(historyAthleteId(h))===String(id));
}
function profileStats(rows,d){
  const ts=rows.filter(h=>historyDistance(h)===d).map(historyTime).filter(x=>Number.isFinite(x)&&x>0);
  if(!ts.length)return null;
  const best=Math.min(...ts), mean=ts.reduce((a,b)=>a+b,0)/ts.length;
  const sd=ts.length>1?Math.sqrt(ts.reduce((s,x)=>s+(x-mean)**2,0)/(ts.length-1)):0;
  return {best,mean,sd,cv:mean?sd/mean*100:0,n:ts.length,last:ts[ts.length-1]};
}
function fillProfileAthletes(){
  const el=$('profileAthlete');if(!el)return;
  el.innerHTML=(state.db.athletes||[]).map(a=>`<option value="${String(a.id??a.athleteId??'')}">${athleteName(a)}</option>`).join('')||'<option value="">Sin deportistas</option>';
}
function buildPerformanceProfile(){
  const id=$('profileAthlete')?.value,out=$('performanceProfileResult');
  if(!id){out.textContent='Primero registra un deportista.';return}
  const rows=profileRows(id), s5=profileStats(rows,5),s10=profileStats(rows,10),s20=profileStats(rows,20);
  const vals=[s5,s10,s20].filter(Boolean);
  if(!vals.length){out.textContent='No hay resultados suficientes para construir el perfil.';return}
  const bestAll=Math.min(...vals.map(x=>x.best));
  const mostConsistent=vals.slice().sort((a,b)=>a.cv-b.cv)[0];
  const cards=[[5,s5],[10,s10],[20,s20]].map(([d,s])=>s?`<div class="profile-card"><span>${d} m</span><b>${s.best.toFixed(3)} s</b><small>Promedio ${s.mean.toFixed(3)} s · CV ${s.cv.toFixed(2)}% · ${s.n} registros</small></div>`:`<div class="profile-card"><span>${d} m</span><b>Sin datos</b><small>Registra al menos un intento.</small></div>`).join('');
  const coverage=Math.round(vals.length/3*100);
  out.innerHTML=`<div class="profile-grid">${cards}</div><div class="status"><b>Cobertura:</b> ${coverage}% · <b>Mayor consistencia:</b> ${mostConsistent===s5?'5 m':mostConsistent===s10?'10 m':'20 m'} (CV ${mostConsistent.cv.toFixed(2)}%).<br><small>El perfil resume rendimiento registrado; no es una clasificación normativa ni un diagnóstico.</small></div>`;
}
function bindPerformanceProfile(){
  const b=$('buildProfile');if(!b)return;
  fillProfileAthletes();
  b.onclick=()=>{buildPerformanceProfile();renderAthleteInterpretation();};
}

bindPerformanceProfile();


function renderAthleteInterpretation(){
  const id=$('profileAthlete')?.value,out=$('athleteInterpretationResult');
  if(!id){if(out)out.textContent='Selecciona un deportista.';return}
  const rows=profileRows(id), ss=[5,10,20].map(d=>({d,s:profileStats(rows,d)}));
  const valid=ss.filter(x=>x.s);
  if(!valid.length){out.textContent='No hay datos suficientes.';return}
  const byBest=valid.slice().sort((a,b)=>a.s.best-b.s.best);
  const byCV=valid.slice().sort((a,b)=>a.s.cv-b.s.cv);
  const first=valid.map(x=>x.s).reduce((m,s)=>Math.max(m,s.n),0);
  const cards=ss.map(x=>x.s?`<div class="interpret-card"><span>${x.d} m</span><b>${x.s.cv<=2?'Serie estable':x.s.cv<=4?'Variación moderada':'Variación alta'}</b><small>CV ${x.s.cv.toFixed(2)}% · mejor ${x.s.best.toFixed(3)} s</small></div>`:`<div class="interpret-card"><span>${x.d} m</span><b>Sin datos</b><small>Registra intentos para interpretar.</small></div>`).join('');
  const strongest=byBest[0], consistent=byCV[0];
  out.innerHTML=`<div class="interpret-grid">${cards}</div>
  <div class="status"><b>Mejor marca relativa del perfil:</b> ${strongest.d} m (${strongest.s.best.toFixed(3)} s). 
  <b>Mayor consistencia:</b> ${consistent.d} m (CV ${consistent.s.cv.toFixed(2)}%).<br>
  <small>Esta interpretación compara al deportista consigo mismo. No clasifica “bueno/excelente” y no sustituye normas por edad, sexo o población deportiva.</small></div>`;
}


function getFrameRefinementSettings(){
  return {
    windowFrames:Math.max(1,Math.min(5,Number($('frameWindow')?.value||2))),
    criterion:$('frameCriterion')?.value||'median',
    minConfirm:Math.max(1,Math.min(10,Number($('frameConfirmMin')?.value||2)))
  };
}
function refineFrameCandidates(candidates,fps){
  const valid=(candidates||[]).map(Number).filter(Number.isFinite).sort((a,b)=>a-b);
  if(!valid.length||!(fps>0))return null;
  const s=getFrameRefinementSettings();
  const chosen=s.criterion==='first'?valid[0]:valid[Math.floor((valid.length-1)/2)];
  return {frame:chosen,time:chosen/fps,candidates:valid,windowFrames:s.windowFrames,minConfirm:s.minConfirm};
}


function interpolateCrossing(prevFrame,prevPos,nextFrame,nextPos,fps){
  prevFrame=Number(prevFrame); prevPos=Number(prevPos); nextFrame=Number(nextFrame); nextPos=Number(nextPos); fps=Number(fps);
  if(![prevFrame,prevPos,nextFrame,nextPos,fps].every(Number.isFinite)||fps<=0||nextFrame<=prevFrame||prevPos===nextPos)return null;
  const alpha=(0-prevPos)/(nextPos-prevPos);
  if(alpha<0||alpha>1)return null;
  const frame=prevFrame+alpha*(nextFrame-prevFrame);
  return {alpha,frame,time:frame/fps,deltaFromPrevFrames:alpha*(nextFrame-prevFrame)};
}
function bindCrossingInterpolation(){
  const b=$('crossInterpolateRun'); if(!b)return;
  b.onclick=()=>{
    const r=interpolateCrossing($('crossPrevFrame').value,$('crossPrevPos').value,$('crossNextFrame').value,$('crossNextPos').value,$('crossFps').value);
    const out=$('crossInterpolationResult');
    if(!r){out.textContent='Datos inválidos o el cruce 0 no está entre ambos frames.';return}
    out.innerHTML=`<div class="comparison-result">
      <div><span>Fracción entre frames</span><b>${(r.alpha*100).toFixed(1)}%</b></div>
      <div><span>Frame estimado</span><b>${r.frame.toFixed(3)}</b></div>
      <div><span>Tiempo desde inicio</span><b>${r.time.toFixed(4)} s</b></div>
      <div><span>Sub-frame</span><b>${r.deltaFromPrevFrames.toFixed(3)} frame</b></div>
    </div>
    <div class="status">Método: interpolación lineal entre la posición del torso en los dos frames que rodean la línea. La exactitud final depende de la detección de la posición y del protocolo.</div>`;
  };
}

bindCrossingInterpolation();


function scoreEventEvidence(data){
  let score=0, notes=[];
  if(data.fps>=240){score+=35;notes.push('240+ FPS')}
  else if(data.fps>=120){score+=30;notes.push('120+ FPS')}
  else if(data.fps>=60){score+=20;notes.push('60+ FPS')}
  else {score+=10;notes.push('FPS bajo')}
  if(data.bracketed){score+=30;notes.push('cruce entre dos frames')}
  if(data.visualQuality==='alta'){score+=25;notes.push('calidad visual alta')}
  else if(data.visualQuality==='media'){score+=15;notes.push('calidad visual media')}
  else {score+=5;notes.push('calidad visual baja')}
  const label=score>=80?'Alta':score>=60?'Adecuada':score>=40?'Limitada':'Insuficiente';
  return {score,label,notes};
}
function analyzeEventEvidence(){
  const out=$('eventEvidenceResult');
  const prevF=Number($('evidencePrevFrame')?.value), prevP=Number($('evidencePrevPos')?.value);
  const nextF=Number($('evidenceNextFrame')?.value), nextP=Number($('evidenceNextPos')?.value);
  const fps=Number($('evidenceFps')?.value), quality=$('evidenceVisualQuality')?.value||'media';
  const r=interpolateCrossing(prevF,prevP,nextF,nextP,fps);
  if(!r){out.textContent='No se puede confirmar el cruce: revisa frames, posiciones y FPS.';return null}
  const q=scoreEventEvidence({fps,bracketed:true,visualQuality:quality});
  const resolution=1/fps;
  out.innerHTML=`<div class="comparison-result">
    <div><span>Frame estimado</span><b>${r.frame.toFixed(3)}</b></div>
    <div><span>Tiempo</span><b>${r.time.toFixed(4)} s</b><small>desde frame 0</small></div>
    <div><span>Resolución temporal</span><b>${resolution.toFixed(4)} s</b><small>1 / FPS</small></div>
    <div><span>Calidad del evento</span><b>${q.label}</b><small>${q.score}/100</small></div>
  </div>
  <div class="status"><b>Evidencia:</b> cruce interpolado entre frames ${prevF} y ${nextF}. <b>Criterio:</b> posición del torso respecto a la línea. ${q.notes.join(' · ')}.<br><small>La puntuación es un control interno de calidad, no una probabilidad de acierto ni una validación científica.</small></div>`;
  return {interpolation:r,quality:q,resolution};
}
function bindEventEvidence(){
  $('evidenceAnalyze')?.addEventListener('click',analyzeEventEvidence);
}

bindEventEvidence();


function findBracketFromSeries(series,gateTime,fps){
  if(!Array.isArray(series)||series.length<3||!(fps>0))return null;
  const threshold=Number($('bracketThreshold')?.value||1.5);
  const window=Number($('bracketWindow')?.value||0.5);
  const candidates=series.filter(x=>Math.abs(x.t-gateTime)<=window);
  if(candidates.length<3)return null;
  const baseVals=candidates.map(x=>x.score).sort((a,b)=>a-b);
  const base=baseVals[Math.floor(baseVals.length*0.25)]||0;
  const event=candidates.reduce((best,x)=>x.score>best.score?x:best,candidates[0]);
  if(!(event.score>=base*threshold))return null;
  const idx=series.indexOf(event);
  const prev=series[Math.max(0,idx-1)], next=series[Math.min(series.length-1,idx+1)];
  if(!prev||!next||prev===next)return null;
  const denom=next.score-prev.score;
  const alpha=denom!==0?Math.max(0,Math.min(1,(event.score-prev.score)/denom)):0.5;
  const t=prev.t+alpha*(next.t-prev.t);
  return {time:t,prev,next,event,baseline:base,ratio:base?event.score/base:0,alpha};
}
function renderAutoBracket(rows){
  const out=$('autoBracketResult'); if(!out)return;
  if(!rows.length){out.textContent='No se encontró un evento suficientemente claro. Revisa calibración, iluminación, cámara y umbral.';return}
  out.innerHTML=`<div class="comparison-result">${rows.map(r=>`<div><span>${r.g} m</span><b>${r.time.toFixed(4)} s</b><small>frames ${r.prevFrame} → ${r.nextFrame} · ${r.ratio.toFixed(2)}× base</small></div>`).join('')}</div>
  <div class="status">Los tiempos son candidatos de visión y requieren revisión visual antes de validarse.</div>`;
}


function confirmEventMultiCue(e){
  const gap=Number($('cueGap')?.value||2), need=Number($('cueAgreement')?.value||3);
  const cues={
    motion:!!e.motion,
    gate:!!e.gate,
    continuity:!!e.continuity
  };
  const score=Object.values(cues).filter(Boolean).length;
  const ok=score>=need && Number.isFinite(e.prevFrame) && Number.isFinite(e.nextFrame) && (e.nextFrame-e.prevFrame)<=gap;
  return {ok,score,total:3,need,gap,cues};
}
function renderMultiCue(e){
  const out=$('multiCueResult'); if(!out)return;
  const r=confirmEventMultiCue(e);
  out.innerHTML=`<div class="comparison-result">
    <div><span>Criterios cumplidos</span><b>${r.score}/3</b></div>
    <div><span>Separación</span><b>${Number.isFinite(e.prevFrame)&&Number.isFinite(e.nextFrame)?(e.nextFrame-e.prevFrame):'—'} frame(s)</b></div>
    <div><span>Estado</span><b>${r.ok?'VALIDABLE':'REVISAR'}</b></div>
  </div><div class="status">Movimiento: ${r.cues.motion?'✓':'—'} · Puerta: ${r.cues.gate?'✓':'—'} · Continuidad: ${r.cues.continuity?'✓':'—'}.</div>`;
  return r;
}


function findCentroidCrossing(series,gateX,fps){
  if(!Array.isArray(series)||series.length<2)return null;
  for(let i=1;i<series.length;i++){
    const a=series[i-1],b=series[i];
    if(a.centroid==null||b.centroid==null||a.score==null||b.score==null)continue;
    if(Math.min(a.centroid,b.centroid)<=gateX && Math.max(a.centroid,b.centroid)>=gateX){
      const den=b.centroid-a.centroid;
      if(den===0)continue;
      const alpha=Math.max(0,Math.min(1,(gateX-a.centroid)/den));
      return {prev:a,next:b,alpha,time:a.t+alpha*(b.t-a.t),frame:(a.t+alpha*(b.t-a.t))*fps,score:Math.max(a.score,b.score),method:'visual-centroid-crossing'};
    }
  }
  return null;
}


let poseAiTask=null,poseAiLoading=null;
function poseScore(lm){if(!lm||!lm.length)return 0;const ids=[0,11,12,23,24,25,26,27,28];const vals=ids.map(i=>lm[i]).filter(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y));if(!vals.length)return 0;return vals.reduce((s,p)=>s+(p.visibility??1),0)/vals.length;}
function chooseLivePose(poses){
  const list=(poses||[]).map((lm,index)=>{
    const t=torsoFromLandmarks(lm); if(!t)return null;
    const xs=lm.map(p=>p?.x).filter(Number.isFinite),ys=lm.map(p=>p?.y).filter(Number.isFinite);
    const area=xs.length?(Math.max(...xs)-Math.min(...xs))*(Math.max(...ys)-Math.min(...ys)):0;
    const score=poseScore(lm);
    const feet=[lm[27],lm[28]].filter(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y));
    return {lm,t,index,score,area,feetVisible:feet.length/2};
  }).filter(Boolean).filter(p=>p.score>=.28);
  if(!list.length)return null;
  const lock=state.live?.lockPoint;
  if(lock){
    list.sort((a,b)=>{
      const da=(a.t.x-lock.x)**2+(a.t.y-lock.y)**2,db=(b.t.x-lock.x)**2+(b.t.y-lock.y)**2;
      return (da-db)*6+(b.score-a.score)*1.5+(b.area-a.area)*.35+(b.feetVisible-a.feetVisible)*.4;
    });
  }else{
    list.sort((a,b)=>(b.score-a.score)*1.5+(b.area-a.area)*.35+(b.feetVisible-a.feetVisible)*.4);
  }
  return list[0];
}
async function loadPoseAI(){
  const status=$('poseAiStatus'),liveStatus=$('livePoseStatus');
  if(poseAiTask){if(liveStatus)liveStatus.textContent='🧠 IA corporal: lista ✓';return poseAiTask}
  if(poseAiLoading)return poseAiLoading;
  if(status)status.textContent='Cargando modelo de pose…';if(liveStatus)liveStatus.textContent='🧠 IA corporal: cargando…';
  poseAiLoading=(async()=>{try{
    const mod=await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14');
    const vision=await mod.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm');
    const models=['https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/1/pose_landmarker_full.task','https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'];let lastErr=null;
    const options={runningMode:'VIDEO',numPoses:3,minPoseDetectionConfidence:.28,minPosePresenceConfidence:.28,minTrackingConfidence:.30};
    for(const modelAssetPath of models){try{poseAiTask=await mod.PoseLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath,delegate:'GPU'},...options});break}catch(e){lastErr=e;try{poseAiTask=await mod.PoseLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath},...options});break}catch(e2){lastErr=e2}}}
    if(!poseAiTask)throw lastErr||new Error('No se pudo crear PoseLandmarker');
    if(status)status.textContent='✓ IA de pose cargada.';if(liveStatus)liveStatus.textContent='🧠 IA corporal: lista ✓';return poseAiTask;
  }catch(err){poseAiLoading=null;if(status)status.textContent='❌ IA no disponible · toca Reintentar IA';if(liveStatus)liveStatus.textContent='❌ IA corporal: no disponible';console.error(err);throw err}})();return poseAiLoading}
function torsoFromLandmarks(lm){
  if(!lm||lm.length<25)return null;
  const ids=[11,12,23,24,0,25,26,27,28]; // hombros + caderas + cabeza + piernas
  const pts=ids.map(i=>lm[i]).filter(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&(p.visibility??1)>=.12);
  if(pts.length<2)return null;
  return {x:pts.reduce((s,p)=>s+p.x,0)/pts.length,y:pts.reduce((s,p)=>s+p.y,0)/pts.length,
    visibility:pts.reduce((s,p)=>s+(p.visibility??1),0)/pts.length};
}
async function analyzePoseGate(gateDistance,proposal,fps){
  if(!proposal)return null;
  const v=$('video'), c=document.createElement('canvas'),ctx=c.getContext('2d');
  const w=320,h=Math.max(120,Math.round(320*v.videoHeight/v.videoWidth));c.width=w;c.height=h;
  const original=v.currentTime,center=proposal.time,half=Math.min(.75,Math.max(.25,Number($('bracketWindow')?.value||.5)));
  const step=1/fps, arr=[];
  for(let t=Math.max(0,center-half);t<=Math.min(v.duration,center+half);t+=step){
    await seekTo(t);ctx.drawImage(v,0,0,w,h);
    const result=poseAiTask.detectForVideo(c,Math.round(t*1000));
    const lm=result?.landmarks?.[0], torso=torsoFromLandmarks(lm);
    if(torso)arr.push({t,x:torso.x,visibility:torso.visibility});
  }
  await seekTo(original);
  if(arr.length<2)return null;
  const gateX=Number(state.vision.positions[String(gateDistance)]);
  for(let i=1;i<arr.length;i++){
    const a=arr[i-1],b=arr[i];
    if((a.x-gateX)*(b.x-gateX)<=0 && a.x!==b.x){
      const alpha=Math.max(0,Math.min(1,(gateX-a.x)/(b.x-a.x)));
      return {time:a.t+alpha*(b.t-a.t),prev:a,next:b,visibility:(a.visibility+b.visibility)/2,frames:arr.length,method:'pose-torso-interpolation'};
    }
  }
  return null;
}
async function analyzePoseAll(){
  const status=$('poseAiStatus'),out=$('poseAiResult');
  try{
    const task=await loadPoseAI(),fps=activeFps();
    if(!fps)return alert('Declara el FPS real antes de analizar pose.');
    const proposals=state.vision.proposals||{};
    const rows=[];
    for(const g of [5,10,20]){
      const r=await analyzePoseGate(g,proposals[String(g)],fps);
      if(r){
        const conf=Math.round(Math.min(98,65+r.visibility*25+(r.frames>=5?8:3)));
        state.vision.proposals[String(g)]={...(proposals[String(g)]||{}),time:r.time,confidence:conf,
          evidence:{...(proposals[String(g)]?.evidence||{}),poseDetected:true,poseVisibility:r.visibility,method:r.method,
            prevFrame:Math.round(r.prev.t*fps),nextFrame:Math.round(r.next.t*fps)}};
        rows.push({g,time:r.time,confidence:conf,visibility:r.visibility,prevFrame:Math.round(r.prev.t*fps),nextFrame:Math.round(r.next.t*fps)});
      }else rows.push({g,time:null,confidence:0,visibility:0,prevFrame:null,nextFrame:null});
    }
    const good=rows.filter(r=>r.time!=null).length;
    status.textContent=`✓ Análisis terminado · ${good}/3 puertas con torso detectado.`;
    out.innerHTML=`<div class="comparison-result">${rows.map(r=>`<div><span>${r.g} m</span><b>${r.time==null?'Sin cruce':r.time.toFixed(4)+' s'}</b><small>${r.time==null?'Revisar vídeo':`visibilidad ${(r.visibility*100).toFixed(0)}% · F${r.prevFrame}→F${r.nextFrame}`}</small></div>`).join('')}</div>
    <div class="status">La IA de pose usa hombros + caderas como estimación del centro del torso. No se presenta como equivalente validado a Photo Finish.</div>`;
    renderVisionResults(rows.filter(r=>r.time!=null).map(r=>({...r,method:'pose-torso-interpolation',ratio:1})));
    updateAudit();
    return rows;
  }catch(e){status.textContent='No se pudo completar el análisis de pose.';out.textContent=e.message||'Error';}
}


document.querySelector('#poseAiLoad')?.addEventListener('click',()=>loadPoseAI()); document.querySelector('#poseAiAnalyze')?.addEventListener('click',analyzePoseAll);


async function reviewEventEvidence(){
  const v=$('video'),out=$('reviewEventFrames'),status=$('reviewEventStatus');
  if(!v?.duration){status.textContent='Carga un vídeo primero.';return}
  const gate=$('reviewGate')?.value||'10', p=state.vision.proposals?.[gate], fps=activeFps();
  if(!p||!Number.isFinite(p.time)){status.textContent='Primero analiza el vídeo para obtener un candidato.';return}
  if(!fps){status.textContent='Declara el FPS real del vídeo.';return}
  const centerFrame=Math.round(p.time*fps), half=Math.max(1,Number($('reviewWindow')?.value||4));
  const frames=[centerFrame-half,centerFrame-1,centerFrame,centerFrame+1,centerFrame+half].filter(f=>f>=0);
  const original=v.currentTime; out.innerHTML='';
  for(const f of frames){
    const t=Math.min(v.duration,Math.max(0,f/fps));
    await seekTo(t);
    const c=document.createElement('canvas');
    c.width=Math.max(320,v.videoWidth||640);c.height=Math.max(180,v.videoHeight||360);
    c.getContext('2d').drawImage(v,0,0,c.width,c.height);
    const card=document.createElement('div');card.className='event-frame-card';
    card.appendChild(c);
    const tag=document.createElement('b');
    tag.textContent=f===centerFrame?'🎯 EVENTO ESTIMADO':(f<centerFrame?'Frame anterior':'Frame posterior');
    const meta=document.createElement('small');
    meta.textContent=`Frame ${f} · ${t.toFixed(4)} s`;
    card.appendChild(tag);card.appendChild(meta);out.appendChild(card);
  }
  await seekTo(original);
  status.textContent=`Evidencia mostrada para ${gate} m · frame candidato ${centerFrame}.`;
}

document.querySelector('#reviewEventRun')?.addEventListener('click',reviewEventEvidence);

function runFinalAudit(){
  const p=state.vision?.protocol||{};
  const fps=Number(p.fps||0);
  const proto=!!p.startType&&!!p.cameraSide&&fps>0;
  const capture=fps>=60 && p.cameraSide==='Lateral' && p.calibration==='confirmada';
  const props=state.vision?.proposals||{};
  const gates=[5,10,20].map(g=>props[String(g)]);
  const evidence=gates.filter(x=>x?.evidence?.prevFrame!=null&&x?.evidence?.nextFrame!=null).length;
  const result=gates.filter(x=>Number.isFinite(x?.time)).length;
  $('finalProtocolState')?.replaceChildren(document.createTextNode(proto?'OK':'REVISAR'));
  $('finalCaptureState')?.replaceChildren(document.createTextNode(capture?'OK':'REVISAR'));
  $('finalEvidenceState')?.replaceChildren(document.createTextNode(`${evidence}/3`));
  $('finalResultState')?.replaceChildren(document.createTextNode(`${result}/3`));
  const c=$('finalChecklist');
  if(c)c.innerHTML=`<b>Checklist:</b> protocolo ${proto?'✓':'—'} · captura ${capture?'✓':'—'} · evidencia ${evidence}/3 · resultados ${result}/3.<br><small>Control interno de preparación; no es una certificación de exactitud.</small>`;
  return {proto,capture,evidence,result};
}

/* ARS SPRINT — LIVE UNIFIED CAMERA ENGINE V15 */
state.live=state.live||{stream:null,armed:false,running:false,lastX:null,lastT:null,startTime:null,finishTime:null,observedFps:0,frames:0,body:null,landmarks:[],poses:[],targetPose:null,lockPoint:null,raf:0,poseBusy:false,sourceFps:null,width:0,height:0,direction:null,armedAt:0,lastMediaTime:null,lastPerf:0,ring:[],ringMax:300,ringSlice:2,ringHeight:360,photoUrl:null};
function liveDistanceX(){return Number.isFinite(state.track.finishX)?state.track.finishX:.88}
function liveSetStatus(text){$('liveInstruction')&&($('liveInstruction').textContent=text)}
function videoContentRect(v){const r=v.getBoundingClientRect(),vw=v.videoWidth||1,vh=v.videoHeight||1,scale=Math.min(r.width/vw,r.height/vh),cw=vw*scale,ch=vh*scale;return{left:(r.width-cw)/2,top:(r.height-ch)/2,width:cw,height:ch}}
function liveDraw(){
  const a=athlete($('athleteSelect')?.value),d=Number(distance());
  if($('liveAthleteChip'))$('liveAthleteChip').textContent=a?`Deportista: ${a.name} · ${d} m`:'Deportista: —';
  if($('liveGuideFinish'))$('liveGuideFinish').textContent=`🏁 FINAL = ${d.toFixed(2)} m`;
  if($('liveCalibrationText'))$('liveCalibrationText').textContent=`Objetivo ${d.toFixed(2)} m. Usa las guías 0/5/10/20 m para encuadrar y coloca físicamente las marcas en la pista.`;
  const v=$('liveVideo'),c=$('liveOverlay');if(!v||!c||!v.videoWidth)return;
  const r=v.getBoundingClientRect(),w=r.width,h=r.height,dpr=devicePixelRatio||1;
  c.width=Math.max(1,Math.round(w*dpr));c.height=Math.max(1,Math.round(h*dpr));
  const ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  const cr=videoContentRect(v),sx=cr.left+(state.track.startX??.12)*cr.width,fx=cr.left+liveDistanceX()*cr.width;
  // Perspective track guide: 0/5/10/20 m remain visible; selected finish is emphasized.
  const total=d, marks=[0,5,10,20].filter(m=>m<=total);
  const endRatio=Math.max(.2,Math.min(1,(fx-sx)/Math.max(1,cr.width*(1-(state.track.startX??.12)))));
  const finishNorm=(fx-sx)/Math.max(1,cr.width);
  const topY=cr.top+cr.height*.36,bottomY=cr.top+cr.height*.86;
  const x0=sx,x20=fx;
  const visibleMax=Math.max(1,total);
  const xAt=(m)=>x0+(x20-x0)*(m/visibleMax);
  // Ground plane / lane trapezoid, similar to a track projection overlay.
  ctx.save();
  // V21: no translucent fill over live camera; preserve natural exposure and visibility.
  ctx.strokeStyle='rgba(255,208,0,.85)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x0,bottomY);ctx.lineTo(x20,bottomY);ctx.lineTo(x20,topY);ctx.moveTo(x0,bottomY);ctx.lineTo(x0+(x20-x0)*.06,topY);ctx.stroke();
  // Distance lines.
  for(const m of marks){
    const x=xAt(m),selected=Math.abs(m-total)<.01 || (m===5&&total===5) || (m===10&&total===10) || (m===20&&total===20);
    ctx.strokeStyle=selected?'#20d68b':'rgba(255,208,0,.78)';ctx.lineWidth=selected?4:2;ctx.setLineDash(selected?[]:[9,9]);
    ctx.beginPath();ctx.moveTo(x,cr.top);ctx.lineTo(x,cr.top+cr.height);ctx.stroke();ctx.setLineDash([]);
    const yy=bottomY-5;
    ctx.fillStyle=selected?'#0fa66c':'rgba(17,17,17,.9)';ctx.beginPath();ctx.arc(x,yy,28,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#fff';ctx.font='800 13px sans-serif';ctx.textAlign='center';ctx.fillText(`${m}m`,x,yy+5);
    ctx.fillStyle=selected?'#20d68b':'#ffd000';ctx.font='800 11px sans-serif';ctx.fillText(m===0?'SALIDA':m===total?'FINAL':'SPLIT',x,yy-35);ctx.textAlign='start';
  }
  // Direction arrows along the projected running corridor.
  ctx.fillStyle='rgba(255,208,0,.95)';ctx.font='900 24px sans-serif';ctx.textAlign='center';
  for(let i=1;i<5;i++){const ax=x0+(x20-x0)*(i/5);ctx.fillText('›',ax,cr.top+cr.height*.73)}ctx.textAlign='start';
  // Selected start/final labels.
  for(const L of [{x:sx,label:'🟢 INICIO · 0.00 m',stroke:'#20d68b'},{x:fx,label:`🏁 FINAL · ${total.toFixed(2)} m`,stroke:'#fff'}]){
    const bw=Math.min(190,w-8),bx=Math.max(4,Math.min(w-bw,L.x+7));ctx.fillStyle='rgba(10,10,10,.72)';ctx.fillRect(bx,cr.top+12,bw,27);ctx.fillStyle=L.stroke;ctx.font='900 13px sans-serif';ctx.fillText(L.label,bx+9,cr.top+33);
  }
  const mid=(sx+fx)/2;ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(sx,cr.top+cr.height-68);ctx.lineTo(fx,cr.top+cr.height-68);ctx.stroke();
  ctx.fillStyle='rgba(10,10,10,.68)';ctx.fillRect(Math.max(4,mid-52),cr.top+cr.height-88,104,22);ctx.fillStyle='#fff';ctx.font='900 12px sans-serif';ctx.textAlign='center';ctx.fillText(`${total.toFixed(2)} m`,mid,cr.top+cr.height-75);ctx.textAlign='start';
  // Body skeleton / tracking point.
  const lm=state.live.landmarks||[];const pairs=[[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28]];
  if(lm.length){ctx.strokeStyle='#20d68b';ctx.lineWidth=3;for(const [i,j] of pairs){const a=lm[i],b=lm[j];if(a&&b&&(a.visibility??1)>.25&&(b.visibility??1)>.25){ctx.beginPath();ctx.moveTo(cr.left+a.x*cr.width,cr.top+a.y*cr.height);ctx.lineTo(cr.left+b.x*cr.width,cr.top+b.y*cr.height);ctx.stroke()}}}
  const b=state.live.body;if(b){const x=cr.left+b.x*cr.width,y=cr.top+b.y*cr.height;ctx.beginPath();ctx.arc(x,y,13,0,Math.PI*2);ctx.strokeStyle='#20d68b';ctx.lineWidth=4;ctx.stroke();ctx.beginPath();ctx.moveTo(x-22,y);ctx.lineTo(x+22,y);ctx.moveTo(x,y-22);ctx.lineTo(x,y+22);ctx.stroke();ctx.fillStyle='rgba(17,17,17,.94)';ctx.fillRect(Math.min(w-185,x+15),Math.max(cr.top+50,y-16),175,28);ctx.fillStyle='#20d68b';ctx.font='900 12px sans-serif';ctx.fillText(`🧍 ${athlete($('athleteSelect')?.value)?.name||'ATLETA'} · ${(b.visibility*100).toFixed(0)}%`,Math.min(w-178,x+20),y+3)}
  ctx.restore();
}
function liveUpdateKpis(){if($('liveFps'))$('liveFps').textContent=(state.live.observedFps||state.live.sourceFps)?(state.live.observedFps||state.live.sourceFps).toFixed(1)+' fps':'—';if($('liveObservedFps'))$('liveObservedFps').textContent=state.live.observedFps?state.live.observedFps.toFixed(1)+' fps':'—';if($('liveBodyState'))$('liveBodyState').textContent=state.live.body?(state.live.body.visibility>=.35?'🟢 '+(athlete($('athleteSelect')?.value)?.name||'Atleta'):'🟡 Atleta detectado · baja confianza'):'🔴 No detectado';if($('liveMeasureState'))$('liveMeasureState').textContent=state.live.finishTime!=null?'FINALIZADO':state.live.startTime!=null?'CORRIENDO':state.live.armed?'ARMADO':'Listo'}
function liveFrameTimestamp(meta){if(meta&&Number.isFinite(meta.mediaTime))return meta.mediaTime;const v=$('liveVideo');return Number.isFinite(v.currentTime)?v.currentTime:performance.now()/1000}
function liveCaptureSlice(){const v=$('liveVideo');if(!v.videoWidth||!v.videoHeight)return;const h=state.live.ringHeight,w=320,tmp=document.createElement('canvas');tmp.width=w;tmp.height=h;const tx=tmp.getContext('2d',{willReadFrequently:true});tx.drawImage(v,0,0,w,h);const slice=Math.max(1,Math.min(4,state.live.ringSlice));const x=Math.max(0,Math.min(w-slice,Math.round(liveDistanceX()*w-slice/2)));const data=tx.getImageData(x,0,slice,h);state.live.ring.push({data:data.data.slice(),width:slice,height:h,time:state.live.lastMediaTime??v.currentTime});if(state.live.ring.length>state.live.ringMax)state.live.ring.shift()}
function buildLivePhotoFinish(){const ring=state.live.ring;if(ring.length<2)return null;const slice=ring[0].width,h=ring[0].height,c=$('liveFinishCanvas')||$('photoFinishCanvas');if(!c)return null;c.width=ring.length*slice;c.height=h;const ctx=c.getContext('2d');for(let i=0;i<ring.length;i++)ctx.putImageData(new ImageData(new Uint8ClampedArray(ring[i].data),slice,h),i*slice,0);const url=c.toDataURL('image/png');state.live.photoUrl=url;if($('liveFinishStatus'))$('liveFinishStatus').textContent=`GENERADO · ${ring.length} muestras`;if($('photoFinishStatus'))$('photoFinishStatus').textContent='GENERADO';if($('photoFinishMeta'))$('photoFinishMeta').textContent=`En vivo · ${ring.length} muestras · ${state.live.sourceFps?state.live.sourceFps.toFixed(1):'—'} fps · línea final ${Math.round(liveDistanceX()*100)}%`;return url}
function updateCalibrationUI(){const d=distance();state.calibration.target=d;if($('calTarget'))$('calTarget').textContent=d.toFixed(2)+' m';if($('liveCalibrationText'))$('liveCalibrationText').textContent=`Objetivo ${d.toFixed(2)} m. La cámara te guía usando una referencia física visible y comprueba encuadre, atleta, inicio y final.`;if($('calibrationState'))$('calibrationState').textContent=state.calibration.saved?'CALIBRACIÓN GUARDADA':state.calibration.estimated?'ESTIMADA':'Pendiente';if($('calQuality'))$('calQuality').textContent=state.calibration.saved?`${d.toFixed(2)} m · Guardada`:state.calibration.quality==='Guía preparada'?'Guía preparada · confirma marcas físicas':'No calibrado';}
function runGuidedCalibration(){if(!state.live.stream)return alert('Abre la cámara primero.');const d=distance();state.calibration.target=d;state.calibration.estimated=null;state.calibration.quality='Guía preparada';state.calibration.saved=false;updateCalibrationUI();if($('calGuide'))$('calGuide').innerHTML=`<b>Objetivo: ${d.toFixed(2)} m.</b> Coloca físicamente las marcas de INICIO y FINAL a ${d.toFixed(2)} m. Usa una referencia visible de tamaño conocido para que la cámara pueda comprobar escala y encuadre. Cuando ambas zonas sean visibles, ajusta las líneas sobre la pista.`;if($('saveTrackCalibration'))$('saveTrackCalibration').disabled=false;liveSetStatus(`📏 CALIBRACIÓN ${d} m · sigue la guía y revisa las líneas sobre el vídeo.`)}
function saveGuidedCalibration(){const d=distance();state.db.trackCalibration=state.db.trackCalibration||{};state.db.trackCalibration[String(d)]={distance:d,createdAt:new Date().toISOString(),camera:state.live.cameraFacing||null,fps:state.live.sourceFps||null,resolution:`${state.live.width||0}×${state.live.height||0}`};state.calibration.saved=true;save();updateCalibrationUI();if($('calGuide'))$('calGuide').innerHTML=`<b>🟢 Pista ${d.toFixed(2)} m guardada.</b> En próximas pruebas puedes reutilizar esta configuración y volver a verificar cámara/FPS/encuadre antes de medir.`;}
async function startLiveCamera(){
  if(!navigator.mediaDevices?.getUserMedia){alert('Este navegador no permite acceso a la cámara. Abre ARS SPRINT desde HTTPS y permite la cámara.');return}
  try{
    stopLiveCamera(false);
    const facing=$('cameraFacing')?.value||'environment';
    const primary={audio:false,video:{facingMode:{ideal:facing},width:{ideal:1920},height:{ideal:1080},frameRate:{ideal:60,max:120}}};
    let stream;
    try{stream=await navigator.mediaDevices.getUserMedia(primary)}catch(e){stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:facing}}})}
    state.live.stream=stream;
    const v=$('liveVideo');
    v.setAttribute('playsinline',''); v.muted=true; v.autoplay=true; v.srcObject=stream;
    await new Promise(resolve=>{if(v.readyState>=2)resolve();else v.addEventListener('loadedmetadata',resolve,{once:true})});
    await v.play();
    const track=stream.getVideoTracks()[0],settings=track.getSettings();
    state.live.cameraFacing=settings.facingMode||facing;
    state.live.sourceFps=Number(settings.frameRate)||null;
    state.fps=state.live.sourceFps;
    state.live.width=Number(settings.width)||v.videoWidth;
    state.live.height=Number(settings.height)||v.videoHeight;
    state.live.armed=false;state.live.running=true;state.live.startTime=null;state.live.finishTime=null;state.live.direction=null;state.live.armedAt=0;state.live.lastMediaTime=null;state.live.lastPerf=0;state.live.observedFps=0;state.live.ring=[];state.live.body=null;state.live.landmarks=[];state.live.poses=[];state.live.targetPose=null;state.live.lockPoint=null;state.start=null;state.finish=null;state.track.torso=null;state.track.auto=false;
    $('liveStatus').textContent='CÁMARA ACTIVA'; $('liveStage')?.classList.add('camera-active');
    $('startCamera').disabled=false;
    $('startCamera').textContent='⏳ PREPARANDO…';
    setDisabled('armLive',true)
    $('stopCamera').disabled=false;
    if($('calibrateBtn'))$('calibrateBtn').disabled=false;
    $('fpsInput').value='custom';$('customFpsWrap').classList.remove('hidden');$('customFps').value=state.live.sourceFps||'';
    $('sourceFps').textContent=state.live.sourceFps?state.live.sourceFps.toFixed(1)+' fps (cámara)':'Detectando…';
    liveSetStatus(`📏 ${distance()} m · coloca al atleta en INICIO. ARS SPRINT está preparando la medición…`);
    liveUpdateKpis();liveSchedule();loadPoseAI().catch(()=>{});
  }catch(e){console.error(e);stopLiveCamera(false);alert('No se pudo abrir la cámara: '+(e.message||e.name))}
}
function armLiveMeasurement(){
  if(!state.live.stream)return startLiveCamera();
  if(!$('athleteSelect').value){alert('Primero selecciona un deportista.');return}
  if(!state.live.body){liveSetStatus('🟡 Todavía no detecto al deportista. Colócalo completo dentro de la imagen y espera un momento.');return}
  state.live.armed=true;state.live.startTime=null;state.live.finishTime=null;state.live.lastX=null;state.live.lastT=null;state.live.lastMediaTime=null;state.live.observedFps=0;state.live.direction=null;state.live.armedAt=performance.now();state.live.ring=[];state.live.lockPoint=state.live.body?{x:state.live.body.x,y:state.live.body.y}:null;state.start=state.finish=null;state.gates={};
  $('startCamera').textContent='🔴 Midiendo…';$('startCamera').disabled=true;
  setDisabled('armLive',true)
  liveSetStatus(`🟢 LISTO · ${distance()} m · ${athlete($('athleteSelect').value)?.name||'Atleta'} · corre desde INICIO hasta FINAL.`);
  liveUpdateKpis();
}
function liveCrossed(a,b,line,dir){return dir>0?(a<line&&b>=line):(a>line&&b<=line)}
async function liveProcessFrame(media,perf){if(!state.live.running)return;const prevMedia=state.live.lastMediaTime;if(prevMedia!=null){const dt=media-prevMedia;if(dt>0){const inst=1/dt;state.live.observedFps=state.live.observedFps?state.live.observedFps*.85+inst*.15:inst}}state.live.lastMediaTime=media;state.live.lastPerf=perf;state.live.frames++;if(state.live.armed)liveCaptureSlice();if(!state.live.poseBusy&&poseAiTask&&$('liveVideo').readyState>=2){state.live.poseBusy=true;try{const ts=Math.max(Math.round(media*1000),Number(state.live.lastPoseTs||0)+1);state.live.lastPoseTs=ts;const r=poseAiTask.detectForVideo($('liveVideo'),ts);state.live.poses=r?.landmarks||[];const chosen=chooseLivePose(state.live.poses);state.live.targetPose=chosen;state.live.landmarks=chosen?.lm||[];const torso=chosen?.t||null;if(torso){if(!state.live.lockPoint && torso.visibility>=.45)state.live.lockPoint={x:torso.x,y:torso.y};const prev=state.live.lastX;state.live.body=torso;state.track.torso=torso;if(!state.live.armed && !state.live.startTime && torso.visibility>=.45 && state.live.armedAt===0){state.live.armed=true;state.live.armedAt=performance.now();state.live.ring=[];liveSetStatus(`🟢 ATLETA DETECTADO · ${athlete($('athleteSelect').value)?.name||'Atleta'} · prepárate y corre desde INICIO hasta FINAL.`);$('startCamera').textContent='🟢 LISTO · CORRE';}const startLine=state.track.startX??.12,finishLine=liveDistanceX();if(state.live.armed&&prev!=null&&!state.live.startTime){const dx=torso.x-prev;if(!state.live.direction&&Math.abs(dx)>=.006)state.live.direction=dx>0?1:-1;if(state.live.direction&&performance.now()>state.live.armedAt+500&&torso.visibility>=.40&&liveCrossed(prev,torso.x,startLine,state.live.direction)){const alpha=Math.max(0,Math.min(1,(startLine-prev)/(torso.x-prev||1)));const eventTime=prevMedia!=null?prevMedia+alpha*(media-prevMedia):media;state.live.startTime=eventTime;state.start={time:eventTime,frame:state.live.sourceFps?Math.round(eventTime*state.live.sourceFps):null,mode:'live-pose-interpolated',bodyDetected:true,visibility:torso.visibility};liveSetStatus(`🟢 INICIO detectado · ${media.toFixed(3)} s · dirección ${state.live.direction>0?'→':'←'}`)}}else if(state.live.armed&&state.live.startTime!=null&&!state.live.finishTime&&prev!=null&&state.live.direction&&torso.visibility>=.40&&liveCrossed(prev,torso.x,finishLine,state.live.direction)){const alpha=Math.max(0,Math.min(1,(finishLine-prev)/(torso.x-prev||1)));const eventTime=prevMedia!=null?prevMedia+alpha*(media-prevMedia):media;state.live.finishTime=eventTime;state.finish={time:eventTime,frame:state.live.sourceFps?Math.round(eventTime*state.live.sourceFps):null,mode:'live-pose-interpolated',bodyDetected:true,visibility:torso.visibility};state.live.armed=false;setDisabled('armLive',true);$('startCamera').disabled=false;$('startCamera').textContent='🔁 NUEVO INTENTO';buildLivePhotoFinish();liveSetStatus(`🏁 FINAL detectado · ${state.finish.time.toFixed(3)} s · ${(state.finish.time-state.start.time).toFixed(3)} s · evidencia generada · revisar y guardar.`);updateMarks();updateResult();updateSaveState()}state.live.lastX=torso.x}else if(state.live.armed){state.live.lastX=null}}catch(e){console.warn('live pose',e)}finally{state.live.poseBusy=false}}liveUpdateKpis();liveDraw()}
function liveSchedule(){const v=$('liveVideo');if(!state.live.running)return;if('requestVideoFrameCallback' in HTMLVideoElement.prototype){state.live.raf=v.requestVideoFrameCallback((now,meta)=>{liveProcessFrame(liveFrameTimestamp(meta),now);liveSchedule()})}else{state.live.raf=requestAnimationFrame(now=>{liveProcessFrame(liveFrameTimestamp(),now);liveSchedule()})}}
function stopLiveCamera(reset=true){if(state.live.raf){const v=$('liveVideo');if(v?.cancelVideoFrameCallback&&'requestVideoFrameCallback' in HTMLVideoElement.prototype){try{v.cancelVideoFrameCallback(state.live.raf)}catch{}}else cancelAnimationFrame(state.live.raf)}state.live.raf=0;state.live.running=false;state.live.armed=false;state.live.poseBusy=false;if(state.live.stream){state.live.stream.getTracks().forEach(t=>t.stop());state.live.stream=null}const v=$('liveVideo');if(v)v.srcObject=null;if($('liveStatus'))$('liveStatus').textContent='CÁMARA APAGADA';$('liveStage')?.classList.remove('camera-active');if($('startCamera')){$('startCamera').disabled=false;$('startCamera').textContent='▶ COMENZAR PRUEBA'}if($('armLive')){setDisabled('armLive',true);$('armLive').textContent='⏱️ Armar medición'}if($('stopCamera'))$('stopCamera').disabled=true;if(reset)liveSetStatus('Cámara detenida.');liveUpdateKpis()}

function bindLiveOverlay(){const c=$('liveOverlay');if(!c)return;c.addEventListener('pointerdown',e=>{const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width;state.track.drag=Math.abs(x-state.track.startX)<Math.abs(x-liveDistanceX())?'start':'finish';c.setPointerCapture?.(e.pointerId)});c.addEventListener('pointermove',e=>{if(!state.track.drag)return;const r=c.getBoundingClientRect(),x=Math.max(.03,Math.min(.97,(e.clientX-r.left)/r.width));if(state.track.drag==='start')state.track.startX=Math.min(x,state.track.finishX-.05);else state.track.finishX=Math.max(x,state.track.startX+.05);liveDraw()});c.addEventListener('pointerup',()=>state.track.drag=null)}
function bindLiveCamera(){if(!$('startCamera'))return;$('startCamera').onclick=()=>{if(state.live?.finishTime){stopLiveCamera(false);startLiveCamera();}else if(state.live?.stream){if(state.live.body){armLiveMeasurement();}else liveSetStatus('🟡 Buscando al atleta… ponte completamente visible frente a la cámara.')}else startLiveCamera();};if($('armLive'))$('armLive').onclick=armLiveMeasurement;if($('stopCamera'))$('stopCamera').onclick=()=>stopLiveCamera();$('liveVideo').addEventListener('loadedmetadata',liveDraw);window.addEventListener('resize',liveDraw);bindLiveOverlay();$('retryPoseLive')?.addEventListener('click',()=>{poseAiTask=null;poseAiLoading=null;loadPoseAI().catch(()=>{})});loadPoseAI().catch(()=>{})}

// V25: simplify live UI; the main button is the only measurement control.
