const DB='ARS_SPRINT_COMPLETE_DB_V1', VID='ARS_SPRINT_COMPLETE_VIDEO_V1';
const seed={athletes:[{id:'a1',name:'Atleta 1',category:'General',team:''}],results:[]};
export function loadDB(){try{return JSON.parse(localStorage.getItem(DB)||JSON.stringify(seed))}catch{return structuredClone(seed)}}
export function saveDB(db){localStorage.setItem(DB,JSON.stringify(db))}
export function addAthlete(data){const db=loadDB();const a={id:crypto.randomUUID?.()||String(Date.now()),...data};db.athletes.push(a);saveDB(db);return a}
export function deleteAthlete(id){const db=loadDB();if(db.athletes.length<=1)return false;db.athletes=db.athletes.filter(a=>a.id!==id);saveDB(db);return true}
export function clearResults(){const db=loadDB();db.results=[];saveDB(db)}
export function previousResult(athleteId,dist,excludeId){return loadDB().results.filter(r=>r.athleteId===athleteId&&r.distance===dist&&r.id!==excludeId&&Number.isFinite(r['t'+dist])).sort((a,b)=>new Date(b.date)-new Date(a.date))[0]||null}
export function personalBest(athleteId,dist,excludeId){return loadDB().results.filter(r=>r.athleteId===athleteId&&r.distance===dist&&r.id!==excludeId&&Number.isFinite(r['t'+dist])).reduce((b,r)=>!b||r['t'+dist]<b['t'+dist]?r:b,null)}
export function saveResult(result){const db=loadDB();db.results.unshift(result);saveDB(db);return result}
function open(){return new Promise((res,rej)=>{const r=indexedDB.open(VID,1);r.onupgradeneeded=()=>r.result.createObjectStore('videos');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
export async function saveVideo(id,blob){try{const d=await open();return await new Promise((res,rej)=>{const tx=d.transaction('videos','readwrite');tx.objectStore('videos').put(blob,id);tx.oncomplete=()=>res(id);tx.onerror=()=>rej(tx.error)})}catch{return null}}
export async function getVideo(id){try{const d=await open();return await new Promise((res,rej)=>{const q=d.transaction('videos').objectStore('videos').get(id);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error)})}catch{return null}}
export function exportCSV(){const rows=[['fecha','atleta','distancia','intento','5m','10m','20m','vmax_mps','vmax_kmh','vmax_m','calidad']];loadDB().results.forEach(r=>rows.push([r.date,r.athlete,r.distance,r.attempt,r.t5??'',r.t10??'',r.t20??'',r.vmax??'',Number.isFinite(r.vmax)?(r.vmax*3.6).toFixed(3):'',r.vmaxAt??'',r.quality]));const csv=rows.map(row=>row.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='ars-sprint-resultados.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
