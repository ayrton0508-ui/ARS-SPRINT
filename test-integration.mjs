import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const root=new URL('../',import.meta.url);const files=['index.html','styles.css','app.js','core.js','config.js','camera.js','vision.js','storage.js','manifest.json','sw.js','README.md','package.json'];
for(const f of files)test(`file ${f} exists`,()=>assert.ok(fs.existsSync(new URL(f,root))));
test('one camera and official distances',()=>{const h=fs.readFileSync(new URL('index.html',root),'utf8');assert.equal((h.match(/<video\b/g)||[]).length,1);for(const d of ['5 m','10 m','20 m'])assert.ok(h.includes(d));for(const x of ['5-0-5','5-10-5','30 m','40 m'])assert.ok(!h.includes(x))});
test('no random simulation',()=>{for(const f of ['app.js','core.js','vision.js'])assert.ok(!fs.readFileSync(new URL(f,root),'utf8').includes('Math.random'))});
test('real pose dependency present',()=>{const v=fs.readFileSync(new URL('vision.js',root),'utf8');assert.match(v,/PoseLandmarker/);assert.match(v,/MODEL_URL/)});
test('automatic flow hooks',()=>{const a=fs.readFileSync(new URL('app.js',root),'utf8');for(const x of ['createPoseLandmarker','StartDetector','startRecorder','robustVelocity','peakVelocity','autoArm'])assert.ok(a.includes(x),x)});
test('no visible manual arm button',()=>{const h=fs.readFileSync(new URL('index.html',root),'utf8');assert.ok(!h.includes('ARMAR SPRINT'))});
test('service worker lists core modules',()=>{const s=fs.readFileSync(new URL('sw.js',root),'utf8');for(const f of ['camera.js','vision.js','storage.js','core.js'])assert.ok(s.includes(f))});
