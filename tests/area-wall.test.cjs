const test=require('node:test'),assert=require('node:assert/strict');
const cfg=require('../src/core/config.js').physics,interaction=require('../src/physics/interaction.js');
const {moveBall,rolling}=require('../src/physics/ballPhysics.js'),{createPhysics}=require('../src/physics/playerPhysics.js');
const {scene}=require('./gameplay-calibration.cjs'),protocol=require('../src/online/protocol.js');
test('ball grows another 6% and action area keeps the previous 22.05-unit radius',()=>{
 assert.ok(Math.abs(cfg.ballRadius/(20*.42*1.02)-1.06)<1e-12);
 assert.ok(Math.abs(interaction.areaRadius()/21-1.05)<1e-12);
 const s=scene(),p=s.P[0],r=interaction.areaRadius()+s.BR;
 s.ball.x=p.x+r-.000001;assert.ok(interaction.contains(p,s.ball,s));
 s.ball.x=p.x+r+.000001;assert.equal(interaction.contains(p,s.ball,s),false);
});
test('each press flashes the area even on a missed kick; holding does not restart the flash',()=>{
 for(const action of ['pass','shoot']){
  const s=scene(),input={x:0,y:0},p=s.P[0],sim=createPhysics({state:()=>s,input:()=>input,externalAI:{update(){}}});
  s.ball.x+=300;input[action]=true;sim.step(1/60);assert.equal(p.actionFlash,cfg.actionFlashDuration);assert.equal(s.ball.kickedBy,undefined);
  for(let i=0;i<12;i++)sim.step(1/60);assert.equal(p.actionFlash,0);
  input[action]=false;sim.step(1/60);input[action]=true;sim.step(1/60);assert.equal(p.actionFlash,cfg.actionFlashDuration);
 }
});
test('network frame and delta carry a flash from a missed press',()=>{
 const s=scene(),input={x:0,y:0},sim=createPhysics({state:()=>s,input:()=>input,externalAI:{update(){}}});s.id='area-test';s.cfg={n:1};s.ball.x+=300;
 const baseline=JSON.parse(JSON.stringify(protocol.snapshot(s,0))),encoder=new protocol.Encoder(baseline),decoder=new protocol.Decoder();decoder.read({type:'snapshot',state:baseline});
 input.shoot=true;sim.step(1/60);
 const state=decoder.read(JSON.parse(JSON.stringify(encoder.encode(s,1,{})))).state;assert.equal(state.P[0].actionFlash,.18);
 const frameDecoder=new protocol.Decoder();frameDecoder.read({type:'snapshot',state:baseline});assert.equal(frameDecoder.read(protocol.frameFromMatch(s,1,{})).state.P[0].actionFlash,.18);
});
test('concrete walls return 74.62% of impact normal speed in all four directions',()=>{
 for(const speed of [40,150,360,440])for(const side of ['left','right','top','bottom']){
  const s=scene(),b=s.ball,axis=side==='left'||side==='right'?'x':'y',v=axis==='x'?'vx':'vy',negative=side==='left'||side==='top';
  b.x=side==='left'?s.BR+.01:side==='right'?s.W-s.BR-.01:s.W/2;b.y=side==='top'?s.BR+.01:side==='bottom'?s.H-s.BR-.01:100;
  b.vx=b.vy=0;b[v]=(negative?-1:1)*speed;let impacts=0;
  const dt=.001;moveBall(s,dt,()=>assert.fail('wall is outside goal mouth'),()=>impacts++);
  assert.equal(impacts,1);assert.equal(Math.sign(b[v]),negative?1:-1);
  const expected=rolling(speed,dt).speed*.7462;assert.ok(Math.abs(Math.abs(b[v])-expected)<1e-9);
  assert.ok(Math.abs(b[v])<speed);assert.ok(Math.abs(b[v])>speed*.73);
 }
});
test('wall collision preserves tangential velocity and never reverses an already separating ball',()=>{
 const s=scene();Object.assign(s.ball,{x:2500,y:s.BR+.01,vx:100,vy:-300});const speed=Math.hypot(100,300),ratio=rolling(speed,.001).speed/speed;
 moveBall(s,.001);assert.ok(Math.abs(s.ball.vx-100*ratio)<1e-9);assert.ok(Math.abs(s.ball.vy-300*ratio*.7462)<1e-9);
 for(const axis of ['x','y']){const a=scene();a.ball.x=axis==='x'?a.BR-.01:a.W/2;a.ball.y=axis==='y'?a.BR-.01:100;a.ball.vx=axis==='x'?100:0;a.ball.vy=axis==='y'?100:0;
  moveBall(a,.00001);assert.ok(a.ball[axis==='x'?'vx':'vy']>0);assert.equal(a.ball.impactVersion,undefined);
 }
});
