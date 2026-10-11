const test=require('node:test'),assert=require('node:assert/strict');
const cfg=require('../src/core/config.js').physics;
const {resolveContacts}=require('../src/physics/contacts.js');
const {scene,physics}=require('./gameplay-calibration.cjs');
const {moveBall,rolling,passSpeed,travelTime}=require('../src/physics/ballPhysics.js');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const momentum=(b,players,axis)=>cfg.ballMass*b[axis]+players.reduce((sum,p)=>sum+cfg.playerMass*p[axis],0);
const energy=(b,players)=>cfg.ballMass*(b.vx**2+b.vy**2)+players.reduce((sum,p)=>sum+cfg.playerMass*(p.vx**2+p.vy**2),0);

function impacts(){
 const records=[];
 for(let degrees=0;degrees<360;degrees+=5)for(const incoming of [0,-300])for(const lateral of [0,90]){
  const a=degrees*Math.PI/180,nx=Math.cos(a),ny=Math.sin(a),r=cfg.playerRadius+cfg.ballRadius;
  const p={id:'p',x:0,y:0,vx:nx*80-ny*lateral,vy:ny*80+nx*lateral,fx:-nx,fy:-ny};
  const b={x:nx*(r-.01),y:ny*(r-.01),vx:nx*incoming,vy:ny*incoming};
  const before={player:{...p},ball:{...b}},px=momentum(b,[p],'vx'),py=momentum(b,[p],'vy'),ke=energy(b,[p]);
  resolveContacts([p],b,cfg.ballRadius,1/60);
  const expected=(1+cfg.contactRestitution)*(80-incoming)/(1/cfg.ballMass+1/cfg.playerMass);
  near(b.vx,nx*(incoming+expected/cfg.ballMass));near(b.vy,ny*(incoming+expected/cfg.ballMass));
  near(momentum(b,[p],'vx'),px);near(momentum(b,[p],'vy'),py);assert.ok(energy(b,[p])<=ke+1e-7);
  near(-p.vx*ny+p.vy*nx,lateral); // No invented tangential force.
  const velocity=[b.vx,b.vy,p.vx,p.vy];for(let i=0;i<20;i++)resolveContacts([p],b,cfg.ballRadius,1/60);
  [b.vx,b.vy,p.vx,p.vy].forEach((v,i)=>near(v,velocity[i]));
  records.push({degrees,incoming,lateral,before,after:{player:p,ball:b},impulse:expected,energyBefore:ke,energyAfter:energy(b,[p])});
 }
 return records;
}
test('288 measured frontal/glancing/interception impacts obey two-body mass response, momentum and energy',()=>assert.equal(impacts().length,288));
test('pure tangential contact and idle penetration cannot launch the ball',()=>{
 for(const dt of [0,1/144,1/60,1/20]){const p={id:'p',x:0,y:0,vx:0,vy:-180},b={x:28.3,y:0,vx:0,vy:0};resolveContacts([p],b,cfg.ballRadius,dt);near(b.vx,0);near(b.vy,0);near(p.vy,-180);assert.ok(b.x-p.x>=28.399);}
});
test('simultaneous opposing impacts preserve symmetry and total energy without a ball speed clamp',()=>{
 const outcomes=[];
 for(const reverse of [false,true]){const b={x:0,y:0,vx:0,vy:0},ps=[{id:'a',x:-28,y:0,vx:180,vy:0},{id:'b',x:28,y:0,vx:-180,vy:0}];if(reverse)ps.reverse();const initial=energy(b,ps);resolveContacts(ps,b,cfg.ballRadius,1/60);near(b.vx,0);near(momentum(b,ps,'vx'),0);assert.ok(energy(b,ps)<initial);for(const p of ps)assert.ok(Math.hypot(b.x-p.x,b.y-p.y)>=28.399);outcomes.push({b,ps:ps.sort((a,b)=>a.id.localeCompare(b.id))});}
 assert.deepEqual(...outcomes);
});
function runningPass(){
 const s=scene(),p=s.P[0],input={x:1,y:0,pass:true},sim=physics(s,input);p.vx=cfg.playerMaxSpeed;
 for(let i=0;i<30;i++){sim.step(1/60);moveBall(s,1/60);input.pass=false;}
 const gap=s.ball.x-p.x-cfg.playerRadius-s.BR;
 const freeGap=rolling(cfg.passImpulse,.5).distance-cfg.playerMaxSpeed*.5;assert.ok(gap>=freeGap-.01&&gap<=freeGap+cfg.playerRadius);assert.ok(s.ball.vx>cfg.playerMaxSpeed);
 return {seconds:.5,clearGap:gap,ballVelocity:s.ball.vx,playerVelocity:p.vx,oldFreePassAtHalfSecond:rolling(190,.5).speed};
}
test('a pass at full running speed opens a measurable gap instead of immediately being caught',runningPass);
test('short and long targeted passes share exact drag timing while remaining weaker than a shot',()=>{
 const velocities=[];for(const distance of [60,220]){const s=scene(),p=s.P[0],sim=physics(s,{});assert.ok(sim.kick(p,'p',{x:distance,y:0}));velocities.push(s.ball.vx);const t=travelTime(distance,s.ball.vx);assert.ok(Number.isFinite(t));assert.ok(Math.abs(rolling(s.ball.vx,t).distance-distance)<.0001);assert.equal(s.ball.vy,0);assert.equal(s.ball.vx,passSpeed(distance));assert.ok(s.ball.vx<cfg.shotImpulse);}
 assert.ok(velocities[1]>velocities[0]);
});
test('after leaving contact, changing joystick cannot alter a free ball trajectory',()=>{
 const results=[];for(const input of [{x:0,y:-1},{x:0,y:1},{x:-1,y:0}]){const s=scene();s.ball.x+=150;s.ball.vx=200;s.ball.vy=45;const sim=physics(s,input);for(let i=0;i<30;i++){sim.step(1/60);moveBall(s,1/60);}results.push(s.ball);}
 assert.deepEqual(results[0],results[1]);assert.deepEqual(results[0],results[2]);
});
if(require.main===module&&process.argv.includes('--report'))require('node:fs').writeFileSync('docs/mass-calibration-1.0.5.json',JSON.stringify({config:cfg,impacts:impacts(),runningPass:runningPass()},null,2)+'\n');
