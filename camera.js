export class CameraController{
 constructor(video,onStatus){this.video=video;this.onStatus=onStatus;this.stream=null;this.orientationHandler=null}
 async requestOrientation(){try{if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function')await DeviceOrientationEvent.requestPermission()}catch{}}
 async start(){await this.requestOrientation();if(!navigator.mediaDevices?.getUserMedia)throw Error('getUserMedia unavailable');this.stream?.getTracks().forEach(t=>t.stop());this.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080},frameRate:{ideal:60}},audio:false});this.video.srcObject=this.stream;await new Promise(r=>{if(this.video.readyState>=2)return r();this.video.onloadedmetadata=r;setTimeout(r,2000)});await this.video.play();this.onStatus?.('active');return this.stream}
 stop(){this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;this.video.srcObject=null;this.onStatus?.('off')}
 isActive(){return !!this.stream?.active}
}
export class StabilityMonitor{
 constructor(video){this.video=video;this.canvas=document.createElement('canvas');this.canvas.width=32;this.canvas.height=18;this.ctx=this.canvas.getContext('2d',{willReadFrequently:true});this.prev=null;this.score=0}
 sample(){if(!this.video.videoWidth)return this.score;this.ctx.drawImage(this.video,0,0,32,18);const d=this.ctx.getImageData(0,0,32,18).data;if(!this.prev){this.prev=d;this.score=1;return this.score}let diff=0;for(let i=0;i<d.length;i+=4)diff+=(Math.abs(d[i]-this.prev[i])+Math.abs(d[i+1]-this.prev[i+1])+Math.abs(d[i+2]-this.prev[i+2]))/3;this.prev=d;const avg=diff/(d.length/4);this.score=Math.max(0,Math.min(1,1-avg/28));return this.score}
}
