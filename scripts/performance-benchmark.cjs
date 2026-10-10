// CPU benchmarks with a stub Canvas: excludes GPU, display refresh and WAN latency.
const {performance}=require('node:perf_hooks');
const {gameHarness}=require('../tests/helpers.cjs');
const {Match}=require('../server/online/match.cjs');
const protocol=require('../src/online/protocol.js');
function measure(fn,n=1200){for(let i=0;i<200;i++)fn(i);const samples=[];for(let i=0;i<n;i++){const at=performance.now();fn(i);samples.push(performance.now()-at);}samples.sort((a,b)=>a-b);return {p50Ms:+samples[Math.floor(n*.5)].toFixed(4),p95Ms:+samples[Math.floor(n*.95)].toFixed(4),maxMs:+samples.at(-1).toFixed(3)};}
const h=gameHarness();h.api.start('bot',{n:5,time:600,diff:2});h.api.state.G.phase='play';h.api.draw();
const renderer=measure(i=>{const ball=h.api.state.ball;ball.qx=Math.sin(i*.023)*.3;ball.qy=Math.cos(i*.037)*.3;ball.qz=0;ball.qw=Math.sqrt(1-ball.qx**2-ball.qy**2);h.api.draw();});
const physics=measure(()=>h.api.update(1/60));
const match=new Match({id:'wire',cfg:{n:5,time:600}});let encoder=protocol.Encoder?new protocol.Encoder(protocol.snapshot(match,0)):null,fullBytes=0,deltaBytes=0;for(let i=1;i<=900;i++){match.update(1/60);if(i%3===0){fullBytes+=Buffer.byteLength(JSON.stringify(protocol.frameFromMatch(match,i,{})));deltaBytes+=Buffer.byteLength(JSON.stringify(encoder?encoder.encode(match,i,{}):protocol.frameFromMatch(match,i,{})));}}
console.log(JSON.stringify({note:'Local CPU, mocked Canvas; neither real browser FPS nor Android/GPU performance.',renderer,localPhysicsAndAI:physics,wire:{seconds:15,fullFrameBytesPerSecond:Math.round(fullBytes/15),actualBytesPerSecond:Math.round(deltaBytes/15)},heapMB:+(process.memoryUsage().heapUsed/1048576).toFixed(2)},null,2));
