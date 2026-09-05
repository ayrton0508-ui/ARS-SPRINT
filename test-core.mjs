import test from 'node:test';import assert from 'node:assert/strict';import {validateCalibration,fitProjectiveMap,mapPxToMeters,robustVelocity,StartDetector,crossed,interpolateCross,crossedGate2D,interpolateCross2D} from './core.js';
test('calibration',()=>assert.equal(validateCalibration({0:.1,5:.3,10:.5,20:.9},1).valid,true));test('projective map',()=>{const g={0:.1,5:.3,10:.5,20:.9};assert.ok(fitProjectiveMap(g,1));assert.ok(Math.abs(mapPxToMeters(.5,g,1)-10)<.2)});test('cross',()=>assert.equal(crossed({x:.2},{x:.4},.3,1),true));test('interpolate',()=>assert.equal(interpolateCross({x:.2,t:1000},{x:.4,t:1100},.3),1050));test('velocity finite',()=>assert.ok(robustVelocity([{x:.1,t:0},{x:.2,t:100}],{0:.1,5:.3,10:.5,20:.9},1).every(x=>Number.isFinite(x.v))));test('start detector',()=>{const d=new StartDetector({gateX:.1,direction:1,stableFrames:3,required:3,minForward:.01});for(let i=0;i<6;i++)d.update({x:.1,y:.5},i*16);let hit=false;for(let i=0;i<6;i++)hit ||= d.update({x:.1+i*.02,y:.5},100+i*16).started;assert.equal(hit,true)})

test('start detector requires stability',()=>{const d=new StartDetector({gateX:.1,direction:1,stableFrames:6,required:3,minForward:.01});for(let i=0;i<6;i++){const r=d.update({x:.1+i*.01,y:.5},i*16);assert.equal(r.ready,false);assert.equal(r.started,false)}});
test('reverse crossing',()=>assert.equal(crossed({x:.5},{x:.3},.4,-1),true));
test('invalid calibration rejects unordered gates',()=>assert.equal(validateCalibration({0:.1,5:.4,10:.3,20:.9},1).valid,false));
test('velocity rejects backwards sample',()=>{const g={0:.1,5:.3,10:.5,20:.9};const v=robustVelocity([{x:.3,t:0},{x:.2,t:50}],g,1);assert.equal(v.length,0)});

test('projective round trip at all gates',()=>{const g={0:.08,5:.28,10:.50,20:.88};assert.ok(fitProjectiveMap(g,1));for(const m of [0,5,10,20])assert.ok(Math.abs(mapPxToMeters(g[m],g,1)-m)<0.05)});

test('2D gate crossing follows perspective line',()=>{const prev={x:.29,y:.98,t:1000},curr={x:.52,y:.48,t:1100};assert.equal(crossedGate2D(prev,curr,.30,1),true);assert.ok(Math.abs(interpolateCross2D(prev,curr,.30,1)-1033.3333333)<0.01)});
