const DB_KEY='ARS_SPRINT_V26_DB';
const LEGACY_KEYS=['ARS_SPRINT_10_0_DB','ARS_SPRINT_8_1_DB','ARS_SPRINT_8_0_DB','ARS_SPRINT_7_4_DB','ARS_SPRINT_7_3_DB'];
function parseDB(raw){try{const x=JSON.parse(raw||'null');return x&&(Array.isArray(x.athletes)||Array.isArray(x.history))?x:null}catch{return null}}
function findStoredDB(){try{const direct=parseDB(localStorage.getItem(DB_KEY));const hasDirectData=!!(direct&&(direct.athletes?.length||direct.history?.length));if(hasDirectData)return direct;const candidates=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&/^ARS_SPRINT_.*_DB$/i.test(k)&&k!==DB_KEY)candidates.push(k)}for(const k of candidates){const x=parseDB(localStorage.getItem(k));if(x&&(x.athletes?.length||x.history?.length))return x}return direct||null}catch(e){console.warn('No se pudo inspeccionar localStorage',e);return null}}
const state={db:{version:'V26.86',athletes:[],history:[]},videoUrl:null,videoFile:null,fps:null,start:null,finish:null,lastFrameMeta:null,rvfcId:null,series:{active:false,total:0,current:0,attempts:[]},gates:{},track:{startX:.12,finishX:.88,torso:null,direction:null,drag:null,auto:false,lastDetect:0},calibration:{target:5,estimated:null,quality:'No calibrado',saved:false,referenceWidthM:0.21},photoFinish:{url:null},vision:{selectedGate:5,positions:{},proposals:{},frameImage:null,accepted:false,validatedGates:{},manualGates:{}}};
const $=id=>document.getElementById(id);const uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random();
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
function load(){try{
const x=findStoredDB()||LEGACY_KEYS.map(k=>parseDB(localStorage.getItem(k))).find(Boolean)||null;
if(x){const athletes=Array.isArray(x.athletes)?x.athletes.filter(a=>a&&a.id):[];const history=Array.isArray(x.history)?x.history.filter(h=>h&&h.athleteId):[];state.db={version:'V26.86',athletes,history,gates:x.gates&&typeof x.gates==='object'?x.gates:{}};save();}
}catch(e){console.warn('ARS SPRINT: no se pudieron migrar los datos',e)}}
function save(){try{localStorage.setItem(DB_KEY,JSON.stringify(state.db));return true}catch(e){alert('No se pudo guardar en este navegador. Usa Respaldo.');return false}}
function distance(){return Number($('distanceSelect').value)}
function athlete(id){return state.db.athletes.find(a=>a.id===id)}function athleteName(id){return athlete(id)?.name||'Sin deportista'}
function activeFps(){return state.fps&&state.fps>0?Number(state.fps):null}
function resolutionMs(){const f=activeFps();return f?1000/f:null}
function qualityInfo(){if(!state.start||!state.finish)return {label:'Pendiente',score:0};const t=state.finish.time-state.start.time;if(t<=0)return {label:'Inválida',score:0};if(!activeFps())return {label:'Temporal no verificada',score:45};const r=resolutionMs();const score=r<=4.17?80:r<=10?72:r<=20?64:55;return {label:'Temporal nominal conocida',score}}
function selectedAthleteId(){return $('athleteSelect')?.value||''}
function persistSelectedAthlete(){try{const id=selectedAthleteId();if(id)localStorage.setItem('ARS_SPRINT_SELECTED_ATHLETE',id)}catch{}}
function renderSelects(){if(!$('athleteSelect')||!$('profileSelect'))return;const cur=$('athleteSelect').value,curP=$('profileSelect').value;const empty='<option value=\"\">— Sin deportistas registrados —</option>';const opts=state.db.athletes.map(a=>`<option value=\"${esc(a.id)}\">${esc(a.name)}${a.category?' · '+esc(a.category):''}</option>`).join('')||empty;$('athleteSelect').innerHTML=opts;$('profileSelect').innerHTML=opts;let savedId='';try{savedId=localStorage.getItem('ARS_SPRINT_SELECTED_ATHLETE')||''}catch{}const selected=cur&&athlete(cur)?cur:(savedId&&athlete(savedId)?savedId:(state.db.athletes[0]?.id||''));if(selected)$('athleteSelect').value=selected;if(curP&&athlete(curP))$('profileSelect').value=curP;else if(selected)$('profileSelect').value=selected;persistSelectedAthlete();$('athleteEmptyHint')?.replaceChildren(document.createTextNode(state.db.athletes.length?'':'Crea o restaura un deportista para comenzar.'))}
function renderAthletes(){$('athleteList').innerHTML=state.db.athletes.length?state.db.athletes.map(a=>{const hs=state.db.history.filter(h=>h.athleteId===a.id);return `<div class="athlete-card"><h3>${esc(a.name)}</h3><p>${esc(a.sport||'')} ${a.category?'· '+esc(a.category):''}</p><p>${esc(a.sex||'')} ${a.dob?'· '+esc(a.dob):''}</p><p><b>${hs.length}</b> registros</p><button class="secondary" data-use="${a.id}">Usar en evaluación</button></div>`}).join(''):'<div class="status">No hay deportistas. Crea el primero.</div>';document.querySelectorAll('[data-use]').forEach(b=>b.onclick=()=>{$('athleteSelect').value=b.dataset.use;$('profileSelect').value=b.dataset.use;openTab('evaluation');liveDraw()})}
function renderHistory(){const q=($('historySearch').value||'').toLowerCase(),d=$('historyDistance').value,qc=$('historyQuality').value;const rows=state.db.history.filter(h=>(!q||athleteName(h.athleteId).toLowerCase().includes(q))&&(!d||(isOfficialHistory(h)?historyTimeFor(h,Number(d))!=null:true))&&(!qc||h.quality===qc)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));$('historyBody').innerHTML=rows.map(h=>{const official=isOfficialHistory(h);const status=official?'Oficial':'Pendiente Smart';const viewD=d?Number(d):Number(h.distance);const viewT=historyTimeFor(h,viewD);const viewMs=viewT?viewD/viewT:null;return `<tr><td>${new Date(h.createdAt).toLocaleString('es-PE')}</td><td>${esc(athleteName(h.athleteId))}</td><td>${viewD} m</td><td>${h.attempt}</td><td><b>${viewT!=null?viewT.toFixed(3):'—'} s</b></td><td>${viewMs!=null?viewMs.toFixed(2):'—'}</td><td>${esc(h.quality||'—')} · ${status}</td></tr>`}).join('')||'<tr><td colspan="7">Sin registros.</td></tr>'}
function renderAttempts(){const rows=state.series.attempts.map(a=>`<tr><td>${a.attempt}</td><td><b>${a.time.toFixed(3)} s</b></td><td>${a.ms.toFixed(2)}</td><td>${a.kmh.toFixed(2)}</td><td>${esc(a.quality)}</td><td>Guardado</td></tr>`).join('');$('attemptBody').innerHTML=rows||'<tr><td colspan="6">Aún no hay intentos.</td></tr>';const p=state.series.total?Math.round(state.series.attempts.length/state.series.total*100):0;$('seriesProgressBar').style.width=p+'%'}
function isOfficialHistory(h){
  if(!h)return false;
  // Smart camera results are official only when the complete 5/10/20 profile was validated.
  // Explicit manual-camera fallback remains a manual result and does not masquerade as Smart.
  if(h.captureSource==='camera-live-manual') return h.validationStatus!=='pending-smart';
  if(h.captureSource==='camera-live'){
    const s=h.smartSprint?.splitTimes||{};
    const s5=Number(s[5]),s10=Number(s[10]),s20=Number(s[20]);
    return h.validationStatus==='validated' && Number.isFinite(s5)&&Number.isFinite(s10)&&Number.isFinite(s20)&&s5>0&&s10>s5&&s20>s10;
  }
  // Legacy/manual records remain official unless explicitly marked pending.
  return h.validationStatus!=='pending-smart';
}
function historyDistance(h){return Number(h?.distance)||0}
function historyTimeFor(h,d){if(!h||!isOfficialHistory(h))return null;const sd=Number(d);if(h.captureSource==='camera-live'&&h.smartSprint?.splitTimes){const t=Number(h.smartSprint.splitTimes[sd]);return Number.isFinite(t)&&t>0?t:null}return Number(h.distance)===sd&&Number.isFinite(Number(h.time))?Number(h.time):null}
function bestFor(id,d){return state.db.history.filter(h=>h.athleteId===id&&isOfficialHistory(h)&&historyTimeFor(h,d)!=null).map(h=>({h,time:historyTimeFor(h,d)})).sort((a,b)=>a.time-b.time)[0]?.h||null}
function renderProfile(){const a=athlete($('profileSelect').value);if(!a){$('profileContent').innerHTML='<div class="status">Crea un deportista para generar su ficha.</div>';return}const hs=state.db.history.filter(h=>h.athleteId===a.id&&isOfficialHistory(h)).sort((x,y)=>x.createdAt.localeCompare(y.createdAt));const d=Number($('profileDistance')?.value)||20;const stat=[5,10,20].map(d=>{const r=bestFor(a.id,d),rt=r?historyTimeFor(r,d):null,rm=rt?d/rt:null;return `<div class="stat-box"><span>${d} m · PB</span><b>${rt?rt.toFixed(3)+' s':'—'}</b><small>${rm?rm.toFixed(2)+' m/s · '+(rm*3.6).toFixed(2)+' km/h':''}</small></div>`}).join('');const vals=hs.map(h=>historyTimeFor(h,d)).filter(Number.isFinite),avg=vals.length?vals.reduce((x,y)=>x+y,0)/vals.length:null,sd=vals.length?Math.sqrt(vals.reduce((s,x)=>s+(x-(avg||0))**2,0)/vals.length):null,cv=avg?sd/avg*100:null,best=vals.length?Math.min(...vals):null,bestRec=hs.find(h=>historyTimeFor(h,d)===best),last=hs.at(-1);$('profileContent').innerHTML=`<div class="profile-header"><div><h1>${esc(a.name)}</h1><p>${esc(a.sport||'')} · ${esc(a.category||'')} · ${esc(a.sex||'')} · ${esc(a.dob||'')}</p></div><div><b>ARS SPRINT V26.86</b><br><small>Informe generado ${new Date().toLocaleDateString('es-PE')}</small></div></div><div class="stat-grid">${stat}</div><div class="grid four"><div class="info-box"><span>Evaluaciones</span><b>${hs.length}</b></div><div class="info-box"><span>Mejor tiempo global</span><b>${best!=null?best.toFixed(3)+' s':'—'}</b></div><div class="info-box"><span>Media de tiempos</span><b>${avg!=null?avg.toFixed(3)+' s':'—'}</b></div><div class="info-box"><span>CV de la serie</span><b>${cv!=null?cv.toFixed(2)+'%':'—'}</b></div></div><h3>Historial de evaluaciones</h3><div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Prueba</th><th>Intento</th><th>Tiempo</th><th>m/s</th><th>km/h</th><th>Calidad</th><th>Fuente</th></tr></thead><tbody>${hs.filter(h=>historyTimeFor(h,d)!=null).map(h=>{const ht=historyTimeFor(h,d),hms=d/ht;return `<tr><td>${new Date(h.createdAt).toLocaleDateString('es-PE')}</td><td>${d} m</td><td>${h.attempt}</td><td>${formatSec(ht)}</td><td>${hms.toFixed(2)}</td><td>${(hms*3.6).toFixed(2)}</td><td>${esc(h.quality)}</td><td>${esc(h.captureSource||'vídeo')}</td></tr>`}).join('')||'<tr><td colspan="8">Sin evaluaciones para esta distancia.</td></tr>'}</tbody></table></div><h3>Datos técnicos de captura</h3><div class="table-wrap"><table><thead><tr><th>Fecha</th><th>FPS cámara</th><th>FPS observado</th><th>Resolución</th><th>Detección corporal</th><th>Validación</th></tr></thead><tbody>${hs.map(h=>`<tr><td>${new Date(h.createdAt).toLocaleDateString('es-PE')}</td><td>${h.cameraFps||h.fps||'—'}</td><td>${h.observedFps?h.observedFps.toFixed(1):'—'}</td><td>${esc(h.cameraResolution||'—')}</td><td>${esc(h.bodyDetection||'—')}</td><td>${esc(h.validationStatus||'manual')}</td></tr>`).join('')||'<tr><td colspan="6">Sin datos técnicos.</td></tr>'}</tbody></table></div><div class="status"><b>Última evaluación:</b> ${last?new Date(last.createdAt).toLocaleString('es-PE'):'—'} · <b>Mejor registro:</b> ${bestRec?d+' m · '+best.toFixed(3)+' s':'—'}</div><h3>Observaciones</h3><p>${esc(a.notes||'Sin observaciones.')}</p>`} 
function updateClock(){const v=$('video'),t=v.currentTime||0,f=activeFps();$('currentTime').textContent=t.toFixed(3)+' s';$('frameClock').textContent=`${t.toFixed(3)} s · frame ${f?Math.round(t*f):'—'}`;$('frameNumber').textContent=f?Math.round(t*f):'—'}
function updateMarks(){const f=activeFps();const set=(id,frameId,x)=>{$(id).textContent=x?x.time.toFixed(3)+' s':'—';$(frameId).textContent=x&&f?`Frame ${x.frame}`:'Frame —'};set('startReadout','startFrameReadout',state.start);set('finishReadout','finishFrameReadout',state.finish);const q=qualityInfo();$('markQuality').textContent=!state.start&&!state.finish?'Carga un vídeo y marca inicio/final.':`Indicador de captura: ${q.label}${f?' · '+resolutionMs().toFixed(2)+' ms/frame nominales':''}`}
function seriesStats(){const ts=state.series.attempts.map(a=>a.time);if(!ts.length)return null;const mean=ts.reduce((a,b)=>a+b,0)/ts.length,sd=Math.sqrt(ts.reduce((s,x)=>s+(x-mean)**2,0)/ts.length),cv=mean?sd/mean*100:0;return {mean,sd,cv,best:Math.min(...ts)}}
function gateTime(g){return state.gates[String(g)]?.time??null}
function updateGates(){[5,10,20].forEach(g=>{const x=gateTime(g);$('gate'+g+'Readout').textContent=x==null?'—':x.toFixed(3)+' s'});const entries=[5,10,20].map(g=>({d:g,t:gateTime(g)})).filter(x=>x.t!=null).sort((a,b)=>a.d-b.d);let html='';let prev=null;let peak=null;entries.forEach(x=>{const dt=prev?x.t-prev.t:x.t;const dd=prev?x.d-prev.d:x.d;const v=dt>0?dd/dt:0;html+=`<tr><td>0–${x.d} m</td><td>${x.t.toFixed(3)} s</td><td>${dt.toFixed(3)} s</td><td>${(v*3.6).toFixed(2)} km/h</td></tr>`;if(v>0&&(!peak||v>peak.v))peak={v,d:x.d,from:prev?prev.d:0};prev=x});$('splitBody').innerHTML=html||'<tr><td colspan="4">Registra dos o más puertas.</td></tr>';const smartPeak=state.live?.smart?.peak?.speed;const peakSource=state.live?.smart?.peak?.source||'none';if(Number.isFinite(Number(smartPeak))&&Number(smartPeak)>0&&peakSource==='smart-frame'){$('peakVelocity').textContent=(Number(smartPeak)*3.6).toFixed(2);$('peakAt').textContent=(state.live.smart.peak.distance??'—')+' m · Smart frame'}else if(peak){$('peakVelocity').textContent=(peak.v*3.6).toFixed(2);$('peakAt').textContent=peak.from+'–'+peak.d+' m · split'}else{$('peakVelocity').textContent='—';$('peakAt').textContent='—'}const a=athlete($('athleteSelect').value),d=distance(),hist=a?state.db.history.filter(h=>h.athleteId===a.id&&isOfficialHistory(h)&&historyTimeFor(h,d)!=null).map(h=>({h,time:historyTimeFor(h,d)})).sort((x,y)=>x.time-y.time):[];const pb=hist[0]?.h;const pbTime=hist[0]?.time;$('pbValue').textContent=pb&&Number.isFinite(pbTime)?pbTime.toFixed(3)+' s':'—';const selectedSmart=Number(state.live?.smart?.splitTimes?.[d]);const rt=Number.isFinite(selectedSmart)&&selectedSmart>0?selectedSmart:null;$('pbDelta').textContent=(pb&&Number.isFinite(rt))?((rt-pbTime)/pbTime*100).toFixed(2)+'%':'—'}
function bindGates(){document.querySelectorAll('.gateBtn').forEach(b=>b.onclick=()=>{const d=Number(b.dataset.gate),v=$('video');if(!v.duration)return alert('Carga un vídeo primero.');if(![5,10,20].includes(d))return alert('Solo se admiten las puertas oficiales de 5, 10 y 20 m.');state.gates[String(d)]={time:activeFps()?Math.round(v.currentTime*activeFps())/activeFps():v.currentTime,frame:activeFps()?Math.round(v.currentTime*activeFps()):null};updateGates()});$('clearGates').onclick=()=>{state.gates={};updateGates()}}
function bindSetup(){
  // V26.86: the old checkbox checklist was removed from the main flow.
  // Calibration must never depend on hidden/non-existent setup controls.
  return true;
}
function updateAI(t,ms){const id=$('athleteSelect').value,d=distance(),hist=state.db.history.filter(h=>h.athleteId===id&&isOfficialHistory(h)&&historyTimeFor(h,d)!=null).map(h=>({h,time:historyTimeFor(h,d)})).sort((a,b)=>a.time-b.time),best=hist[0]?.h,bestTime=hist[0]?.time,delta=best&&Number.isFinite(bestTime)?t-bestTime:null,s=seriesStats();$('aiBest').textContent=best&&Number.isFinite(bestTime)?bestTime.toFixed(3)+' s':'—';$('aiDelta').textContent=delta==null?'—':(delta<=0?'Mejora ':'+')+delta.toFixed(3)+' s';$('aiCV').textContent=s?s.cv.toFixed(2)+'%':'—';let level='En desarrollo';if(best&&delta<0)level='Mejora respecto a su mejor';else if(best&&delta>0)level='Por debajo de su mejor';if(s&&s.cv<1)level+=' · alta consistencia';else if(s&&s.cv<2)level+=' · buena consistencia';else if(s)level+=' · revisar variabilidad';$('aiLevel').textContent=level;$('aiAnalysis').innerHTML=`<b>${d} m · ${t.toFixed(3)} s · ${ms.toFixed(2)} m/s</b><p>${best?(delta<0?'La marca actual mejora el mejor registro previo.':delta>0?'La marca actual está por encima de la mejor marca previa.':'La marca actual iguala la mejor marca previa.'):'Todavía no existe una referencia histórica para esta distancia.'}</p><p><b>Control:</b> ${qualityInfo().label}. ${activeFps()?`Resolución nominal ${resolutionMs().toFixed(2)} ms/frame.`:'FPS no verificado; no se asigna precisión de frame.'}</p>`}
function sprintSplitDistances(d){if(d===5)return [5];if(d===10)return [5,10];if(d===20)return [5,10,20];return [5,10,20]}
function renderSplits(){const box=$('splitSummary'),peak=$('peakVelocityBox');if(!box||!peak)return;const d=distance();const sm=state.live?.smart;const available=sprintSplitDistances(d).filter(x=>sm?.splitTimes?.[x]!=null).map(x=>({d:x,t:Number(sm.splitTimes[x])}));if(!state.start||!state.finish){box.innerHTML='<div class="status">Realiza una medición para generar los splits disponibles.</div>';peak.textContent='Velocidad máxima estimada: —';return}if(!available.length){box.innerHTML='<div class="status">No hay cruces 5/10/20 m verificados para mostrar. ARS no interpola ni inventa splits.</div>';peak.textContent='Velocidad máxima estimada: —';return}const parts=[];for(const x of available){const prev=parts.at(-1);const prevT=prev?prev.t:0;const segDist=x.d-(prev?prev.d:0);const segT=x.t-prevT;if(segT>0)parts.push({...x,segment:segDist,segT});}const rows=parts.map(p=>{const v=p.segment/p.segT;return `<div class="split-box"><span>0–${p.d} m</span><b>${p.t.toFixed(3)} s</b><small>${v.toFixed(2)} m/s · ${(v*3.6).toFixed(2)} km/h</small></div>`}).join('');box.innerHTML=`<div class="split-grid">${rows}</div><p class="split-footnote">Splits basados únicamente en cruces detectados o validados. ARS nunca interpola un tiempo intermedio no observado.</p>`;const peakSample=parts.reduce((best,p)=>{const v=p.segment/p.segT;return !best||v>best.v?{v,d:p.d}:best},null);peak.innerHTML=peakSample?`⚡ <b>Velocidad máxima por split: ${peakSample.v.toFixed(2)} m/s (${(peakSample.v*3.6).toFixed(2)} km/h)</b><br><small>La Peak Velocity frame-a-frame se muestra por separado cuando hay suficientes muestras.</small>`:'Velocidad máxima estimada: —'}
function updateSaveState(){const d=distance();const ready=!!state.start&&!!state.finish;const liveRun=!!(state.live?.stream||state.live?.startTime!=null||state.live?.finishTime!=null);const smartComplete=[5,10,20].every(g=>{const t=Number(state.live?.smart?.splitTimes?.[g]);return Number.isFinite(t)&&t>0})&&Number(state.live?.smart?.splitTimes?.[10])>Number(state.live?.smart?.splitTimes?.[5])&&Number(state.live?.smart?.splitTimes?.[20])>Number(state.live?.smart?.splitTimes?.[10]);const validated=liveRun?smartComplete:validationReadyForDistance(d);$('saveCurrent').textContent=validated?'💾 Guardar resultado validado':'💾 Guardar resultado manual';$('saveCurrent').disabled=!ready||liveRun&&!smartComplete}
function updateResult(){if(!state.start||!state.finish){renderSplits();$('resultTime').textContent=$('resultMs').textContent=$('resultKmh').textContent='—';$('quality').textContent='Pendiente';$('qualityDetail').textContent='—';$('qualityBar').style.width='0%';$('precisionReadout').textContent='Resolución temporal: —';$('uncertaintyReadout').textContent='Incertidumbre nominal: —';$('saveCurrent').disabled=true;updateSaveState();return}const d=distance();const liveRun=!!(state.live?.stream||state.live?.startTime!=null||state.live?.finishTime!=null);const smartTime=liveRun?Number(state.live?.smart?.splitTimes?.[d]):NaN;const t=Number.isFinite(smartTime)&&smartTime>0?smartTime:(liveRun?NaN:state.finish.time-state.start.time);if(!Number.isFinite(t)||t<=0||!Number.isFinite(d)||d<=0){$('validationNote').textContent='Medición inválida: revisa distancia, inicio y final.';return}const ms=d/t,q=qualityInfo(),res=resolutionMs();$('resultTime').textContent=t.toFixed(3);$('resultMs').textContent=ms.toFixed(2);$('resultKmh').textContent=(ms*3.6).toFixed(2);$('quality').textContent=q.label;$('qualityDetail').textContent=q.score+' / 100 (indicador, no validación científica)';$('qualityBar').style.width=q.score+'%';$('precisionReadout').textContent=res?`Resolución nominal: ${res.toFixed(2)} ms/frame`:'Resolución temporal: FPS no verificado';$('uncertaintyReadout').textContent=res?`Incertidumbre nominal del intervalo: ±${(res/Math.sqrt(2)).toFixed(2)} ms (≈0.5 frame por evento)`:'Incertidumbre: no cuantificable por frame';$('validationNote').textContent=`Marca válida · ${d.toFixed(2)} m · ${t.toFixed(3)} s · ${activeFps()?activeFps()+' fps declarado':'FPS no verificado'}.`;updateAI(t,ms);renderSplits();$('saveCurrent').disabled=false}
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
function currentMeasurement(){if(!$('athleteSelect')?.value)return null;if(!state.start||!state.finish)return null;const t=state.finish.time-state.start.time,d=distance();if(t<=0||d<=0)return null;const ms=d/t,q=qualityInfo();const gateData=Object.fromEntries(Object.entries(state.gates));readProtocol();const precision=precisionGuard();const protocol=JSON.parse(JSON.stringify(state.vision.protocol||{}));const protocolScore=protocolQuality();const gateAudit=auditMethod(d);const validationStatus=state.vision.manualGates?.[String(d)]?'manual':state.vision.validatedGates?.[String(d)]?'validated':state.vision.proposals?.[String(d)]?'proposal':'manual';return {id:uid(),athleteId:$('athleteSelect').value,distance:d,protocol:$('startProtocol').value,surface:$('surface').value,condition:$('condition').value,fps:activeFps(),time:t,ms,kmh:ms*3.6,quality:q.label,qualityScore:q.score,attempt:state.series.current||state.series.attempts.length+1,start:state.start,finish:state.finish,gates:gateData,visionValidated:validationStatus==='validated',validationStatus,gateAudit,protocol,protocolScore,precision,seriesStats:computeSeriesStats?.()||null,agreementAnalysis:null,videoName:state.videoFile?.name||'',captureSource:state.live?.stream?(state.live?.start?.mode==='live-manual'||state.start?.mode==='live-manual'||state.finish?.mode==='live-manual'?'camera-live-manual':'camera-live'):'video-file',cameraFps:state.live?.sourceFps||null,observedFps:state.live?.observedFps||null,cameraResolution:state.live?.stream?`${$('liveVideo')?.videoWidth||''}×${$('liveVideo')?.videoHeight||''}`:'',bodyDetection:state.start?.bodyDetected&&state.finish?.bodyDetected?'pose-torso':'manual',liveEvidence:state.live?.photoUrl||null,liveSourceFps:state.live?.sourceFps||null,liveResolution:state.live?.stream?`${state.live.width||$('liveVideo')?.videoWidth||''}×${state.live.height||$('liveVideo')?.videoHeight||''}`:'',createdAt:new Date().toISOString()}}
function addMeasurement(m){state.db.history.push(m);save();renderHistory();renderProfile();renderAthletes()}
function bindSeries(){function reset(){state.series={active:false,total:0,current:0,attempts:[]};$('startSeries').disabled=false;$('nextAttempt').disabled=true;$('finishSeries').disabled=true;$('cancelSeries').disabled=true;renderAttempts()}
$('startSeries').onclick=()=>{if(!$('athleteSelect').value)return alert('Crea o selecciona un deportista.');if(!distance())return alert('Selecciona una distancia válida.');if(!$('video').duration)return alert('Carga el vídeo antes de iniciar la serie.');state.series={active:true,total:Number($('seriesCount').value),current:1,attempts:[]};$('startSeries').disabled=true;$('nextAttempt').disabled=false;$('finishSeries').disabled=true;$('cancelSeries').disabled=false;$('seriesStatus').textContent=`Serie activa · intento 1 de ${state.series.total}. Marca inicio y final.`;state.start=state.finish=null;state.gates={};renderAttempts();updateMarks();updateGates();updateResult()};$('nextAttempt').onclick=()=>{const m=window.currentMeasurement();if(!m)return alert('Marca inicio y final antes de pasar al siguiente intento.');m.attempt=state.series.current;state.series.attempts.push(m);renderAttempts();if(state.series.current>=state.series.total){$('seriesStatus').textContent='✓ Todos los intentos completados. Puedes finalizar la serie.';$('nextAttempt').disabled=true;$('finishSeries').disabled=false;return}state.series.current++;state.start=state.finish=null;$('seriesStatus').textContent=`Intento ${state.series.current} de ${state.series.total}.`;updateMarks();updateResult()};$('finishSeries').onclick=()=>{if(!state.series.attempts.length)return alert('No hay intentos guardados.');state.series.attempts.forEach(m=>addMeasurement(m));$('seriesStatus').textContent=`✓ Serie guardada · ${state.series.attempts.length} intentos.`;reset();state.start=state.finish=null;state.gates={};state.vision.manualGates={};state.vision.validatedGates={};updateMarks();updateGates();updateResult();updateAudit()};$('cancelSeries').onclick=()=>{if(confirm('¿Cancelar la serie sin guardar sus intentos?')){reset();state.start=state.finish=null;$('seriesStatus').textContent='Serie cancelada.';updateMarks();updateResult()}}}
function bindSave(){ $('saveCurrent').onclick=()=>{if(state.series.active){alert('La serie está activa. Guarda el intento con «Siguiente intento» y finaliza la serie.');return}if(!$('athleteSelect')?.value){alert('Selecciona un deportista. El historial no guardará resultados sin nombre.');return}const m=window.currentMeasurement();if(!m)return;addMeasurement(m);$('validationNote').textContent='✓ Intento guardado en el historial.';$('saveCurrent').disabled=true;state.start=state.finish=null;state.gates={};state.vision.manualGates={};state.vision.validatedGates={};updateMarks();updateGates();updateResult();updateAudit()}}
function openAthleteDialog(){const d=$('athleteDialog');if(!d)return;if(typeof d.showModal==='function'){if(!d.open)d.showModal()}else d.setAttribute('open','')}
function closeAthleteDialog(){const d=$('athleteDialog');if(!d)return;if(typeof d.close==='function'&&d.open)d.close();else d.removeAttribute('open')}
function bindAthletes(){ $('newAthlete').onclick=openAthleteDialog;$('quickNewAthlete')?.addEventListener('click',openAthleteDialog);$('cancelAthlete').onclick=closeAthleteDialog;$('athleteForm').onsubmit=e=>{e.preventDefault();const a={id:uid(),name:$('athleteName').value.trim(),dob:$('athleteDob').value,sex:$('athleteSex').value,sport:$('athleteSport').value.trim(),category:$('athleteCategory').value.trim(),notes:$('athleteNotes').value.trim(),createdAt:new Date().toISOString()};if(!a.name){$('athleteName').focus();return}state.db.athletes.push(a);save();renderAll();$('athleteSelect').value=a.id;$('profileSelect').value=a.id;persistSelectedAthlete();closeAthleteDialog();e.target.reset();liveUpdateKpis();updateSmartUI?.();}}
function bindHistory(){['historySearch','historyDistance','historyQuality'].forEach(id=>$(id).oninput=$(id).onchange=renderHistory);$('clearHistory').onclick=()=>{if(confirm('¿Borrar todo el historial? Los deportistas se conservarán.')){state.db.history=[];save();renderAll()}};$('exportCsv').onclick=()=>{const head=['Fecha','Deportista','Prueba','Intento','Tiempo_5m_s','Tiempo_10m_s','Tiempo_20m_s','Velocidad_20m_kmh','Calidad','FPS','Protocolo','Superficie','Condición'];const rows=state.db.history.map(h=>{const t5=historyTimeFor(h,5),t10=historyTimeFor(h,10),t20=historyTimeFor(h,20);const t20v=Number.isFinite(t20)?20/t20*3.6:null;return [h.createdAt,athleteName(h.athleteId),h.captureSource==='camera-live'?'Smart 0–20 m':`${h.distance} m`,h.attempt,Number.isFinite(t5)?t5.toFixed(3):'',Number.isFinite(t10)?t10.toFixed(3):'',Number.isFinite(t20)?t20.toFixed(3):'',Number.isFinite(t20v)?t20v.toFixed(3):'',h.quality,h.fps||'',h.protocol,h.surface,h.condition]});const csv=[head,...rows].map(r=>r.map(x=>'"'+String(x??'').replaceAll('"','""')+'"').join(',')).join('\n');download('ars-sprint-historial.csv',csv,'text/csv')}}
function download(name,data,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function bindBackup(){$('backupBtn').onclick=()=>download('ars-sprint-respaldo.json',JSON.stringify(state.db,null,2),'application/json');$('restoreInput').onchange=e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(!Array.isArray(x.athletes)||!Array.isArray(x.history))throw Error();state.db={version:'V26.86',athletes:x.athletes,history:x.history,gates:x.gates||{}};save();renderAll();alert('Respaldo restaurado correctamente.')}catch{alert('Archivo de respaldo no válido.')}};r.readAsText(f)}}
function dashboardAthletes(){const cur=$('dashAthlete')?.value;const opts=state.db.athletes.map(a=>`<option value="${a.id}">${esc(a.name)}${a.category?' · '+esc(a.category):''}</option>`).join('')||'<option value="">Sin deportistas</option>';if($('dashAthlete')){$('dashAthlete').innerHTML=opts;if(cur&&athlete(cur))$('dashAthlete').value=cur}}
function drawCanvas(canvasId,labels,values,opts={}){const c=$(canvasId);if(!c)return;const ctx=c.getContext('2d');const w=c.clientWidth||700,h=260,dpr=window.devicePixelRatio||1;c.width=w*dpr;c.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);ctx.font='12px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';ctx.fillStyle='#667085';const pad={l:48,r:18,t:20,b:42};const pw=w-pad.l-pad.r,ph=h-pad.t-pad.b;if(!values.length){return}const min=Math.min(...values),max=Math.max(...values),range=max-min||1;for(let i=0;i<5;i++){const y=pad.t+ph*i/4;ctx.strokeStyle='#e9edf2';ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();const val=max-(range*i/4);ctx.fillStyle='#667085';ctx.fillText(val.toFixed(opts.decimals??2),4,y+4)}ctx.strokeStyle='#111';ctx.lineWidth=2;ctx.beginPath();values.forEach((v,i)=>{const x=pad.l+(values.length===1?pw/2:pw*i/(values.length-1));const y=pad.t+(max-v)/range*ph;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke();values.forEach((v,i)=>{const x=pad.l+(values.length===1?pw/2:pw*i/(values.length-1));const y=pad.t+(max-v)/range*ph;ctx.fillStyle='#ffd000';ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#344054';ctx.textAlign='center';ctx.fillText(String(labels[i]),x,h-18)});ctx.textAlign='left'}
function renderDashboard(){if(!$('dashAthlete'))return;dashboardAthletes();const id=$('dashAthlete').value,d=Number($('dashDistance').value);const hs=state.db.history.filter(h=>h.athleteId===id&&isOfficialHistory(h)&&historyTimeFor(h,d)!=null).map(h=>({h,time:historyTimeFor(h,d)})).sort((a,b)=>a.h.createdAt.localeCompare(b.h.createdAt));const best=hs.length?Math.min(...hs.map(x=>x.time)):null;const latest=hs[hs.length-1]?.h;$('dashBest').textContent=best==null?'—':best.toFixed(3);const latestTime=latest?historyTimeFor(latest,d):null; $('dashSpeed').textContent=latestTime?((d/latestTime)*3.6).toFixed(2):'—';$('dashPb').textContent=latest&&best&&Number.isFinite(latestTime)?((latestTime-best)/best*100).toFixed(2)+'%':'—';$('dashCount').textContent=hs.length;$('dashSummary').textContent=hs.length?`${hs.length} registro(s) · última evaluación ${new Date(latest.createdAt).toLocaleDateString('es-PE')}`:'No hay registros para esta distancia.';const bestSeries=[];let running=Infinity;hs.forEach(x=>{running=Math.min(running,x.time);bestSeries.push(running)});$('trendEmpty').style.display=bestSeries.length?'none':'block';drawCanvas('trendCanvas',hs.map((_,i)=>i+1),bestSeries,{decimals:3});const smart=latest?.smartSprint?.splitTimes;const gates=latest?.gates||{};const entries=[5,10,20].map(g=>({g,t:smart?.[g]!=null?Number(smart[g]):gates[String(g)]?.time})).filter(x=>Number.isFinite(Number(x.t)));const speeds=[];const labs=[];let prev={d:0,t:0};entries.forEach(x=>{const dt=x.t-prev.t,dd=x.g-prev.d;if(dt>0){speeds.push(dd/dt*3.6);labs.push(`${prev.d}-${x.g}`)}prev={d:x.g,t:x.t}});$('splitEmpty').style.display=speeds.length?'none':'block';drawCanvas('splitCanvas',labs,speeds,{decimals:1});renderRanking()}
function renderRanking(){if(!$('rankBody'))return;const d=Number($('rankDistance').value),metric=$('rankMetric').value;const rows=state.db.athletes.map(a=>{const hs=state.db.history.filter(h=>h.athleteId===a.id&&isOfficialHistory(h)&&historyTimeFor(h,d)!=null).map(h=>({h,time:historyTimeFor(h,d)}));if(!hs.length)return null;const bestRec=hs.reduce((b,x)=>!b||x.time<b.time?x:b,null),best=bestRec.time,speed=d/best;const bestHistory=bestRec.h;const peakSamples=hs.flatMap(x=>Array.isArray(x.h.smartSprint?.speedSamples)?x.h.smartSprint.speedSamples:[]).filter(s=>Number(s?.distance)<=d&&Number.isFinite(Number(s?.speed)));const peak=peakSamples.length?Math.max(...peakSamples.map(s=>Number(s.speed))):0;const chronological=hs.slice().sort((x,y)=>String(x.h.createdAt).localeCompare(String(y.h.createdAt)));const first=Number(chronological[0]?.time);const improvement=Number.isFinite(first)&&first>0?(first-best)/first*100:0;return {a,best,speed,peak,improvement,count:hs.length}}).filter(Boolean).sort((x,y)=>metric==='time'?x.best-y.best:metric==='speed'?y.speed-x.speed:metric==='peak'?y.peak-x.peak:y.improvement-x.improvement);$('rankBody').innerHTML=rows.map((r,i)=>{const result=metric==='time'?r.best.toFixed(3)+' s':metric==='speed'?(r.speed*3.6).toFixed(2)+' km/h':metric==='peak'?(r.peak?(r.peak*3.6).toFixed(2)+' km/h':'—'):(r.improvement>0?'+':'')+r.improvement.toFixed(1)+'%';return `<tr><td><b>${i+1}</b></td><td>${esc(r.a.name)}</td><td>${result}</td><td>${r.count}</td></tr>`}).join('')||'<tr><td colspan="4">No hay resultados para esta prueba.</td></tr>'}
function bindDashboard(){['dashAthlete','dashDistance'].forEach(id=>$(id)?.addEventListener('change',renderDashboard));['rankDistance','rankMetric'].forEach(id=>$(id)?.addEventListener('change',renderRanking));window.addEventListener('resize',()=>{if(document.getElementById('dashboard')?.classList.contains('active'))renderDashboard()});renderDashboard()}
function openTab(id){
  if(!['evaluation','dashboard','athletes','history','profile','vision','method'].includes(id))id='evaluation';
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
  const smart=Number(state.live?.smart?.splitTimes?.[g]);if(Number.isFinite(smart)&&smart>0)return true;return !!(state.vision.validatedGates?.[g] || state.vision.manualGates?.[g]);
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
async function autoMeasureSprint(){const v=$('video');if(!v?.duration)return alert('Carga un vídeo primero.');const fps=activeFps();if(!fps)return alert('Declara el FPS real del vídeo.');if(!$('athleteSelect').value)return alert('Selecciona un deportista antes de medir.');const cal=state.vision?.calibration||{};const positions=state.vision?.positions||{};const physical=!!state.calibration?.saved && !!cal.physicalDistanceConfirmed;const ordered=[5,10,20].every(g=>Number.isFinite(Number(positions[String(g)])));if(!physical||!ordered)return alert('Calibración no validada: confirma 5–10–20 m y la estabilidad de la cámara antes de medir automáticamente.');try{await loadPoseAI();const old=v.currentTime;const step=Math.max(1/fps,1/30),samples=[];let last=null;for(let t=0;t<=v.duration;t+=step){await seekTo(t);const r=poseAiTask.detectForVideo(v,Math.round(t*1000));const torso=torsoFromLandmarks(r?.landmarks?.[0]);if(torso){samples.push({t,x:torso.x,v:torso.visibility});last=torso}}await seekTo(old);if(samples.length<3)return alert('No se pudo seguir el cuerpo durante el vídeo. Usa un plano lateral y asegúrate de que el atleta sea visible.');const sx=state.track.startX,fx=getTrackFinishX();const dir=samples.at(-1).x>=samples[0].x?1:-1;const cross=(x1,x2,line)=>dir>0?(x1<line&&x2>=line):(x1>line&&x2<=line);let st=null,fn=null;for(let i=1;i<samples.length;i++){const a=samples[i-1],b=samples[i];if(!st&&cross(a.x,b.x,sx)){const al=(sx-a.x)/(b.x-a.x);st=a.t+al*(b.t-a.t)}if(st!=null&&!fn&&cross(a.x,b.x,fx)){const al=(fx-a.x)/(b.x-a.x);fn=a.t+al*(b.t-a.t);break}}if(st==null||fn==null||fn<=st)return alert('El cuerpo fue detectado, pero no cruzó las líneas de inicio y final. Ajusta las líneas amarilla/blanca sobre el vídeo.');state.start={time:st,frame:Math.round(st*fps),mode:'pose-auto',bodyDetected:true};state.finish={time:fn,frame:Math.round(fn*fps),mode:'pose-auto',bodyDetected:true};state.track.auto=true;state.track.direction=dir;updateMarks();updateResult();updateBodyStatus();$('bodyStatus').textContent=`🟢 Medición automática: ${st.toFixed(3)} → ${fn.toFixed(3)} s · cuerpo detectado · revisar antes de guardar`;return {start:st,finish:fn,frames:samples.length};}catch(e){console.error(e);alert('No se pudo completar la medición automática. Revisa la conexión al modelo de IA y el encuadre.')}}
function bindCalibration(){ $('smartCalibrateBtn')?.addEventListener('click',smartCalibrate); $('distanceSelect')?.addEventListener('change',updateCalibrationUI); updateCalibrationUI(); }
function bindOther(){ bindTrackingOverlay(); $('loadBodyAI')?.addEventListener('click',detectBodyAtCurrentFrame); $('autoMeasure')?.addEventListener('click',autoMeasureSprint);  $('distanceSelect').onchange=()=>{updateResult();renderDashboard();updateSmartUI?.();liveDraw?.();};$('athleteSelect')?.addEventListener('change',()=>{persistSelectedAthlete();liveUpdateKpis();updateSmartUI?.();updateResult();updateSaveState();liveDraw?.();});$('profileSelect').onchange=renderProfile;$('markStart').onclick=()=>mark('start');$('markFinish').onclick=()=>mark('finish');$('resetMarks').onclick=()=>{state.start=state.finish=null;state.gates={};state.vision.manualGates={};state.vision.validatedGates={};updateMarks();updateGates();updateResult();updateAudit()};$('undoMark').onclick=()=>{if(state.finish)state.finish=null;else state.start=null;updateMarks();updateResult()};$('printPdf').onclick=()=>window.print()}
function renderAll(){renderSelects();renderAthletes();renderHistory();renderProfile();renderAttempts();updateMarks();updateResult();dashboardAthletes();renderDashboard()}
document.addEventListener('DOMContentLoaded',()=>{try{load();bindTabs();bindVideo();bindFps();bindGates();bindSetup();bindSeries();bindSave();bindAthletes();bindHistory();bindBackup();bindCalibration();bindOther();bindDashboard();bindVision();bindValidation();bindProtocol();renderAll();updateGates();openTab('evaluation');drawTrackingOverlay();updateBodyStatus();bindLiveCamera();bindLiveCalibrationDrag();if(!state.db.athletes.length){$('liveInstruction')?.replaceChildren(document.createTextNode('Primero crea o restaura un deportista. Después abre la cámara para comenzar.'));$('athleteEmptyHint')?.replaceChildren(document.createTextNode('Crea o restaura un deportista para comenzar.'));}}catch(e){console.error('ARS SPRINT init',e);const el=$('liveInstruction');if(el)el.textContent='⚠️ ARS SPRINT no pudo completar la inicialización. Recarga la página.';}});


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
    if(!isOfficialHistory(h))return false;
    const same=String(historyAthleteId(h))===String(id);
    const distTime=historyTimeFor(h,d);
    const date=historyDate(h);
    return same&&distTime!=null&&(!from||date>=from)&&(!to||date<=to);
  });
  const times=rows.map(h=>historyTimeFor(h,d)).filter(x=>Number.isFinite(x)&&x>0);
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
  const rows=(state.db.history||[]).filter(h=>isOfficialHistory(h)&&String(historyAthleteId(h))===String(id)&&historyTimeFor(h,d)!=null);
  const times=rows.map(h=>historyTimeFor(h,d)).filter(x=>Number.isFinite(x)&&x>0);
  if(!times.length)return alert('No hay resultados para imprimir.');
  const w=window.open('','_blank'); if(!w)return alert('Permite ventanas emergentes para generar la ficha.');
  const best=Math.min(...times), mean=times.reduce((x,y)=>x+y,0)/times.length;
  w.document.write(`<html><head><title>ARS SPRINT — Ficha</title><style>body{font-family:Arial;padding:32px}h1{margin-bottom:4px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.box{border:1px solid #ddd;padding:16px;border-radius:10px}.box b{font-size:22px;display:block;margin-top:6px}</style></head><body><h1>ARS SPRINT V26.86</h1><p><b>Deportista:</b> ${athleteName(a)}<br><b>Prueba:</b> ${d} m<br><b>Registros:</b> ${times.length}</p><div class="grid"><div class="box">Mejor<b>${best.toFixed(3)} s</b></div><div class="box">Promedio<b>${mean.toFixed(3)} s</b></div><div class="box">Último<b>${times[times.length-1].toFixed(3)} s</b></div></div><h2>Historial</h2><ol>${rows.map(h=>`<li>${historyDate(h)||'Sin fecha'} — ${formatSec(historyTimeFor(h,d))}</li>`).join('')}</ol><script>window.onload=()=>window.print()<\/script></body></html>`);
  w.document.close();
}

$('printReport')?.addEventListener('click',printAthleteReport);


function profileRows(id){
  return (state.db.history||[]).filter(h=>String(historyAthleteId(h))===String(id)&&isOfficialHistory(h));
}
function profileStats(rows,d){
  const ts=rows.map(h=>historyTimeFor(h,d)).filter(x=>Number.isFinite(x)&&x>0);
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
  if(poseAiTask){if(liveStatus)liveStatus.textContent='🧠 IA corporal: lista ✓';if($('liveAiHint'))$('liveAiHint').textContent='🧠 IA corporal: lista ✓';return poseAiTask}
  if(poseAiLoading)return poseAiLoading;
  if(status)status.textContent='Cargando modelo de pose…';if(liveStatus)liveStatus.textContent='🧠 IA corporal: cargando…';if($('liveAiHint'))$('liveAiHint').textContent='🧠 IA corporal: cargando…';
  poseAiLoading=(async()=>{try{
    const mod=await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14');
    const vision=await mod.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm');
    const models=['https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/1/pose_landmarker_full.task','https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'];
    const options={runningMode:'VIDEO',numPoses:3,minPoseDetectionConfidence:.18,minPosePresenceConfidence:.18,minTrackingConfidence:.22};let lastErr=null;
    for(const modelAssetPath of models){for(const delegate of ['GPU',undefined]){try{const base={modelAssetPath};if(delegate)base.delegate=delegate;poseAiTask=await mod.PoseLandmarker.createFromOptions(vision,{baseOptions:base,...options});break}catch(e){lastErr=e;console.warn('PoseLandmarker',delegate,e)}}if(poseAiTask)break}
    if(!poseAiTask)throw lastErr||new Error('No se pudo crear PoseLandmarker');
    if(status)status.textContent='✓ IA de pose cargada.';if(liveStatus)liveStatus.textContent='🧠 IA corporal: lista ✓';if($('liveAiHint'))$('liveAiHint').textContent='🧠 IA corporal: lista ✓';return poseAiTask;
  }catch(err){poseAiLoading=null;if(status)status.textContent='❌ IA no disponible · modo manual';if(liveStatus)liveStatus.textContent='⚠️ IA no disponible · modo manual';if($('liveAiHint'))$('liveAiHint').textContent='⚠️ IA no disponible · usa MARCAR INICIO/FINAL';console.error(err);throw err}})();return poseAiLoading}

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
  const capture=fps>=24 && p.cameraSide==='Lateral' && p.calibration==='confirmada';
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

/* ARS SPRINT V26.86 — LIVE CAMERA / POSE ENGINE */
state.live=state.live||{stream:null,armed:false,running:false,lastX:null,lastT:null,startTime:null,finishTime:null,observedFps:0,frames:0,body:null,landmarks:[],poses:[],targetPose:null,lockPoint:null,raf:0,poseBusy:false,sourceFps:null,width:0,height:0,direction:null,directionVotes:[],armedAt:0,lastMediaTime:null,lastPerf:0,ring:[],ringMax:300,ringSlice:2,ringHeight:360,photoUrl:null,lastPoseTs:0,stableHits:0,stableX:[],lastBodyAt:0,clockStartPerf:0,smoothedX:null,smoothedY:null};
function liveDistanceX(){const d=Number(distance());const exact=Number(state.vision?.positions?.[String(d)]);if(Number.isFinite(exact))return exact;return Number.isFinite(state.track.finishX)?state.track.finishX:.88}
function liveSetStatus(text){$('liveInstruction')&&($('liveInstruction').textContent=text)}
function videoContentRect(v){const r=v.getBoundingClientRect(),vw=v.videoWidth||1,vh=v.videoHeight||1,scale=Math.min(r.width/vw,r.height/vh),cw=vw*scale,ch=vh*scale;return{left:(r.width-cw)/2,top:(r.height-ch)/2,width:cw,height:ch}}
function liveDraw(){
  const a=athlete($('athleteSelect')?.value),d=Number(distance());
  if($('liveAthleteChip'))$('liveAthleteChip').textContent=a?`Deportista: ${a.name} · ${d} m`:'Deportista: —';
  if($('liveGuideFinish'))$('liveGuideFinish').textContent='20.00 m';
  if($('liveCalibrationText'))$('liveCalibrationText').textContent=`Análisis seleccionado: ${d.toFixed(2)} m · sprint Smart siempre 0–5–10–20 m.`;
  const sx=Math.max(3,Math.min(97,(state.track.startX??.12)*100)),fx=Math.max(sx+5,Math.min(97,(Number(state.vision?.positions?.['20'])||state.track.finishX||.88)*100));
  const sl=document.querySelector('.live-line.start-line'),fl=document.querySelector('.live-line.finish-line');
  if(sl)sl.style.left=sx+'%';
  if(fl)fl.style.left=fx+'%';
  [5,10].forEach(g=>{const el=$('liveGate'+g),gx=gateXForDistance(g);if(!el)return;const visible=gx!=null;el.style.left=visible?(gx*100)+'%':'-9999px';el.style.display=visible?'block':'none';el.style.pointerEvents=state.calibration?.editing?'auto':'none';});
  liveUpdateKpis();
}

function liveUpdateKpis(){if($('liveFps'))$('liveFps').textContent=(state.live.observedFps||state.live.sourceFps)?(state.live.observedFps||state.live.sourceFps).toFixed(1)+' fps':'—';if($('liveObservedFps'))$('liveObservedFps').textContent=state.live.observedFps?state.live.observedFps.toFixed(1)+' fps':'—';if($('liveBodyState'))$('liveBodyState').textContent=state.live.body?(state.live.body.visibility>=.35?'🟢 '+(athlete($('athleteSelect')?.value)?.name||'Atleta'):'🟡 Atleta detectado · baja confianza'):'🔴 No detectado';if($('liveMeasureState'))$('liveMeasureState').textContent=state.live.finishTime!=null?'FINALIZADO':state.live.startTime!=null?'CORRIENDO':state.live.armed?'ARMADO':'Listo';if($('liveAiHint')&&!state.live.stream)$('liveAiHint').textContent=poseAiTask?'🧠 IA corporal: lista ✓':'🧠 IA corporal: preparando…'}
function liveFrameTimestamp(meta){const p=performance.now()/1000;if(!state.live.clockStartPerf)state.live.clockStartPerf=p;return p-state.live.clockStartPerf}
function liveCaptureSlice(){const v=$('liveVideo');if(!v.videoWidth||!v.videoHeight)return;const h=state.live.ringHeight,w=320,tmp=document.createElement('canvas');tmp.width=w;tmp.height=h;const tx=tmp.getContext('2d',{willReadFrequently:true});tx.drawImage(v,0,0,w,h);const slice=Math.max(1,Math.min(4,state.live.ringSlice));const x=Math.max(0,Math.min(w-slice,Math.round(liveDistanceX()*w-slice/2)));const data=tx.getImageData(x,0,slice,h);state.live.ring.push({data:data.data.slice(),width:slice,height:h,time:state.live.lastMediaTime??v.currentTime});if(state.live.ring.length>state.live.ringMax)state.live.ring.shift()}
function buildLivePhotoFinish(){const ring=state.live.ring;if(ring.length<2)return null;const slice=ring[0].width,h=ring[0].height,c=$('liveFinishCanvas');if(!c)return null;c.width=ring.length*slice;c.height=h;const ctx=c.getContext('2d');for(let i=0;i<ring.length;i++)ctx.putImageData(new ImageData(new Uint8ClampedArray(ring[i].data),slice,h),i*slice,0);const url=c.toDataURL('image/png');state.live.photoUrl=url;if($('liveFinishStatus'))$('liveFinishStatus').textContent=`GENERADO · ${ring.length} muestras`;if($('photoFinishStatus'))$('photoFinishStatus').textContent='GENERADO';if($('photoFinishMeta'))$('photoFinishMeta').textContent=`En vivo · ${ring.length} muestras · ${state.live.sourceFps?state.live.sourceFps.toFixed(1):'—'} fps · línea final ${Math.round(liveDistanceX()*100)}%`;return url}
function updateCalibrationUI(){const d=distance();state.calibration.target=d;if($('calTarget'))$('calTarget').textContent=d.toFixed(2)+' m';if($('liveCalibrationText'))$('liveCalibrationText').textContent=`Objetivo ${d.toFixed(2)} m. La cámara te guía usando una referencia física visible y comprueba encuadre, atleta, inicio y final.`;if($('calibrationState'))$('calibrationState').textContent=state.calibration.saved?'CALIBRACIÓN GUARDADA':state.calibration.estimated?'ESTIMADA':'Pendiente';if($('calQuality'))$('calQuality').textContent=state.calibration.saved?`${d.toFixed(2)} m · Guardada`:state.calibration.quality==='Guía preparada'?'Guía preparada · confirma marcas físicas':'No calibrado';}
async function startLiveCamera(){
  if(!window.isSecureContext){const msg='La cámara requiere HTTPS. Abre ARS SPRINT desde GitHub Pages (HTTPS) y permite el acceso a la cámara.';liveSetStatus('🔒 '+msg);alert(msg);return;}
  if(!navigator.mediaDevices?.getUserMedia){
    const secure=window.isSecureContext;
    const msg=secure?'Este navegador no expone acceso a la cámara. Revisa los permisos de cámara y usa Safari/Chrome actualizado.':'La cámara necesita una página segura (HTTPS) o localhost. Abre ARS SPRINT desde una dirección HTTPS y permite el acceso a la cámara.';
    liveSetStatus('📷 Cámara no disponible: '+msg);
    alert(msg);
    return;
  }
  try{
    // No bloqueamos file:// de forma preventiva: algunos navegadores lo consideran un contexto confiable.
    // Dejamos que getUserMedia() determine el permiso real y mostramos el error exacto si lo rechaza.
    stopLiveCamera(false);
    const facing=$('cameraFacing')?.value||'environment';
    const constraints=[
      {audio:false,video:{facingMode:{ideal:facing},width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30,max:30}}},
      {audio:false,video:{facingMode:{ideal:facing},width:{ideal:960},height:{ideal:540},frameRate:{max:30}}},
      {audio:false,video:{facingMode:{ideal:facing},frameRate:{max:30}}},
      {audio:false,video:{width:{ideal:640},height:{ideal:480}}},
      {audio:false,video:true}
    ];
    let stream=null,lastErr=null;for(const c of constraints){try{stream=await navigator.mediaDevices.getUserMedia(c);break}catch(e){lastErr=e}}
    if(!stream){const err=lastErr||new Error('No se pudo abrir la cámara');const name=err.name||'CameraError';throw new Error(`${name}: ${err.message||'permiso o dispositivo no disponible'}`)}
    state.live.stream=stream;
    const v=$('liveVideo');v.autoplay=true;v.muted=true;v.defaultMuted=true;v.playsInline=true;v.controls=false;v.disablePictureInPicture=true;v.setAttribute('playsinline','');v.setAttribute('webkit-playsinline','');v.setAttribute('disablepictureinpicture','');v.srcObject=stream;
    // Safari/iPad: remove placeholder before playback so no dark layer can cover the camera.
    $('liveStage')?.classList.add('camera-active');
    await new Promise((resolve,reject)=>{if(v.readyState>=1&&v.videoWidth){resolve();return}let done=false;const ok=()=>{if(!done){done=true;resolve()}};v.addEventListener('loadedmetadata',ok,{once:true});setTimeout(()=>{if(!done){done=true;reject(new Error('La cámara no entregó imagen'))}},6000)});
    await v.play();if(!v.videoWidth||!v.videoHeight)throw new Error('La cámara abrió pero no entregó imagen');
    const track=stream.getVideoTracks()[0],settings=track.getSettings();
    state.live.cameraFacing=settings.facingMode||facing;state.live.sourceFps=Number(settings.frameRate)||null;state.fps=state.live.sourceFps;state.live.width=Number(settings.width)||v.videoWidth;state.live.height=Number(settings.height)||v.videoHeight;
    Object.assign(state.live,{armed:false,running:true,clockStartPerf:performance.now()/1000,smoothedX:null,smoothedY:null,lastX:null,lastT:null,startTime:null,finishTime:null,direction:null,directionVotes:[],armedAt:0,lastMediaTime:null,lastPerf:0,observedFps:0,ring:[],body:null,stableHits:0,lastPoseTs:0,lastPosePerf:0,aiFrames:0,aiHits:0,aiErrors:0,landmarks:[],poses:[],targetPose:null,lockPoint:null,clockStartPerf:performance.now()});
    state.start=null;state.finish=null;state.track.torso=null;state.track.auto=false;
    $('liveStatus').textContent='CÁMARA ACTIVA';$('startCamera').disabled=false;$('startCamera').textContent='🔎 BUSCANDO ATLETA…';$('manualStartLive')?.removeAttribute('disabled');$('manualFinishLive')?.removeAttribute('disabled');$('stopCamera').disabled=false;
    $('fpsInput').value='custom';$('customFpsWrap').classList.remove('hidden');$('customFps').value=state.live.sourceFps||'';$('sourceFps').textContent=state.live.sourceFps?state.live.sourceFps.toFixed(1)+' fps (cámara)':'Detectando…';
    liveSetStatus(`📏 ${distance()} m · cámara lista. Coloca al atleta completamente visible sobre INICIO.`);liveUpdateKpis();liveDraw();liveSchedule();
    loadPoseAI().catch(()=>liveSetStatus('⚠️ Cámara funcionando. IA no disponible: puedes usar MARCAR INICIO y MARCAR FINAL.'));
  }catch(e){console.error(e);stopLiveCamera(false);alert('No se pudo abrir la cámara. '+(e.name||'Error')+': '+(e.message||'revisa permisos, HTTPS y la cámara seleccionada.'))}
}

function armLiveMeasurement(){
  if(!state.live.stream){startLiveCamera();return}
  if(!$('athleteSelect').value){alert('Primero selecciona un deportista.');return}
  state.live.armed=true;state.live.startTime=null;state.live.finishTime=null;state.live.lastX=null;state.live.lastT=null;state.live.lastMediaTime=null;state.live.observedFps=0;state.live.direction=null;state.live.directionVotes=[];state.live.armedAt=performance.now();state.live.smoothedX=null;state.live.smoothedY=null;state.live.ring=[];state.live.lockPoint=state.live.body?{x:state.live.body.x,y:state.live.body.y}:null;state.start=null;state.finish=null;state.gates={};
  $('startCamera').textContent='🔴 ESPERANDO INICIO…';$('startCamera').disabled=true;liveSetStatus(`🟢 MEDICIÓN ARMADA · ${distance()} m · corre desde INICIO hasta FINAL.`);liveUpdateKpis();
}

function liveCrossed(a,b,line,dir){return dir>0?(a<line&&b>=line):(a>line&&b<=line)}
function liveTrackPoint(lm,fallback){
  if(!lm||!Array.isArray(lm)) return fallback||null;
  const hips=[lm[23],lm[24]].filter(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&(p.visibility??1)>=.25);
  const shoulders=[lm[11],lm[12]].filter(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&(p.visibility??1)>=.25);
  if(hips.length===2){
    return {x:(hips[0].x+hips[1].x)/2,y:(hips[0].y+hips[1].y)/2,visibility:((hips[0].visibility??1)+(hips[1].visibility??1))/2};
  }
  if(shoulders.length===2){
    return {x:(shoulders[0].x+shoulders[1].x)/2,y:(shoulders[0].y+shoulders[1].y)/2,visibility:((shoulders[0].visibility??1)+(shoulders[1].visibility??1))/2};
  }
  return fallback||null;
}
async function liveProcessFrame(media,perf){
  if(!state.live.running)return;
  const prevMedia=state.live.lastMediaTime;
  if(prevMedia!=null){const dt=media-prevMedia;if(dt>0&&dt<.25){const inst=1/dt;state.live.observedFps=state.live.observedFps?state.live.observedFps*.85+inst*.15:inst}}
  state.live.lastMediaTime=media;state.live.lastPerf=perf;state.live.frames=(state.live.frames||0)+1;
  if(state.live.armed)liveCaptureSlice();
  if(!state.live.poseBusy&&poseAiTask&&$('liveVideo').readyState>=2&&(perf-(state.live.lastPosePerf||0)>=33)){
    state.live.lastPosePerf=perf;
    state.live.poseBusy=true;
    try{
      const ts=Math.max(Math.round(media*1000),Number(state.live.lastPoseTs||0)+1);state.live.lastPoseTs=ts;
      const r=poseAiTask.detectForVideo($('liveVideo'),ts);
      state.live.aiFrames=(state.live.aiFrames||0)+1;state.live.poses=r?.landmarks||[];state.live.worldLandmarks=r?.worldLandmarks||[];
      const chosen=chooseLivePose(state.live.poses);
      if(chosen)state.live.aiHits=(state.live.aiHits||0)+1;
      state.live.targetPose=chosen;state.live.landmarks=chosen?.lm||[];
      const torso=chosen?.t||null;const raw=liveTrackPoint(chosen?.lm,torso);
      if(torso&&raw){
        const alpha=state.live.smoothedX==null?.35:.22;
        state.live.smoothedX=state.live.smoothedX==null?raw.x:state.live.smoothedX+(raw.x-state.live.smoothedX)*alpha;
        state.live.smoothedY=state.live.smoothedY==null?raw.y:state.live.smoothedY+(raw.y-state.live.smoothedY)*alpha;
        const trackPoint={x:state.live.smoothedX,y:state.live.smoothedY,visibility:raw.visibility};
        if(!state.live.lockPoint&&trackPoint.visibility>=.45)state.live.lockPoint={x:trackPoint.x,y:trackPoint.y};
        const prev=state.live.lastX;state.live.body=torso;state.live.trackPoint=trackPoint;state.track.torso=trackPoint;
        if(torso.visibility>=.38)state.live.stableHits=(state.live.stableHits||0)+1;else state.live.stableHits=Math.max(0,(state.live.stableHits||0)-2);
        if(!state.live.armed&&state.live.startTime==null&&state.live.stableHits>=6){
          $('liveStatus').textContent='ATLETA DETECTADO';$('startCamera').disabled=false;$('startCamera').textContent='🟢 INICIAR MEDICIÓN';
          if($('liveAiHint'))$('liveAiHint').textContent=`🟢 Atleta detectado · confianza ${(torso.visibility*100).toFixed(0)}%`;
          liveSetStatus('🟢 ATLETA DETECTADO · coloca al atleta antes de INICIO y pulsa INICIAR MEDICIÓN.');
        }
        const startLine=state.track.startX??.12,finishLine=liveDistanceX();
        const gateEvents=state.live.gates||{};
        if(state.live.armed&&prev!=null&&state.live.startTime==null){
          const dx=trackPoint.x-prev;
          if(Math.abs(dx)>=.0025){
            state.live.directionVotes=(state.live.directionVotes||[]).concat(dx>0?1:-1).slice(-9);
            const pos=state.live.directionVotes.filter(x=>x>0).length,neg=state.live.directionVotes.filter(x=>x<0).length;
            if(pos>=6||neg>=6)state.live.direction=pos>=6?1:-1;
          }
          if(state.live.direction&&performance.now()>state.live.armedAt+500&&torso.visibility>=.38&&liveCrossed(prev,trackPoint.x,startLine,state.live.direction)){
            const alpha=Math.max(0,Math.min(1,(startLine-prev)/((trackPoint.x-prev)||1)));const eventTime=prevMedia!=null?prevMedia+alpha*(media-prevMedia):media;
            state.live.startTime=eventTime;state.start={time:eventTime,frame:state.live.sourceFps?Math.round(eventTime*state.live.sourceFps):null,mode:'live-pose-interpolated',bodyDetected:true,visibility:torso.visibility};
            liveSetStatus(`🟢 INICIO detectado · ${eventTime.toFixed(3)} s · dirección ${state.live.direction>0?'→':'←'}`);updateMarks();updateResult();
          }
        }else if(state.live.armed&&state.live.startTime!=null&&prev!=null&&state.live.direction&&torso.visibility>=.38){
          // V26.86: Smart Sprint is the sole automatic event authority.
          // Legacy LIVE must not create 5 m, 10 m or FINAL events.
          // Smart Sprint receives the tracked samples below and owns all
          // official automatic crossings.
        }
        state.live.lastX=trackPoint.x;
      }else if(!state.live.armed){state.live.smoothedX=null;state.live.smoothedY=null;state.live.body=null;state.track.torso=null;state.live.stableHits=0;}
    }catch(e){state.live.aiErrors=(state.live.aiErrors||0)+1;if($('liveAiHint'))$('liveAiHint').textContent='⚠️ IA sin lectura temporal · pulsa Reintentar IA o usa marcaje manual';console.warn('live pose',e)}finally{state.live.poseBusy=false}
  }
  liveUpdateKpis();liveDraw();
}

function liveSchedule(){const v=$('liveVideo');if(!state.live.running)return;if('requestVideoFrameCallback' in HTMLVideoElement.prototype){state.live.raf=v.requestVideoFrameCallback((now,meta)=>{liveProcessFrame(liveFrameTimestamp(meta),now);liveSchedule()})}else{state.live.raf=requestAnimationFrame(now=>{liveProcessFrame(liveFrameTimestamp(),now);liveSchedule()})}}
function stopLiveCamera(reset=true){if(state.live.raf){const v=$('liveVideo');if(v?.cancelVideoFrameCallback&&'requestVideoFrameCallback' in HTMLVideoElement.prototype){try{v.cancelVideoFrameCallback(state.live.raf)}catch{}}else cancelAnimationFrame(state.live.raf)}state.live.raf=0;state.live.running=false;state.live.armed=false;state.live.poseBusy=false;state.live.lastPoseTs=0;state.live.directionVotes=[];if(state.live.stream){state.live.stream.getTracks().forEach(t=>t.stop());state.live.stream=null}const v=$('liveVideo');if(v)v.srcObject=null;if($('liveStatus'))$('liveStatus').textContent='CÁMARA APAGADA';$('liveStage')?.classList.remove('camera-active');if($('startCamera')){$('startCamera').disabled=false;$('startCamera').textContent='▶ COMENZAR PRUEBA'}if($('stopCamera'))$('stopCamera').disabled=true;if($('manualStartLive'))$('manualStartLive').disabled=true;if($('manualFinishLive'))$('manualFinishLive').disabled=true;if(reset)liveSetStatus('Cámara detenida.');liveUpdateKpis()}

function bindLiveCalibrationDrag(){
  const stage=$('liveStage');if(!stage)return;
  let dragging=null;
  stage.addEventListener('pointerdown',e=>{
    if(!state.calibration?.editing)return;
    const target=e.target.closest?.('.live-line');
    if(!target)return;
    dragging=target;target.setPointerCapture?.(e.pointerId);e.preventDefault();
  });
  stage.addEventListener('pointermove',e=>{
    if(!dragging||!state.calibration?.editing)return;
    const r=stage.getBoundingClientRect();let x=(e.clientX-r.left)/r.width;x=Math.max(.02,Math.min(.98,x));
    const id=dragging.id; if(id==='liveGate5')state.vision.positions['5']=x;else if(id==='liveGate10')state.vision.positions['10']=x;else if(id==='liveGate20'){state.vision.positions['20']=x;state.track.finishX=x;}
    liveDraw();
  });
  stage.addEventListener('pointerup',()=>{dragging=null});stage.addEventListener('pointercancel',()=>{dragging=null});
}

function bindLiveCamera(){
  if(!$('startCamera'))return;
  $('startCamera').onclick=async()=>{if(state.live?.finishTime){stopLiveCamera(false);return startLiveCamera()}if(state.live?.stream){return armLiveMeasurement()}return startLiveCamera()};
  $('manualStartLive')?.addEventListener('click',()=>{if(!state.live?.stream){alert('Primero abre la cámara.');return}if(!state.live.armed){armLiveMeasurement();if(!state.live.armed)return}const t=state.live.lastMediaTime??0;state.live.startTime=t;state.start={time:t,frame:state.live.sourceFps?Math.round(t*state.live.sourceFps):null,mode:'live-manual',bodyDetected:!!state.live.body};liveSetStatus(`🟢 INICIO manual · ${t.toFixed(3)} s`);updateMarks();updateResult();liveUpdateKpis()});
  $('manualFinishLive')?.addEventListener('click',()=>{if(!state.live?.stream){alert('Primero abre la cámara.');return}if(state.live.startTime==null){alert('Primero marca INICIO.');return}const t=state.live.lastMediaTime??0;if(t<=state.live.startTime){alert('FINAL debe ser posterior a INICIO.');return}state.live.finishTime=t;state.live.armed=false;state.finish={time:t,frame:state.live.sourceFps?Math.round(t*state.live.sourceFps):null,mode:'live-manual',bodyDetected:!!state.live.body};$('startCamera').disabled=false;$('startCamera').textContent='🔁 NUEVO INTENTO';buildLivePhotoFinish();liveSetStatus(`🏁 FINAL manual · ${t.toFixed(3)} s · ${(t-state.start.time).toFixed(3)} s`);updateMarks();updateResult();updateSaveState();liveUpdateKpis()});
  $('stopCamera').onclick=()=>stopLiveCamera();$('liveVideo').addEventListener('loadedmetadata',liveDraw);window.addEventListener('resize',liveDraw);$('retryPoseLiveBtn')?.addEventListener('click',()=>{poseAiTask=null;poseAiLoading=null;if($('liveAiHint'))$('liveAiHint').textContent='🧠 IA corporal: cargando…';loadPoseAI().catch(()=>{})});
}


// V26.86: live engine retained; measurement controls remain explicit and safe.

/* ARS SPRINT V26.86 — SMART SPRINT SPECIFICATION LAYER
   Adds multi-split tracking, visible pose skeleton, velocity profile, biomechanics estimates,
   confidence, ARS Speed Score, athlete progression and report-ready metadata without removing V26 features. */
(function(){
  const SMART_VERSION='V26.86';
  window.__ARS_SMART_AUTHORITATIVE=true;
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const finite=v=>Number.isFinite(v);
  const angle=(a,b,c)=>{if(!a||!b||!c)return null;const ux=a.x-b.x,uy=a.y-b.y,vx=c.x-b.x,vy=c.y-b.y,du=Math.hypot(ux,uy),dv=Math.hypot(vx,vy);if(!du||!dv)return null;return Math.acos(clamp((ux*vx+uy*vy)/(du*dv),-1,1))*180/Math.PI};
  const mid=(a,b)=>a&&b?{x:(a.x+b.x)/2,y:(a.y+b.y)/2,visibility:Math.min(a.visibility??1,b.visibility??1)}:null;
  const points=(lm)=>({head:lm?.[0],ls:lm?.[11],rs:lm?.[12],le:lm?.[13],re:lm?.[14],lw:lm?.[15],rw:lm?.[16],lh:lm?.[23],rh:lm?.[24],lk:lm?.[25],rk:lm?.[26],la:lm?.[27],ra:lm?.[28],lf:lm?.[31],rf:lm?.[32]});
  function ensureSmart(){state.live=state.live||{};state.live.smart=state.live.smart||{splitTimes:{},speedSamples:[],poseSamples:[],peak:{speed:0,distance:0,time:0,source:'none'},lastX:null,lastT:null,started:false,finished:false,confidenceSamples:[],biomechSamples:[]};return state.live.smart}
  function gateXForDistance(g){
    // Official automatic sprint always records all three gates. The UI
    // distance selector is an analysis filter, never a race-length limiter.
    if(![5,10,20].includes(Number(g)))return null;
    const exact=Number(state.vision?.positions?.[String(g)]);
    return finite(exact)?exact:null;
  }
  // Automatic LIVE measurement always records the complete official sprint:
  // START -> 5 m -> 10 m -> 20 m. The UI distance selector is only an analysis
  // filter and must never shorten the automatic race.
  function autoGateX(g){
    if(![5,10,20].includes(Number(g)))return null;
    const exact=Number(state.vision?.positions?.[String(g)]);
    return finite(exact)?exact:null;
  }
  // V26.86: map image position to distance using the independently calibrated
  // 0/5/10/20 m gates. Never assume that image distance is linear across 0–20 m.
  function liveXToDistance(x){
    const dMax=20; // El motor LIVE siempre recorre el sprint oficial completo 0–20 m.
    const pts=[
      {d:0,x:Number(state.vision?.positions?.['0'] ?? state.track.startX)},
      {d:5,x:Number(state.vision?.positions?.['5'])},
      {d:10,x:Number(state.vision?.positions?.['10'])},
      {d:20,x:Number(state.vision?.positions?.['20'])}
    ].filter(p=>p.d<=dMax&&finite(p.x)).sort((a,b)=>a.d-b.d);
    if(pts.length<2)return null;
    const dir=pts.at(-1).x>=pts[0].x?1:-1;
    for(let i=1;i<pts.length;i++){
      const a=pts[i-1],b=pts[i];
      const lo=Math.min(a.x,b.x),hi=Math.max(a.x,b.x);
      if(x>=lo-1e-9&&x<=hi+1e-9&&b.x!==a.x){
        const u=(x-a.x)/(b.x-a.x);
        return a.d+u*(b.d-a.d);
      }
    }
    return x<Math.min(...pts.map(p=>p.x))?(dir>0?0:dMax):(dir>0?dMax:0);
  }
  function resetSmart(){state.live.smart={splitTimes:{},speedSamples:[],poseSamples:[],peak:{speed:0,distance:0,time:0,source:'none'},lastX:null,lastT:null,started:false,finished:false,confidenceSamples:[],biomechSamples:[]};}
  window.__arsResetSmart=resetSmart;
  function drawSkeleton(){const svg=$('liveSkeletonSvg'),lines=$('liveSkeletonLines'),pts=$('liveSkeletonPoints'),badge=$('liveAiBadge');if(!svg||!lines||!pts)return;const lm=state.live?.landmarks;if(!lm?.length){lines.innerHTML='';pts.innerHTML='';if(badge)badge.textContent='🧠 IA: buscando cuerpo';return;}svg.setAttribute('viewBox','0 0 1 1');const edges=[[11,12],[11,23],[12,24],[23,24],[11,13],[13,15],[12,14],[14,16],[23,25],[25,27],[24,26],[26,28],[0,11],[0,12]];lines.innerHTML=edges.map(([a,b])=>{const p=lm[a],q=lm[b];if(!p||!q||(p.visibility??1)<.25||(q.visibility??1)<.25)return '';return `<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}"/>`}).join('');const ids=[0,11,12,13,14,15,16,23,24,25,26,27,28];pts.innerHTML=ids.map(i=>{const p=lm[i];return p&&(p.visibility??1)>=.25?`<circle cx="${p.x}" cy="${p.y}" r=".012"/>`:''}).join('');const conf=state.live?.targetPose?.score||state.live?.body?.visibility||0;if(badge)badge.textContent=`🧠 IA corporal · ${Math.round(clamp(conf)*100)}% · ${state.live?.startTime!=null?'tracking activo':'atleta detectado'}`;}
  function updateSmartUI(){const sm=ensureSmart(),a=athlete($('athleteSelect')?.value);if($('smartAthleteState'))$('smartAthleteState').textContent=state.live?.body?(a?.name||'Atleta'):'No detectado';const conf=state.live?.body?.visibility||state.live?.targetPose?.score||0;if($('smartPoseConfidence'))$('smartPoseConfidence').textContent=state.live?.body?`Confianza ${Math.round(clamp(conf)*100)}%`:'Confianza —';if($('smartTrackingState'))$('smartTrackingState').textContent=state.live?.finishTime!=null?'Finalizado':state.live?.startTime!=null?'Corriendo':state.live?.armed?'Armado':'En espera';if($('smartTrackingDetail'))$('smartTrackingDetail').textContent=state.live?.direction?(state.live.direction>0?'Dirección →':'Dirección ←'):'Dirección pendiente';const cal=state.calibration?.saved?'🟢 Confirmada':state.calibration?.quality==='Guía preparada'?'🟡 Guía preparada':'🔴 Pendiente';if($('smartCalState'))$('smartCalState').textContent=cal;if($('smartCalDetail'))$('smartCalDetail').textContent=state.calibration?.saved?`0–20 m · ${state.live?.sourceFps?Math.round(state.live.sourceFps)+' FPS':''}`:'Marca físicamente 0–5–10–20 m y verifica encuadre';const q=qualityInfo();if($('smartQualityState'))$('smartQualityState').textContent=q.label;if($('smartQualityDetail'))$('smartQualityDetail').textContent=`${q.score}/100 · FPS ${state.live?.sourceFps?Math.round(state.live.sourceFps):'—'}`;[5,10,20].forEach(g=>{const el=$('smartSplit'+g);if(el)el.textContent=sm.splitTimes[g]!=null?sm.splitTimes[g].toFixed(3)+' s':'—'});if($('smartPeakSpeed'))$('smartPeakSpeed').textContent=sm.peak?.speed?((sm.peak.speed*3.6).toFixed(2)):'—';if($('smartPeakAt'))$('smartPeakAt').textContent=sm.peak?.speed?sm.peak.distance.toFixed(1):'—';drawSmartCurve();updateBiomech();updateSpeedScore();}
  function drawSmartCurve(){const c=$('arsSpeedCurve');const sm=ensureSmart();if(!c)return;const samples=sm.speedSamples||[];const w=c.clientWidth||700,h=220,dpr=devicePixelRatio||1;c.width=w*dpr;c.height=h*dpr;const ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);ctx.font='11px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';ctx.fillStyle='#98a2b3';ctx.fillText('Velocidad (km/h)',8,15);ctx.fillText('Distancia (m)',w-90,h-8);if(samples.length<2){ctx.fillText('Esperando datos del sprint…',20,h/2);return;}const maxD=Math.max(20,Math.max(...samples.map(s=>s.distance)));const maxV=Math.max(1,Math.max(...samples.map(s=>s.speed))*1.12);ctx.strokeStyle='rgba(255,255,255,.12)';for(let i=0;i<5;i++){const y=25+(h-55)*i/4;ctx.beginPath();ctx.moveTo(38,y);ctx.lineTo(w-15,y);ctx.stroke();}ctx.strokeStyle='#ffd000';ctx.lineWidth=2.5;ctx.beginPath();samples.forEach((s,i)=>{const x=38+(w-55)*(s.distance/maxD),y=25+(h-55)*(1-s.speed/maxV);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke();samples.forEach(s=>{const x=38+(w-55)*(s.distance/maxD),y=25+(h-55)*(1-s.speed/maxV);ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x,y,2.5,0,Math.PI*2);ctx.fill()});ctx.fillStyle='#98a2b3';ctx.fillText('0',28,h-28);ctx.fillText(maxV.toFixed(0),5,30);}
  function updateBiomech(){const sm=ensureSmart(),s=sm.biomechSamples||[];if(!s.length)return;const avg=(key)=>{const v=s.map(x=>x[key]).filter(finite);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null};const fmt=v=>v==null?'—':`${v.toFixed(1)}°`;if($('bioKnee'))$('bioKnee').textContent=fmt(avg('knee'));if($('bioHip'))$('bioHip').textContent=fmt(avg('hip'));if($('bioAnkle'))$('bioAnkle').textContent=fmt(avg('ankle'));if($('bioTrunk'))$('bioTrunk').textContent=fmt(avg('trunk'));const cad=avg('cadence');if($('bioCadence'))$('bioCadence').textContent=cad==null?'—':`${cad.toFixed(0)} c/min*`;const stride=avg('stride');if($('bioStride'))$('bioStride').textContent=stride==null?'—':`${stride.toFixed(2)} m*`;const contact=avg('contact');if($('bioContact'))$('bioContact').textContent=contact==null?'—':`${contact.toFixed(0)} ms*`;const c=avg('confidence');if($('bioConfidence'))$('bioConfidence').textContent=c==null?'—':`${Math.round(c*100)}%`;}
  function sampleBiomech(lm,world,t){const p=points(lm);const knee=angle(p.lh,p.lk,p.la)||angle(p.rh,p.rk,p.ra);const hip=angle(p.ls,p.lh,p.lk)||angle(p.rs,p.rh,p.rk);const ankle=angle(p.lk,p.la,p.lf)||angle(p.rk,p.ra,p.rf);const shoulder=mid(p.ls,p.rs),hipm=mid(p.lh,p.rh);let trunk=null;if(shoulder&&hipm)trunk=Math.atan2(shoulder.x-hipm.x,Math.abs(shoulder.y-hipm.y))*180/Math.PI;const conf=[p.lh,p.rh,p.lk,p.rk,p.la,p.ra].map(x=>x?.visibility??0).filter(Boolean);const confidence=conf.length?conf.reduce((a,b)=>a+b,0)/conf.length:0;const sm=ensureSmart();let cadence=null,stride=null,contact=null;if(sm.poseSamples.length>6){const recent=sm.poseSamples.slice(-30);const dt=recent.at(-1).t-recent[0].t;if(dt>0){const ys=recent.map(r=>r.ankleY).filter(finite);if(ys.length>=7){const range=Math.max(...ys)-Math.min(...ys);const threshold=Math.max(.008,range*.12);let extrema=0,lastDir=0;for(let i=1;i<recent.length;i++){const y=recent[i].ankleY,py=recent[i-1].ankleY;if(!finite(y)||!finite(py))continue;const dy=y-py;if(Math.abs(dy)<threshold)continue;const dir=Math.sign(dy);if(lastDir&&dir!==lastDir)extrema++;lastDir=dir;}if(extrema>=2)cadence=Math.min(300,Math.max(60,(extrema/2)/(dt/60)));}const first=recent[0],last=recent.at(-1);const d0=liveXToDistance(first.x),d1=liveXToDistance(last.x);if(finite(d0)&&finite(d1)&&cadence>0){const cycles=Math.max(1,(cadence/60)*dt);stride=Math.max(.4,Math.min(3.5,Math.abs(d1-d0)/cycles));}if(confidence>=.7&&ys.length>=7&&((state.live?.sourceFps||0)>=24)){const stationary=ys.filter((y,i)=>i&&Math.abs(y-ys[i-1])<.004).length/Math.max(1,ys.length-1);contact=stationary>.2?Math.max(70,Math.min(180,70+110*stationary)):null;}}}return{knee,hip,ankle,trunk,cadence,stride,contact,confidence};}
  function updateSpeedScore(){
    const sm=ensureSmart(),s=sm.splitTimes||{};
    const t5=Number(s[5]),t10=Number(s[10]),t20=Number(s[20]);
    const complete=Number.isFinite(t5)&&Number.isFinite(t10)&&Number.isFinite(t20)&&t5>0&&t10>t5&&t20>t10;
    if(!complete){
      if($('smartSpeedScore'))$('smartSpeedScore').textContent='—';
      if($('arsAiAnalysis'))$('arsAiAnalysis').innerHTML='<b>🤖 Análisis ARS IA</b><p>Perfil pendiente: se requieren splits Smart válidos de 5 m, 10 m y 20 m.</p>';
      if($('arsRecommendations'))$('arsRecommendations').innerHTML='<b>🎯 Prioridades de entrenamiento</b><p>Pendiente de sprint completo 0–20 m. <small>No se genera un Speed Score definitivo con datos incompletos.</small></p>';
      return;
    }
    const v05=5/t5,v510=5/(t10-t5),v1020=10/(t20-t10);
    // Acceleration 0–5 m: approximate average acceleration from rest (a ≈ Δv/Δt).
    // It is a performance indicator, not a laboratory force/acceleration measurement.
    const a05=v05/t5;
    const acc=clamp(a05/4.5)*100;
    const prog=clamp((v510+v1020)/(2*8))*100;
    const global=clamp((sm.peak?.speed||0)/30.6)*100;
    const score=Math.round(acc*.35+prog*.25+global*.40);
    if($('smartSpeedScore'))$('smartSpeedScore').textContent=String(Math.min(100,Math.max(0,score)));
    const name=athleteName($('athleteSelect')?.value);
    const text=score>=85?'Perfil de sprint muy sólido para los datos disponibles.':score>=70?'Buen perfil; hay margen de mejora específico por fase.':'Resultado en desarrollo; prioriza la fase con menor velocidad relativa.';
    if($('arsAiAnalysis'))$('arsAiAnalysis').innerHTML=`<b>🤖 Análisis ARS IA · ${esc(name)}</b><p>${text} La velocidad media fue ${(v05*3.6).toFixed(1)} km/h en 0–5 m, ${(v510*3.6).toFixed(1)} km/h en 5–10 m y ${(v1020*3.6).toFixed(1)} km/h en 10–20 m; la aceleración media estimada en 0–5 m fue ${a05.toFixed(2)} m/s².</p>`;
    const rec=v1020<5?'Prioridad: 10–20 m · aceleración prolongada y transición.':v05<3.5?'Prioridad: 0–5 m · salida, aceleración corta y potencia.':'Prioridad: 5–10 m · progresión y técnica de aceleración.';
    if($('arsRecommendations'))$('arsRecommendations').innerHTML=`<b>🎯 Prioridades de entrenamiento</b><p>${rec} <small>Recomendación orientativa para el entrenador.</small></p>`;
  }
  function updateSmartSplitsFromExisting(){const sm=ensureSmart();const startT=state.live?.startTime??state.start?.time??null;for(const g of [5,10,20]){const gate=state.gates?.[String(g)];if(!gate||gate.mode!=='live-smart-split'||startT==null)continue;const t=Number(gate.time);if(Number.isFinite(t)&&t>=startT)sm.splitTimes[g]=t-startT;}const s=Object.entries(sm.splitTimes).map(([d,t])=>({distance:Number(d),time:Number(t)})).filter(x=>[5,10,20].includes(x.distance)&&x.time>0).sort((a,b)=>a.distance-b.distance);if(s.length){const splitSamples=[];let prevD=0,prevT=0;for(const x of s){const dt=x.time-prevT;if(dt>0)splitSamples.push({distance:x.distance,speed:(x.distance-prevD)/dt*3.6,time:x.time});prevD=x.distance;prevT=x.time;}const splitTimesSet=new Set(Object.values(sm.splitTimes||{}).map(Number).filter(Number.isFinite));const frameSamples=(sm.speedSamples||[]).filter(x=>Number.isFinite(x?.distance)&&Number.isFinite(x?.speed)&&Number.isFinite(x?.time)&&x.time<=Number(sm.splitTimes?.[20]||Infinity)&&!splitTimesSet.has(Number(x.time)));const taggedSplitSamples=splitSamples.map(x=>({...x,source:'split'}));sm.speedSamples=[...frameSamples,...taggedSplitSamples].sort((a,b)=>a.time-b.time).slice(-300);const best=sm.speedSamples.reduce((b,x)=>!b||Number(x.speed)>Number(b.speed)?x:b,null);sm.peak=best?{speed:Number(best.speed),distance:Number(best.distance),time:Number(best.time),source:best.source||'smart-split'}:{speed:0,distance:0,time:0,source:'none'};}updateSmartUI();}
  function processSmartCrossing(prevX,currX,prevT,currT){const sm=ensureSmart();if(state.live.startTime==null||state.live.direction==null)return;for(const g of [5,10,20]){const gx=autoGateX(g);if(gx==null||sm.splitTimes[g]!=null)continue;if(liveCrossed(prevX,currX,gx,state.live.direction)){const a=clamp((gx-prevX)/((currX-prevX)||1));const t=prevT+a*(currT-prevT);sm.splitTimes[g]=t-state.live.startTime;state.gates[String(g)]={time:t,frame:state.live.sourceFps?Math.round(t*state.live.sourceFps):null,mode:'live-smart-split',confidence:state.live.body?.visibility||null};const d=g;const prevD=Math.max(0,...Object.keys(sm.splitTimes).map(Number).filter(x=>x<g));const prevTime=prevD?sm.splitTimes[prevD]:0;const segDt=(t-state.live.startTime)-prevTime;const segDist=d-prevD;if(segDt>0){const speed=segDist/segDt*3.6;sm.speedSamples.push({distance:d,speed,time:t-state.live.startTime});if(speed>sm.peak.speed)sm.peak={speed,distance:d,time:t-state.live.startTime,source:'smart-split'};}}}if(sm.splitTimes[20]!=null&&state.live.finishTime==null){
      state.live.finishTime=state.live.startTime+sm.splitTimes[20];
      state.live.armed=false;
      sm.finished=true;
      state.live.finishDetectedAt=performance.now();
      state.finish={time:state.live.finishTime,frame:state.live.sourceFps?Math.round(state.live.finishTime*state.live.sourceFps):null,mode:'live-smart-split',bodyDetected:true,visibility:state.live.body?.visibility||null};
      buildLivePhotoFinish();
      if($('startCamera')){ $('startCamera').disabled=false; $('startCamera').textContent='🔁 NUEVO INTENTO'; }
      liveSetStatus(`🏁 FINAL detectado · ${state.live.finishTime.toFixed(3)} s · ${(state.live.finishTime-state.live.startTime).toFixed(3)} s · revisa y guarda.`);
      updateMarks(); updateResult(); updateSaveState();
    }
    updateSmartUI();}
  function sampleSmartMotion(currX,media){
    const sm=ensureSmart();
    if(state.live.startTime==null||state.live.direction==null||sm.finished)return;
    if(sm.lastX!=null&&sm.lastT!=null&&media>sm.lastT){
      const dt=media-sm.lastT;
      const prevDist=liveXToDistance(sm.lastX),dist=liveXToDistance(currX);
      const signedDd=(prevDist!=null&&dist!=null)?(dist-prevDist):null;
      const dd=(signedDd!=null&&signedDd>=-0.02)?Math.max(0,signedDd):null;
      const rawSpeed=(dd!=null&&dt>0)?dd/dt*3.6:null;
      const recent=sm.speedSamples.slice(-2).map(x=>x.speed).filter(Number.isFinite);
      const speed=(rawSpeed!=null&&rawSpeed<60)?[...recent,rawSpeed].sort((a,b)=>a-b)[Math.floor(([...recent,rawSpeed].length-1)/2)]:null;
      if(speed!=null&&speed>=0&&speed<60&&dist!=null){
        sm.speedSamples.push({distance:dist,speed,time:media-state.live.startTime});
        if(speed>sm.peak.speed)sm.peak={speed,distance:dist,time:media-state.live.startTime,source:'smart-frame'};
      }
    } else if(sm.speedSamples.length===0){
      sm.speedSamples.push({distance:0,speed:0,time:0});
    }
    sm.lastX=currX;sm.lastT=media;
  }
  const originalLiveProcessFrame=liveProcessFrame;
  liveProcessFrame=async function(media,perf){
    const beforeX=state.live?.trackPoint?.x,beforeT=state.live?.lastMediaTime;
    await originalLiveProcessFrame(media,perf);
    const curr=state.live?.trackPoint?.x;const sm=ensureSmart();
    // V26.86: automatic measurement readiness. Detection is automatic; START is still
    // generated only after a real crossing of the configured start line.
    if(state.live?.stream && !state.live.armed && state.live.startTime==null && state.live.finishTime==null &&
       state.live.stableHits>=12 && state.live.body?.visibility>=.45 && state.calibration?.saved && $('athleteSelect')?.value){
      resetSmart();
      state.live.armed=true; state.live.armedAt=performance.now(); state.live.direction=null; state.live.directionVotes=[];
      state.live.lastX=null; state.live.lastT=null;
      liveSetStatus('🟢 ATLETA BLOQUEADO · medición automática armada · sprint oficial 0–20 m');
      if($('startCamera')){ $('startCamera').disabled=true; $('startCamera').textContent='🔴 ESPERANDO INICIO…'; }
    }
    if(curr!=null){const prevX=sm.lastX??beforeX;const prevT=sm.lastT??beforeT;if(prevX!=null&&prevT!=null&&state.live.startTime!=null){processSmartCrossing(prevX,curr,prevT,media);sampleSmartMotion(curr,media);}sm.lastX=curr;sm.lastT=media;const lm=state.live.landmarks;if(lm?.length){const bm=sampleBiomech(lm,state.live.worldLandmarks,media);sm.biomechSamples.push(bm);sm.poseSamples.push({t:media,x:curr,ankleY:mid(lm[27],lm[28])?.y||null});if(sm.poseSamples.length>90)sm.poseSamples.shift();if(sm.biomechSamples.length>120)sm.biomechSamples.shift();}}drawSkeleton();updateSmartUI();};
  const oldStartLive=window.startLiveCamera;window.startLiveCamera=async function(){resetSmart();const r=await oldStartLive.apply(this,arguments);updateSmartUI();return r};
  const oldArm=window.armLiveMeasurement;window.armLiveMeasurement=function(){resetSmart();const r=oldArm.apply(this,arguments);updateSmartUI();return r};
  const oldCurrent=window.currentMeasurement;window.currentMeasurement=function(){const m=oldCurrent();if(!m)return m;const sm=ensureSmart();const selected=Number(distance());const liveRun=state.live?.stream||state.live?.startTime!=null||state.live?.finishTime!=null;if(liveRun){const s5=Number(sm.splitTimes?.[5]),s10=Number(sm.splitTimes?.[10]),s20=Number(sm.splitTimes?.[20]);const smartComplete=Number.isFinite(s5)&&Number.isFinite(s10)&&Number.isFinite(s20)&&s5>0&&s10>s5&&s20>s10;if(smartComplete){const selectedTime=Number(sm.splitTimes?.[selected]);if(!Number.isFinite(selectedTime)||selectedTime<=0)return null;m.distance=20;m.time=s20;m.ms=20/s20;m.kmh=m.ms*3.6;m.selectedDistance=selected;m.selectedTime=selectedTime;m.validationStatus='validated';m.visionValidated=true;}else{m.captureSource='camera-live-manual';m.validationStatus='manual';m.visionValidated=false;}}m.smartSprint={version:SMART_VERSION,splitTimes:{...sm.splitTimes},peakVelocity:sm.peak?.speed||null,peakDistance:sm.peak?.distance||null,peakSource:sm.peak?.source||'none',speedSamples:sm.speedSamples.slice(-300),biomech:{knee:sm.biomechSamples.map(x=>x.knee).filter(finite),hip:sm.biomechSamples.map(x=>x.hip).filter(finite),ankle:sm.biomechSamples.map(x=>x.ankle).filter(finite),trunk:sm.biomechSamples.map(x=>x.trunk).filter(finite),cadence:sm.biomechSamples.map(x=>x.cadence).filter(finite),stride:sm.biomechSamples.map(x=>x.stride).filter(finite),contact:sm.biomechSamples.map(x=>x.contact).filter(finite),confidence:sm.biomechSamples.map(x=>x.confidence).filter(finite)},speedScore:Number.isFinite(Number(sm.speedScore))?Number(sm.speedScore):null};return m};
  function buildSmartReport(){const a=athlete($('athleteSelect')?.value);const sm=ensureSmart();const s5=Number(sm.splitTimes?.[5]),s10=Number(sm.splitTimes?.[10]),t=Number(sm.splitTimes?.[20]);const complete=Number.isFinite(s5)&&Number.isFinite(s10)&&Number.isFinite(t)&&s5>0&&s10>s5&&t>s10;if(!a||!complete)return alert('Completa un sprint Smart válido de 5, 10 y 20 m y selecciona un deportista.');const score=Number.isFinite(Number(sm.speedScore))?Number(sm.speedScore).toFixed(0):'—';const html=`<html><head><meta charset="utf-8"><title>ARS SPRINT REPORT</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#111}h1{margin-bottom:4px}table{border-collapse:collapse;width:100%;margin:18px 0}td,th{border:1px solid #ddd;padding:8px}h2{margin-top:24px}</style></head><body><h1>ARS SPRINT REPORT</h1><p><b>Atleta:</b> ${esc(a.name)}<br><b>Fecha:</b> ${new Date().toLocaleString('es-PE')}</p><h2>Resultados</h2><table><tr><th>5 m</th><th>10 m</th><th>20 m</th><th>V. máxima</th><th>ARS Speed Score</th></tr><tr><td>${sm.splitTimes[5]?.toFixed(3)||'—'} s</td><td>${sm.splitTimes[10]?.toFixed(3)||'—'} s</td><td>${sm.splitTimes[20]?.toFixed(3)||'—'} s</td><td>${sm.peak?.speed?((sm.peak.speed*3.6).toFixed(2)):'—'} km/h</td><td>${score}/100</td></tr></table><h2>Análisis</h2><p>${$('arsAiAnalysis')?.innerText||'—'}</p><h2>Prioridades</h2><p>${$('arsRecommendations')?.innerText||'—'}</p><p><small>Las variables biomecánicas de una sola cámara son estimaciones y deben interpretarse con su nivel de confianza. ARS SPRINT no las presenta como mediciones de laboratorio.</small></p><script>window.print()</script></body></html>`;const w=window.open('','_blank');if(w){w.document.write(html);w.document.close();}}
  function smartCalibrate(){
    if(!state.live.stream)return alert('Abre la cámara primero.');
    const v=$('liveVideo'),w=v?.videoWidth||0,h=v?.videoHeight||0,fps=state.live.sourceFps||0;
    if(!w||!h)return alert('La cámara está abierta pero todavía no entregó imagen. Espera un instante y reintenta.');
    state.vision.positions=state.vision.positions||{};
    if(!state.calibration.editing){
      if(!Number.isFinite(Number(state.vision.positions['5'])))state.vision.positions['5']=.31;
      if(!Number.isFinite(Number(state.vision.positions['10'])))state.vision.positions['10']=.56;
      if(!Number.isFinite(Number(state.vision.positions['20'])))state.vision.positions['20']=.88;
      state.vision.positions['0']=Number(state.track.startX??.12);
      state.track.finishX=Number(state.vision.positions['20']);
      state.calibration.editing=true;state.calibration.saved=false;state.calibration.quality='Guía preparada';
      $('smartCalibrateBtn').textContent='✓ Confirmar calibración 0–5–10–20';
      liveDraw();
      liveSetStatus('📐 AJUSTE DE CALIBRACIÓN · arrastra las líneas 5 m, 10 m y 20 m hasta las marcas físicas y luego confirma.');
      return;
    }
    const physicalDistanceConfirmed=window.confirm('Confirma que las líneas 5 m, 10 m y 20 m coinciden físicamente con las marcas reales y que la cámara permanecerá fija.');
    if(!physicalDistanceConfirmed){liveSetStatus('📐 Calibración no confirmada. Ajusta las líneas y vuelve a confirmar.');return;}
    const p5=Number(state.vision.positions['5']),p10=Number(state.vision.positions['10']),p20=Number(state.vision.positions['20']);
    const ordered=[p5,p10,p20].every(Number.isFinite)&&p5>0&&p10>p5+.02&&p20>p10+.02&&p20<=.99;
    if(!ordered)return alert('Las puertas deben quedar ordenadas: 0 < 5 < 10 < 20 m.');
    const startX=Number(state.vision.positions['0']??state.track.startX??.12),span=Math.abs(p20-startX);
    const cameraReady=w>=640&&h>=360&&fps>=20;
    const score=Math.min(100,(cameraReady?45:15)+(ordered?35:0)+(span>=.25?10:0)+(physicalDistanceConfirmed?10:0));
    state.calibration.target=20;state.calibration.estimated=null;state.calibration.quality=ordered&&cameraReady?'🟢 CALIBRACIÓN CORRECTA':'🟡 CALIBRACIÓN A REVISAR';state.calibration.saved=ordered&&cameraReady;
    state.calibration.editing=false;state.track.finishX=Math.min(.97,Math.max(startX+.05,p20));
    state.vision.calibration={version:'V26.86',positions:{0:startX,5:p5,10:p10,20:p20},ordered,cameraReady,score,resolution:`${w}×${h}`,fps,physicalDistanceConfirmed,createdAt:new Date().toISOString()};
    state.db.trackCalibration=state.db.trackCalibration||{};state.db.trackCalibration.smart={distance:20,positions:state.vision.calibration.positions,camera:state.live.cameraFacing||null,fps,resolution:`${w}×${h}`,score,validated:state.calibration.saved,physicalDistanceConfirmed,createdAt:new Date().toISOString()};
    save();
    $('smartCalibrateBtn').textContent='📐 Recalibrar 0–5–10–20 m';
    if($('smartCalState'))$('smartCalState').textContent=state.calibration.saved?'🟢 CALIBRACIÓN CORRECTA':'🔴 CORREGIR CAPTURA';
    if($('smartCalDetail'))$('smartCalDetail').textContent=`0–5–10–20 m · ${w}×${h} · ${fps||'—'} fps · ${score}/100`;
    if($('calibrationState'))$('calibrationState').textContent=state.calibration.saved?'CALIBRACIÓN GUARDADA':'REVISAR';
    if($('calQuality'))$('calQuality').textContent=state.calibration.saved?`Puertas verificadas · ${score}/100`:'Calibración insuficiente';
    liveDraw();liveSetStatus(state.calibration.saved?'📐 CALIBRACIÓN VALIDADA · sistema listo para detectar el sprint 0–20 m.':'📐 Calibración incompleta · revisa captura.');updateSmartUI();
  }

  function smartAnalyze(){
    updateSmartSplitsFromExisting();
    const sm=ensureSmart();
    // Never synthesize a split from START→FINAL. A split is valid only when its
    // corresponding calibrated gate crossing was actually observed by the tracker.
    sm.speedSamples=sm.speedSamples||[];
    updateSmartUI();
    if($('arsAiAnalysis'))$('arsAiAnalysis').scrollIntoView({behavior:'smooth',block:'center'});
  }
  document.addEventListener('DOMContentLoaded',()=>{setTimeout(()=>{if($('smartCalibrateBtn'))$('smartCalibrateBtn').onclick=smartCalibrate;if($('smartAnalyzeBtn'))$('smartAnalyzeBtn').onclick=smartAnalyze;if($('smartReportBtn'))$('smartReportBtn').onclick=buildSmartReport;const d=$('distanceSelect');d?.addEventListener('change',()=>{updateSmartUI()});updateSmartUI();drawSkeleton();},0)});
})();
