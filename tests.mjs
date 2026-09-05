import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateCalibration,interpolateCross,crossed,mapPxToMeters,robustVelocity,peakVelocity,StartDetector,qualityScore,readiness} from './core.js';

const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('./app.js',import.meta.url),'utf8');

test('calibration accepts ordered 0/5/10/20',()=>assert.equal(validateCalibration({0:.10,5:.30,10:.50,20:.90},1).valid,true));
test('calibration rejects overlap',()=>assert.equal(validateCalibration({0:.10,5:.11,10:.50,20:.90},1).valid,false));
test('crossing interpolation',()=>assert.equal(interpolateCross({x:.2,t:1000},{x:.4,t:1100},.3),1050));
test('direction-aware crossing',()=>{assert.equal(crossed({x:.2},{x:.4},.3,1),true);assert.equal(crossed({x:.4},{x:.2},.3,-1),true)});
test('piecewise map',()=>assert.equal(mapPxToMeters(.40,{0:.10,5:.30,10:.50,20:.90},1),7.5));
test('velocity uses calibrated spatial mapping',()=>{const v=robustVelocity([{x:.10,t:0},{x:.14,t:100},{x:.16,t:180}],{0:.10,5:.30,10:.50,20:.90},1);assert.equal(v.length,2);assert.ok(Math.abs(v[0].v-10)<.01)});
test('peak velocity returns max',()=>assert.equal(peakVelocity([{v:3},{v:7},{v:5}]).v,7));
test('start detector waits at 0 then accepts sustained forward movement',()=>{const d=new StartDetector({gateX:.10,direction:1,near:.05,stableFrames:3,required:3,minForward:.01});assert.equal(d.update({x:.10,y:.5},0).started,false);assert.equal(d.update({x:.10,y:.5},16).ready,false);assert.equal(d.update({x:.10,y:.5},32).ready,true);assert.equal(d.update({x:.10,y:.5},48).ready,true);assert.equal(d.update({x:.105,y:.5},64).started,false);assert.equal(d.update({x:.12,y:.5},80).started,false);assert.equal(d.update({x:.135,y:.5},96).started,false);assert.equal(d.update({x:.15,y:.5},112).started,true)});
test('start detector tolerates smoothed frame displacement',()=>{const d=new StartDetector({gateX:.10,direction:1,near:.06,stableFrames:4,required:4,minForward:.0012});for(let i=0;i<6;i++)d.update({x:.10,y:.5},i*16);let started=false;for(let i=0;i<8;i++){const r=d.update({x:.10+i*.0022,y:.5},96+i*16);started ||= r.started}assert.equal(started,true)});
test('velocity rejects physically impossible spikes',()=>{const v=robustVelocity([{x:.10,t:0},{x:.20,t:100},{x:.80,t:110},{x:.85,t:210}],{0:.10,5:.30,10:.50,20:.90},1,12);assert.ok(v.every(z=>z.v<=12));});
test('reverse direction start detector works',()=>{const d=new StartDetector({gateX:.90,direction:-1,near:.06,stableFrames:4,required:3,minForward:.0012});for(let i=0;i<6;i++)d.update({x:.90,y:.5},i*16);let started=false;for(let i=0;i<7;i++){const r=d.update({x:.90-i*.0025,y:.5},96+i*16);started ||= r.started}assert.equal(started,true)});

test('quality classification',()=>assert.equal(qualityScore({validRatio:1,stableScore:1,gateCount:3,trackingContinuity:1}).label,'Buena'));
test('arming readiness blocks missing prerequisites',()=>assert.equal(readiness({camera:true,level:true,stable:true,model:true,athlete:false,calibration:true,direction:1,gates:{0:.1,5:.3,10:.5,20:.9}}).valid,false));
test('single-camera architecture: only one visible video and no secondary calibration/run video',()=>{assert.equal((html.match(/<video\b/g)||[]).length,1);assert.ok(!html.includes('id="calVideo"'));assert.ok(!html.includes('id="runVideo"'));assert.ok(!app.includes("show('run')"));});
test('official scope only 5/10/20 in UI',()=>{for(const d of ['5 m','10 m','20 m']) assert.ok(html.includes(d));for(const bad of ['5-0-5','5-10-5','30 m','40 m']) assert.ok(!html.includes(bad));});
test('all JS DOM references exist in HTML',()=>{const refs=[...app.matchAll(/\$\('([^']+)'\)/g)].map(m=>m[1]);for(const id of new Set(refs)) assert.match(html,new RegExp(`id="${id}"`),`missing ${id}`)});
