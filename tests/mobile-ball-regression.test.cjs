const test=require('node:test'),assert=require('node:assert/strict');
const {createPhysics}=require('../src/physics/playerPhysics.js');
const {moveBall}=require('../src/physics/ballPhysics.js');
const {Net}=require('../src/physics/netPhysics.js');
const {resolveContacts}=require('../src/physics/contacts.js');
const {gameHarness,plain}=require('./helpers.cjs');
function scene(){const p={id:'human',ctrl:'p1',team:0,x:500,y:280,vx:0,vy:0,fx:1,fy:0,cd:0};const s={W:1000,H:560,GY0:210,GY1:350,BR:11,G:{phase:'play',kl:0,cfg:{diff:1}},P:[p],ball:{x:531,y:280,vx:0,vy:0}};return s;}
test('shot and pass contacts on either side of the heading move outward, with a solid kicker',()=>{
 for(const type of ['s','p'])for(let i=0;i<8;i++)for(const side of [-1,1]){
  const s=scene(),p=s.P[0],x=Math.cos(i*Math.PI/4)*side,y=Math.sin(i*Math.PI/4)*side;p.fx=-x;p.fy=-y;s.ball.x=p.x+31*x;s.ball.y=p.y+31*y;
  const physics=createPhysics({state:()=>s,input:()=>({x:0,y:0}),externalAI:{update(){}}});assert.ok(physics.kick(p,type));
  assert.ok(s.ball.vx*x+s.ball.vy*y>0);assert.ok(Math.abs(s.ball.vx*y-s.ball.vy*x)<1e-8);
  for(let n=0;n<18;n++){physics.step(1/60);moveBall(s,1/60);}
  assert.ok((s.ball.x-p.x)*x+(s.ball.y-p.y)*y>31);
 }
});
test('moving left with a ball touching the right kicks right instead of following the joystick',()=>{
 const s=scene(),p=s.P[0];p.vx=-180;const physics=createPhysics({state:()=>s,input:()=>({x:-1,y:0,shoot:true}),externalAI:{update(){}}});
 physics.step(1/60);assert.equal(s.ball.kickedBy,p.id);assert.ok(s.ball.vx>0);assert.equal(s.ball.vy,0);
});
test('rebounds collide with the kicker immediately and opponents remain solid',()=>{
 const s=scene(),p=s.P[0],physics=createPhysics({state:()=>s,input:()=>({x:0,y:0}),externalAI:{update(){}}});assert.ok(physics.kick(p,'s'));
 s.ball.x=p.x+30;s.ball.vx=-200;resolveContacts([p],s.ball,11,1/60);assert.ok(s.ball.vx>p.vx);assert.ok(p.vx<0);assert.ok(s.ball.x-p.x>=30.999);
 const defender={id:'other',team:1,x:700,y:280,vx:0,vy:0};s.ball.x=670;s.ball.y=280;s.ball.vx=340;
 resolveContacts([defender],s.ball,11,1/60);assert.ok(s.ball.vx<defender.vx);assert.ok(defender.vx>0);assert.ok(defender.x-s.ball.x>=30.999);
});
test('diagonal balls already behind the post cannot hit an imaginary end-line wall',()=>{
 for(const side of [0,1]){const s=scene();s.P=[];s.ball={x:side?1010:-10,y:228,vx:side?150:-150,vy:-120};let goals=0;
 moveBall(s,1/60,()=>{goals++;s.G.phase='goal';});assert.equal(goals,1);assert.ok(side?s.ball.x>1000:s.ball.x<0);
 }
});
test('sleeping net retains occupancy, so a resting scored ball triggers one impact',()=>{
 const net=new Net();let impacts=0;
 for(let i=0;i<1800;i++){if(!net.inside){net.impact(.5,40);impacts++;}net.inside=true;net.update(1/60);}
 assert.equal(impacts,1);assert.equal(net.sleeping,true);net.reset();assert.equal(net.inside,false);
});
test('rolling slows continuously across low speeds and settles without a damping cliff',()=>{
 const losses=[];for(const speed of [44,46]){const s=scene();s.ball.vx=speed;moveBall(s,1/60);losses.push(speed-s.ball.vx);}
 assert.ok(Math.abs(losses[0]-losses[1])<.1);
 const s=scene();s.ball.vx=180;for(let i=0;i<1200;i++)moveBall(s,1/60);assert.equal(s.ball.vx,0);
});
test('joystick, shot and pass sizes persist independently without changing the other controls',()=>{
 const h=gameHarness(),api=h.api.controls,before=api.controlSettings();
 for(const [key,size] of [['j',1.5],['s',1.8],['p',.7]]){
  assert.ok(api.setControlSize(key,size));const now=api.controlSettings();assert.equal(now[key].s,size);
  for(const other of ['j','s','p'])if(other!==key)assert.deepEqual(plain(now[other]),plain(before[other]));
  before[key].s=size;
 }
 const reload=gameHarness({saved:h.storage.getItem('maxball')});assert.deepEqual(plain(reload.api.controls.controlSettings()),plain(before));
});
