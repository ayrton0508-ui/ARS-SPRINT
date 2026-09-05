export const OFFICIAL_DISTANCES=[5,10,20];
export const GATE_DISTANCES=[0,5,10,20];

export function validateCalibration(gates,direction=1){
  const xs=GATE_DISTANCES.map(m=>Number(gates?.[m]));
  if(xs.some(x=>!Number.isFinite(x)||x<0||x>1)) return {valid:false,reason:'Gates fuera de rango'};
  const ordered=direction>0?xs.every((x,i)=>i===0||x>xs[i-1]):xs.every((x,i)=>i===0||x<xs[i-1]);
  if(!ordered)return {valid:false,reason:'Orden de gates incorrecto'};
  const gaps=xs.slice(1).map((x,i)=>Math.abs(x-xs[i]));
  if(gaps.some(g=>g<0.035))return {valid:false,reason:'Gates demasiado próximos'};
  if(Math.abs(xs[3]-xs[0])<0.35)return {valid:false,reason:'Rango de pista insuficiente'};
  return {valid:true,gaps};
}

export function interpolateCross(prev,curr,gx){
  if(!prev||!curr||!Number.isFinite(gx))return null;
  const dx=curr.x-prev.x;
  if(Math.abs(dx)<1e-9)return null;
  const ratio=(gx-prev.x)/dx;
  if(ratio<0||ratio>1)return null;
  return prev.t+ratio*(curr.t-prev.t);
}

export function crossed(prev,curr,gx,direction){
  if(!prev||!curr||!Number.isFinite(gx))return false;
  return direction>0?prev.x<gx&&curr.x>=gx:prev.x>gx&&curr.x<=gx;
}

export function mapPxToMeters(x,gates){
  if(!Number.isFinite(x)||!gates)return null;
  const refs=GATE_DISTANCES.map(m=>({m,x:Number(gates[m])}));
  if(refs.some(z=>!Number.isFinite(z.x)))return null;
  for(let i=1;i<refs.length;i++){
    const a=refs[i-1],b=refs[i];
    const lo=Math.min(a.x,b.x),hi=Math.max(a.x,b.x);
    if(x>=lo&&x<=hi){const r=(x-a.x)/(b.x-a.x||1);return a.m+r*(b.m-a.m)}
  }
  return null;
}

export function robustVelocity(samples,gates,direction=1,maxPhysical=12){
  const raw=[];
  for(let i=1;i<samples.length;i++){
    const a=samples[i-1],b=samples[i],dt=(b.t-a.t)/1000;
    if(dt<=0.008||dt>0.12)continue;
    const ma=mapPxToMeters(a.x,gates),mb=mapPxToMeters(b.x,gates);
    if(ma==null||mb==null)continue;
    const signed=(mb-ma)/dt;
    const v=Math.abs(signed);
    // Reject backwards jumps/outliers that contradict the configured direction.
    if(direction>0 && signed< -0.15)continue;
    if(direction<0 && signed> 0.15)continue;
    if(Number.isFinite(v)&&v>0&&v<=maxPhysical)raw.push({v,m:mb,t:b.t});
  }
  const out=[];
  for(let i=0;i<raw.length;i++){
    const window=raw.slice(Math.max(0,i-2),Math.min(raw.length,i+3)).map(z=>z.v).sort((a,b)=>a-b);
    const median=window[Math.floor(window.length/2)];
    out.push({...raw[i],v:median});
  }
  return out;
}

export function peakVelocity(vel){return vel.reduce((best,z)=>!best||z.v>best.v?z:best,null)}

export class StartDetector{
  constructor({gateX,direction=1,near=0.085,required=4,minForward=0.0012,stableFrames=6,window=6,maxReadyDrift=0.025}={}){
    this.gateX=gateX;this.direction=direction;this.near=near;this.required=required;this.minForward=minForward;this.stableFrames=stableFrames;this.window=window;this.maxReadyDrift=maxReadyDrift;
    this.samples=[];this.stable=0;this.started=false;this.ready=false;this.movement=[];this.baseline=null;
  }
  reset(){this.samples=[];this.stable=0;this.started=false;this.ready=false;this.movement=[];this.baseline=null}
  update(p,t){
    if(this.started||!p)return {ready:this.ready,started:false};
    const signedFromGate=this.direction*(p.x-this.gateX);
    const near=Math.abs(signedFromGate)<=this.near;
    if(!this.ready){
      if(!near){this.samples=[];this.stable=0;this.baseline=null;return {ready:false,started:false}}
      const prev=this.samples.at(-1);
      this.samples.push({x:p.x,y:p.y,t});
      if(this.samples.length>12)this.samples.shift();
      const dy=prev?Math.abs(p.y-prev.y):0;
      const dx=prev?Math.abs(p.x-prev.x):0;
      if(prev && dy<0.018 && dx<0.006)this.stable++;else if(prev)this.stable=Math.max(0,this.stable-1);
      this.ready=this.stable>=this.stableFrames || this.samples.length>=this.stableFrames;
      if(this.ready){this.baseline=this.samples.slice(-3).reduce((s,z)=>s+z.x,0)/Math.min(3,this.samples.length);this.movement=[];}
      return {ready:this.ready,started:false};
    }
    // Once ready, require sustained forward displacement from the ready baseline.
    this.movement.push({x:p.x,y:p.y,t});
    if(this.movement.length>this.window)this.movement.shift();
    if(Math.abs(this.direction*(p.x-this.gateX))>this.near*1.8 && this.direction*(p.x-this.gateX)<0){
      this.ready=false;this.stable=0;this.samples=[];this.movement=[];this.baseline=null;
      return {ready:false,started:false};
    }
    if(this.movement.length<2)return {ready:true,started:false,consecutive:0,displacement:0};
    let consecutive=0;
    for(let i=this.movement.length-1;i>0;i--){
      const dx=this.direction*(this.movement[i].x-this.movement[i-1].x);
      if(dx>=this.minForward)consecutive++;else break;
    }
    const first=this.movement[0],last=this.movement.at(-1);
    const displacement=this.direction*(last.x-first.x);
    const started=consecutive>=this.required && displacement>=this.minForward*Math.max(2,this.required);
    if(started)this.started=true;
    return {ready:true,started,moving:consecutive>0,consecutive,displacement};
  }
}

export function qualityScore({validRatio=0,stableScore=0,gateCount=0,trackingContinuity=0}){
  const score=Math.max(0,Math.min(1,0.35*validRatio+0.25*stableScore+0.2*(gateCount/3)+0.2*trackingContinuity));
  return {score,label:score>=0.85?'Buena':score>=0.65?'Aceptable':'Limitada'};
}

export function readiness({camera,level,stable,model,athlete,calibration,direction,gates}){
  const cal=calibration&&validateCalibration(gates,direction).valid;
  return {camera:!!camera,level:!!level,stable:!!stable,model:!!model,athlete:!!athlete,calibration:cal,direction:direction===1||direction===-1,valid:!!camera&&!!level&&!!stable&&!!model&&!!athlete&&cal&&(direction===1||direction===-1)};
}
