// Repeatable simulation and packet encoding; excludes GPU and WAN latency.
const {performance}=require('node:perf_hooks'),{Match}=require('../server/online/match.cjs'),protocol=require('../src/online/protocol.js');
const measurements=[];
for(const n of [1,2,3,4,5]){const match=new Match({id:'benchmark-'+n,cfg:{n,time:600,diff:2}});for(let i=0;i<600;i++)match.update(1/60);const samples=[];for(let i=0;i<1800;i++){const start=performance.now();match.update(1/60);if(i%3===0)JSON.stringify(protocol.frameFromMatch(match,i));samples.push(performance.now()-start);}samples.sort((a,b)=>a-b);measurements.push({format:n+'v'+n,players:n*2,p50Ms:+samples[900].toFixed(4),p95Ms:+samples[1710].toFixed(4),maxMs:+samples.at(-1).toFixed(3)});}
const match=new Match({id:'encoding',cfg:{n:5}});for(let i=0;i<120;i++)match.update(1/60);const encoding=[];
for(let round=0;round<3;round++){const row={};for(const method of ['snapshotThenFrame','directFrame']){const make=method==='directFrame'?i=>protocol.frameFromMatch(match,i):i=>protocol.frame(protocol.snapshot(match,i));for(let i=0;i<1000;i++)JSON.stringify(make(i));const start=performance.now();for(let i=0;i<10000;i++)JSON.stringify(make(i));row[method+'MsPer1000']=+(performance.now()-start).toFixed(3)/10;}encoding.push(row);}
console.log(JSON.stringify({physicsHz:60,snapshotHz:20,measurements,encoding},null,2));
