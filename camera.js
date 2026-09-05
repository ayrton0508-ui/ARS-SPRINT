export class CameraController{
 constructor(video,onStatus){this.video=video;this.onStatus=onStatus;this.stream=null;this.orientationHandler=null}
 async requestOrientation(){try{if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function')await DeviceOrientationEvent.requestPermission()}catch{}}
 async start(){await this.requestOrientation();if(!navigator.mediaDevices?.getUserMedia)throw Error('getUserMedia unavailable');this.stream?.getTracks().forEach(t=>t.stop());this.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080},frameRate:{ideal:60}},audio:false});this.video.srcObject=this.stream;await new Promise(r=>{if(this.video.readyState>=2)return r();this.video.onloadedmetadata=r;setTimeout(r,2000)});await this.video.play();this.onStatus?.('active');return this.stream}
 stop(){this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;this.video.srcObject=null;this.onStatus?.('off')}
 isActive(){return !!this.stream?.active}
}

export class StabilityMonitor{
 constructor(video){this.video=video;this.canvas=document.createElement('canvas');this.canvas.width=32;this.canvas.height=18;this.ctx=this.canvas.getContext('2d',{willReadFrequently:true});this.prev=null;this.score=0}
 sample(){
  if(!this.video.videoWidth)return this.score;
  this.ctx.drawImage(this.video,0,0,32,18);
  const d=this.ctx.getImageData(0,0,32,18).data, vals=new Float32Array(32*18);
  let mean=0,n=0;
  for(let y=1;y<17;y++)for(let x=1;x<31;x++){const i=(y*32+x)*4;const v=.299*d[i]+.587*d[i+1]+.114*d[i+2];vals[y*32+x]=v;mean+=v;n++}
  mean/=Math.max(1,n);
  const features=new Float32Array(30*16);let k=0;
  for(let y=1;y<17;y++)for(let x=1;x<31;x++){const v=vals[y*32+x]-mean;const gx=vals[y*32+x+1]-vals[y*32+x-1],gy=vals[(y+1)*32+x]-vals[(y-1)*32+x];features[k++]=Math.hypot(gx,gy)*.5+v*.08}
  if(!this.prev){this.prev=features;this.score=1;return this.score}
  let diff=0;for(let i=0;i<features.length;i++)diff+=Math.min(40,Math.abs(features[i]-this.prev[i]));
  this.prev=features;const avg=diff/features.length;this.score=Math.max(0,Math.min(1,1-avg/10));return this.score
 }
}
