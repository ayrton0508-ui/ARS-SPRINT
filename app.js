"use strict";
(function(){
const $=id=>document.getElementById(id);
const KEYA="arsSprintAthletes30",KEYH="arsSprintHistory30"; // conserva los datos de ARS SPRINT 3.0
let objectUrl=null,start=null,end=null,current=null,series=[],seriesActive=false,selectedVideoName="";
const read=k=>{try{return JSON.parse(localStorage.getItem(k)||"[]")}catch(e){return[]}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const uid=()=>{try{return crypto.randomUUID()}catch(e){return Date.now().toString(36)+Math.random().toString(36).slice(2)}};
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const fmt=n=>Number.isFinite(n)?n.toFixed(3)+" s":"—";
const num=(x,d=0)=>{const n=Number(x);return Number.isFinite(n)?n:d};

function navigate(id){
 document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===id));
 document.querySelectorAll(".tabs button").forEach(b=>b.classList.toggle("active",b.dataset.page===id));
 if(id==="deportistas")renderAthletes();
 if(id==="historial")renderHistory(true);
 if(id==="ficha"){renderProfileSelect();renderProfile();}
 window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelectorAll(".tabs button").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.page)));

function renderAthletes(){
 const a=read(KEYA),h=read(KEYH),old=$("athleteSelect").value;
 $("athleteSelect").innerHTML='<option value="">— Nuevo deportista —</option>'+a.map(x=>`<option value="${x.id}">${esc(x.name)} · ${esc(x.category)}</option>`).join("");
 if(a.some(x=>x.id===old))$("athleteSelect").value=old;
 $("athleteList").innerHTML=a.length?a.map(x=>{
  const n=h.filter(r=>r.athleteId===x.id).length,ini=x.name.split(/\s+/).slice(0,2).map(s=>s[0]).join("").toUpperCase();
  return `<div class="person"><div class="avatar">${esc(ini)}</div><div class="grow"><strong>${esc(x.name)}</strong><small>${esc(x.category)} · ${x.age||"Edad no indicada"} · ${n} evaluaciones</small></div><button class="light" data-use="${x.id}">Usar</button><button class="danger" data-remove="${x.id}">Eliminar</button></div>`;
 }).join(""):'<div class="empty">Todavía no hay deportistas registrados.</div>';
 document.querySelectorAll("[data-use]").forEach(b=>b.onclick=()=>{navigate("evaluacion");$("athleteSelect").value=b.dataset.use;fillAthlete()});
 document.querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>{if(confirm("¿Eliminar este deportista? Sus evaluaciones históricas se conservarán.")){write(KEYA,a.filter(x=>x.id!==b.dataset.remove));renderAthletes();renderHistory(true);renderProfileSelect();}});
}
function fillAthlete(){
 const id=$("athleteSelect").value,a=read(KEYA).find(x=>x.id===id);
 if(a){$("name").value=a.name;$("age").value=a.age||"";$("category").value=a.category||"Libre"}
}
$("athleteSelect").onchange=fillAthlete;

function levelFor(ms){
 if(ms>=8)return"Excelente";
 if(ms>=7)return"Muy bueno";
 if(ms>=6)return"Bueno";
 if(ms>=5)return"Aceptable";
 return"En desarrollo";
}
function qualityFor(time,d){
 if(!time||!d)return["—",""];
 if(time<0.15)return["Revisar marcaje","bad"];
 if(time>20)return["Revisar protocolo","warn"];
 return["Marcaje válido","good"];
}
function analyzeCurrent(){
 const d=num($("distance").value), s=num(start,NaN), e=num(end,NaN);
 if(!Number.isFinite(s)||!Number.isFinite(e)||e<=s||!d){
  current=null;$("time").textContent="—";$("ms").textContent="—";$("kmh").textContent="—";$("level").textContent="—";
  $("qualityStatus").textContent="Completa INICIO y FINAL para calcular.";
  ["mTime","mMs","mKmh"].forEach(id=>$(id).className="metric");
  $("ai").textContent="Marca los dos momentos del vídeo para generar el análisis.";
  return;
 }
 const time=e-s,ms=d/time,kmh=ms*3.6,level=levelFor(ms);
 $("time").textContent=time.toFixed(3);$("ms").textContent=ms.toFixed(2);$("kmh").textContent=kmh.toFixed(2);$("level").textContent=level;
 const q=qualityFor(time,d);$("qualityStatus").textContent=q[0];$("qualityStatus").className="status";
 $("mTime").className="metric "+(q[1]||"");$("mMs").className="metric "+(ms>=7?"good":ms>=5?"warn":"bad");$("mKmh").className="metric "+(ms>=7?"good":ms>=5?"warn":"bad");
 const h=read(KEYH),name=$("name").value.trim()||"Sin nombre",mine=h.filter(r=>String(r.name).toLowerCase()===name.toLowerCase()&&Number(r.distance)===d);
 const prior=mine.length?Math.min(...mine.map(r=>num(r.time,999))):null;
 const improvement=prior?((prior-time)/prior*100):null;
 let advice=ms>=8?"Velocidad media alta. Prioriza mantener la calidad técnica y una recuperación suficiente entre intentos.":ms>=7?"Buen nivel de velocidad. Trabaja aceleración, rigidez del tobillo y aplicación de fuerza horizontal.":ms>=6?"Nivel intermedio. Conviene reforzar aceleración y técnica de carrera, especialmente los primeros metros.":"Hay margen de mejora. Revisa salida, inclinación del tronco, frecuencia de zancada y capacidad de aplicar fuerza.";
 let trend=prior?(improvement>0?` Es aproximadamente <b>${improvement.toFixed(1)}%</b> más rápido que su mejor marca previa de ${prior.toFixed(3)} s.`:improvement<0?` Está aproximadamente <b>${Math.abs(improvement).toFixed(1)}%</b> por encima de su mejor marca previa de ${prior.toFixed(3)} s.`:" Iguala su mejor marca previa."):" Todavía no existe un registro previo comparable.";
 $("ai").innerHTML=`<b>ANÁLISIS AUTOMÁTICO</b><br>${advice}${trend}<br><br><span style="color:#aaa">El motor local usa reglas de rendimiento y comparación histórica; funciona sin internet y sin enviar datos ni vídeos. Para una IA generativa conectada se requiere un backend seguro.</span>`;
 current={id:uid(),date:new Date().toLocaleString("es-PE"),name,age:$("age").value,category:$("category").value,distance:d,attempt:series.length+1,time,ms,kmh,level,athleteId:$("athleteSelect").value||null,video:selectedVideoName};
}
$("distance").oninput=analyzeCurrent;
$("testType").onchange=()=>{if($("testType").value!=="custom"){$("distance").value=$("testType").value;analyzeCurrent()}};

$("videoFile").onchange=function(){
 const f=this.files&&this.files[0];if(!f)return;
 if(objectUrl)URL.revokeObjectURL(objectUrl);
 objectUrl=URL.createObjectURL(f);selectedVideoName=f.name;$("video").src=objectUrl;$("video").load();$("videoBox").classList.remove("hidden");
 $("videoStatus").textContent="⏳ Cargando vídeo: "+f.name;$("videoOverlay").textContent="Cargando…";
 start=end=null;$("startTime").textContent="—";$("endTime").textContent="—";analyzeCurrent();
};
$("video").onloadedmetadata=()=>{
 const d=$("video").duration;
 $("videoStatus").textContent="✓ Vídeo listo · "+selectedVideoName+" · "+(Number.isFinite(d)?d.toFixed(2)+" s":"duración no disponible");
 $("videoOverlay").textContent="Vídeo listo · pausa para marcar";
};
$("video").onloadeddata=()=>{$("videoStatus").textContent="✓ Vídeo reproducible · pausa en el instante exacto para marcar."};
$("video").onerror=()=>{
 $("videoStatus").textContent="✕ Este vídeo no puede ser reproducido por el navegador. En iPad usa preferentemente MP4 con vídeo H.264 y audio AAC. El sistema no modifica el archivo original.";
 $("videoOverlay").textContent="Formato no compatible";
};
$("video").ontimeupdate=()=>{if(start!==null&&end===null)$("videoOverlay").textContent="Marcaje de inicio: "+start.toFixed(3)+" s"};

$("startBtn").onclick=()=>{
 if(!$("video").src){alert("Selecciona primero un vídeo.");return}
 start=$("video").currentTime;end=null;$("startTime").textContent=fmt(start);$("endTime").textContent="—";$("videoOverlay").textContent="INICIO · "+start.toFixed(3)+" s";analyzeCurrent();
};
$("endBtn").onclick=()=>{
 if(!$("video").src){alert("Selecciona primero un vídeo.");return}
 if(start===null){alert("Primero marca INICIO.");return}
 end=$("video").currentTime;if(end<=start){alert("FINAL debe ser posterior a INICIO.");return}
 $("endTime").textContent=fmt(end);$("videoOverlay").textContent="FINAL · "+end.toFixed(3)+" s";analyzeCurrent();
 if(seriesActive&&current){
  const r={...current,attempt:series.length+1};series.push(r);
  if(series.length<parseInt($("seriesCount").value)){
   $("seriesStatus").textContent=`✓ Intento ${series.length} registrado. Pulsa “Siguiente intento” para continuar.`;$("nextAttempt").disabled=false;
  }else{
   seriesActive=false;$("nextAttempt").disabled=true;
   const best=Math.min(...series.map(x=>x.time)),avg=series.reduce((s,x)=>s+x.time,0)/series.length;
   $("seriesStatus").textContent=`✓ Serie completada · ${series.length} intentos · mejor ${best.toFixed(3)} s · promedio ${avg.toFixed(3)} s.`;
   $("ai").innerHTML=`<b>SERIE COMPLETADA</b><br>Mejor marca: <b>${best.toFixed(3)} s</b> · Promedio: <b>${avg.toFixed(3)} s</b> · Intentos: <b>${series.length}</b>.<br><br>El sistema recomienda conservar la mejor marca y observar la diferencia entre intentos para valorar consistencia.`;
  }
 }
};
$("resetMarks").onclick=()=>{start=end=null;$("startTime").textContent="—";$("endTime").textContent="—";$("videoOverlay").textContent="Listo para marcar";analyzeCurrent()};
$("startSeries").onclick=()=>{
 if(!$("name").value.trim()){alert("Selecciona o escribe un deportista.");return}
 series=[];seriesActive=$("mode").value==="serie";start=end=null;$("startTime").textContent="—";$("endTime").textContent="—";$("nextAttempt").disabled=true;
 $("seriesStatus").textContent=`Serie iniciada · objetivo: ${$("seriesCount").value} intento(s).`;analyzeCurrent();
};
$("nextAttempt").onclick=()=>{start=end=null;current=null;$("startTime").textContent="—";$("endTime").textContent="—";$("nextAttempt").disabled=true;$("seriesStatus").textContent=`Preparado para intento ${series.length+1} de ${$("seriesCount").value}.`;analyzeCurrent()};
$("cancelSeries").onclick=()=>{series=[];seriesActive=false;$("nextAttempt").disabled=true;$("seriesStatus").textContent="Serie cancelada."};

function saveAthleteData(name,age,cat){
 let a=read(KEYA),found=a.find(x=>x.name.toLowerCase()===name.toLowerCase());
 if(found){found.age=age;found.category=cat}else{a.push({id:uid(),name,age,category:cat})}
 write(KEYA,a);renderAthletes();renderProfileSelect();
}
$("saveAthleteQuick").onclick=()=>{
 let n=$("name").value.trim();if(!n){alert("Escribe el nombre.");return}
 saveAthleteData(n,$("age").value,$("category").value);let a=read(KEYA).find(x=>x.name.toLowerCase()===n.toLowerCase());$("athleteSelect").value=a.id;alert("✓ Deportista guardado.");
};
$("clearAthlete").onclick=()=>{$("athleteSelect").value="";$("name").value="";$("age").value="";$("category").value="Libre"};
$("addAthlete").onclick=()=>{let n=$("newName").value.trim();if(!n){alert("Escribe el nombre.");return}saveAthleteData(n,$("newAge").value,$("newCat").value);$("newName").value="";$("newAge").value="";renderAthletes()};

function saveHistoryRows(rows){
 if(!rows.length){alert("No hay resultados completos para guardar.");return}
 const h=read(KEYH);rows.forEach(r=>h.push({...r,id:r.id||uid()}));write(KEYH,h);
 alert(`✓ ${rows.length} resultado(s) guardado(s).`);series=[];current=null;renderHistory(true);renderAthletes();renderProfileSelect();renderProfile();
}
$("saveResult").onclick=()=>{
 if(series.length){saveHistoryRows(series);return}
 if(!current){alert("Completa INICIO y FINAL.");return}
 saveHistoryRows([current]);
};

function renderHistory(reset=false){
 const h=read(KEYH),af=read(KEYA),oldA=$("historyFilter").value,oldD=$("distanceFilter").value;
 $("historyFilter").innerHTML='<option value="">Todos</option>'+af.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join("");
 if(!reset&&af.some(a=>a.id===oldA))$("historyFilter").value=oldA;
 else if(af.some(a=>a.id===oldA))$("historyFilter").value=oldA;
 $("distanceFilter").value=oldD;
 const aid=$("historyFilter").value,d=$("distanceFilter").value;
 const rows=h.filter(r=>(!aid||r.athleteId===aid)&&(!d||String(r.distance)===d)).slice().reverse();
 $("history").innerHTML=rows.map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.name)}</td><td>Sprint ${r.distance} m</td><td>${r.attempt||1}</td><td>${num(r.time).toFixed(3)} s</td><td>${num(r.ms).toFixed(2)}</td><td>${num(r.kmh).toFixed(2)}</td><td>${esc(r.level)}</td></tr>`).join("")||'<tr><td colspan="8">No hay registros para este filtro.</td></tr>';
 const times=rows.map(r=>num(r.time,NaN)).filter(Number.isFinite),speeds=rows.map(r=>num(r.ms,NaN)).filter(Number.isFinite);
 $("historySummary").innerHTML=`<div class="metric"><small>Registros</small><strong>${rows.length}</strong></div><div class="metric"><small>Mejor tiempo</small><strong>${times.length?Math.min(...times).toFixed(3)+" s":"—"}</strong></div><div class="metric"><small>Mayor velocidad</small><strong>${speeds.length?Math.max(...speeds).toFixed(2)+" m/s":"—"}</strong></div><div class="metric"><small>Promedio</small><strong>${times.length?(times.reduce((a,b)=>a+b,0)/times.length).toFixed(3)+" s":"—"}</strong></div>`;
}
$("historyFilter").onchange=()=>renderHistory(false);$("distanceFilter").onchange=()=>renderHistory(false);
$("clearHistory").onclick=()=>{if(confirm("¿Borrar TODO el historial? Esta acción no se puede deshacer.")){localStorage.removeItem(KEYH);renderHistory(true);renderAthletes();renderProfile()}};
$("exportHistory").onclick=()=>{
 const h=read(KEYH);if(!h.length){alert("No hay datos.");return}
 const rows=[["Fecha","Deportista","Edad","Categoría","Distancia_m","Intento","Tiempo_s","m_s","km_h","Nivel","Video"],...h.map(r=>[r.date,r.name,r.age,r.category,r.distance,r.attempt||1,num(r.time).toFixed(3),num(r.ms).toFixed(2),num(r.kmh).toFixed(2),r.level,r.video||""])];
 const csv="\ufeff"+rows.map(row=>row.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(";")).join("\n");
 const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="ARS_SPRINT_historial.csv";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
};

function renderProfileSelect(){
 const a=read(KEYA),old=$("profileSelect").value;
 $("profileSelect").innerHTML='<option value="">— Selecciona —</option>'+a.map(x=>`<option value="${x.id}">${esc(x.name)} · ${esc(x.category)}</option>`).join("");
 if(a.some(x=>x.id===old))$("profileSelect").value=old;
}
function renderProfile(){
 const id=$("profileSelect").value;
 if(!id){$("profileName").textContent="Selecciona un deportista";$("profileInfo").textContent="—";$("profileInitials").textContent="AR";$("pCount").textContent="0";$("pBest").textContent="—";$("pSpeed").textContent="—";$("pAvg").textContent="—";$("profileHistory").innerHTML="";$("distanceSummary").innerHTML='<div class="empty">Selecciona un deportista.</div>';$("profileAI").textContent="Selecciona un deportista.";return}
 const a=read(KEYA).find(x=>x.id===id),h=read(KEYH).filter(r=>r.athleteId===id);if(!a)return;
 $("profileName").textContent=a.name;$("profileInfo").textContent=(a.age?a.age+" años":"Edad no indicada")+" · "+a.category;
 $("profileInitials").textContent=a.name.split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase();$("pCount").textContent=h.length;
 if(!h.length){$("pBest").textContent="—";$("pSpeed").textContent="—";$("pAvg").textContent="—";$("profileHistory").innerHTML='<tr><td colspan="7">Sin evaluaciones.</td></tr>';$("distanceSummary").innerHTML='<div class="empty">Todavía no hay resultados guardados.</div>';$("profileAI").textContent="No hay suficientes datos para analizar.";return}
 const best=Math.min(...h.map(x=>num(x.time,999))),speed=Math.max(...h.map(x=>num(x.ms,0))),avg=h.reduce((s,x)=>s+num(x.time,0),0)/h.length;
 $("pBest").textContent=best.toFixed(3)+" s";$("pSpeed").textContent=speed.toFixed(2)+" m/s";$("pAvg").textContent=avg.toFixed(3)+" s";
 const groups={};h.forEach(x=>{const k=String(x.distance);(groups[k]??=[]).push(x)});
 $("distanceSummary").innerHTML=Object.entries(groups).sort((a,b)=>Number(a[0])-Number(b[0])).map(([d,arr])=>{
  const bt=Math.min(...arr.map(x=>num(x.time,999))),bs=Math.max(...arr.map(x=>num(x.ms,0)));
  return `<div class="metric"><div class="kpiTitle">SPRINT ${esc(d)} m</div><strong>${bt.toFixed(3)} s</strong><small>Mejor · ${bs.toFixed(2)} m/s</small></div>`;
 }).join("");
 $("profileHistory").innerHTML=h.slice().reverse().map(x=>`<tr><td>${esc(x.date)}</td><td>${x.distance} m</td><td>${x.attempt||1}</td><td>${num(x.time).toFixed(3)} s</td><td>${num(x.ms).toFixed(2)}</td><td>${num(x.kmh).toFixed(2)}</td><td>${esc(x.level)}</td></tr>`).join("");
 const ordered=h.slice().sort((a,b)=>new Date(a.date)-new Date(b.date)),first=ordered[0],last=ordered[ordered.length-1],change=first&&last&&num(first.time)?((num(first.time)-num(last.time))/num(first.time)*100):0;
 const consistency=h.length>1?Math.max(...h.map(x=>num(x.time)))-Math.min(...h.map(x=>num(x.time))):0;
 $("profileAI").innerHTML=`<b>ANÁLISIS DEL DEPORTISTA</b><br>${change>0?`La última referencia disponible muestra una mejora aproximada de <b>${change.toFixed(1)}%</b> frente al primer registro.`:change<0?`La última referencia está aproximadamente <b>${Math.abs(change).toFixed(1)}%</b> por encima del primer registro; conviene revisar condiciones y protocolo.`:"Aún no existe suficiente evolución para establecer una tendencia."}<br><br>Mejor tiempo: <b>${best.toFixed(3)} s</b>. Mayor velocidad: <b>${speed.toFixed(2)} m/s</b>. Promedio: <b>${avg.toFixed(3)} s</b>. Rango entre mejores y peores tiempos: <b>${consistency.toFixed(3)} s</b>.`;
}
$("profileSelect").onchange=renderProfile;
$("profileToEvaluation").onclick=()=>{const id=$("profileSelect").value;if(!id){alert("Selecciona un deportista.");return}navigate("evaluacion");$("athleteSelect").value=id;fillAthlete()};
$("printProfile").onclick=()=>{if(!$("profileSelect").value){alert("Selecciona un deportista.");return}document.getElementById("ficha").classList.add("print-page");window.print();setTimeout(()=>document.getElementById("ficha").classList.remove("print-page"),800)};

renderAthletes();renderHistory(true);renderProfileSelect();renderProfile();
})();
