import assert from 'node:assert/strict';
import {test} from 'node:test';
import {validateCalibration,interpolateCross,crossed,mapPxToMeters,robustVelocity,peakVelocity,StartDetector,qualityScore,readiness} from './core.js';
const gates={0:.1,5:.3,10:.5,20:.9};
test('calibration accepts ordered 0/5/10/20',()=>assert.equal(validateCalibration(gates,1).valid,true));
test('calibration rejects overlap',()=>assert.equal(validateCalibration({0:.1,5:.11,10:.5,20:.9},1).valid,false));
test('crossing interpolation',()=>assert.equal(interpolateCross({x:.2,t:1000},{x:.4,t:1100},.3),1050));
test('direction-aware crossing',()=>{assert.equal(crossed({x:.2},{x:.4},.3,1),true);assert.equal(crossed({x:.4},{x:.2},.3,-1),true)});
test('piecewise map',()=>{assert(Math.abs(mapPxToMeters(.4,gates)-7.5)<1e-9);});
test('velocity uses calibrated spatial mapping',()=>{const s=[{x:.1,t:0},{x:.11,t:50},{x:.12,t:100}];const v=robustVelocity(s,gates);assert(v.length>0);assert(v.every(z=>z.v<12));});
test('peak velocity returns max',()=>assert.equal(peakVelocity([{v:2},{v:4},{v:3}]).v,4));
test('start detector needs sustained forward movement',()=>{const d=new StartDetector({gateX:.1,direction:1,required:4,near:.085,stableFrames:2});for(let i=0;i<6;i++)d.update({x:.1,y:.5},i*33);let r=d.update({x:.101,y:.5},200);assert.equal(r.started,false);for(let i=0;i<5;i++)r=d.update({x:.11+i*.01,y:.5},400+i*33);assert.equal(d.started,true)})
test('quality classification',()=>assert.equal(qualityScore({validRatio:1,stableScore:1,gateCount:3,trackingContinuity:1}).label,'Buena'));
test('arming readiness blocks missing prerequisites',()=>assert.equal(readiness({camera:true,level:true,stable:true,model:true,athlete:false,calibration:true,direction:1,gates}).valid,false));
