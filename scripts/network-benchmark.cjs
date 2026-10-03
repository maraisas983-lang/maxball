const {performance}=require('node:perf_hooks');
const {Match}=require('../server/online/match.cjs');
const protocol=require('../src/online/protocol.js');
const output=[];
for(const count of [1,5,10,25]){
 const rooms=Array.from({length:count},(_,i)=>new Match({id:String(i),cfg:{n:5,time:180}})),samples=[];
 for(let tick=0;tick<600;tick++){const start=performance.now();for(const match of rooms){match.update(1/60);if(tick%3===0)JSON.stringify(protocol.frameFromMatch(match,tick));}samples.push(performance.now()-start);}
 samples.sort((a,b)=>a-b);const match=rooms[0],full=Buffer.byteLength(JSON.stringify(match.snapshot())),wire=Buffer.byteLength(JSON.stringify(protocol.frameFromMatch(match,600)));
 output.push({rooms:count,players:count*10,ticks:600,p50Ms:+samples[300].toFixed(3),p95Ms:+samples[570].toFixed(3),fullBytes:full,frameBytes:wire,bytesPerSecondPerClient:wire*20,reductionPercent:Math.round((1-wire/full)*100)});
}
console.log(JSON.stringify({note:'Local simulation and encoding, not a WAN latency measurement. Physics 60 Hz, snapshots 20 Hz.',measurements:output},null,2));
