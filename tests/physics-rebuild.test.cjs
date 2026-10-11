const test=require('node:test'),assert=require('node:assert/strict');
const {scene,physics,directions,frameRates,ranges}=require('./gameplay-calibration.cjs');
const cfg=require('../src/core/config.js').physics;
const {moveBall,predictTrajectory,rolling,travelTime,prepareContacts}=require('../src/physics/ballPhysics.js');
const {resolveContacts}=require('../src/physics/contacts.js');
const {bindJoystick}=require('../src/input/pointerControls.js');
const {Target,Element,gameHarness}=require('./helpers.cjs');
test('576 contact vectors: 72 angles, perpendicular/opposing input, stationary/incoming ball',()=>{assert.equal(directions().length,576);});
test('rear and lateral contacts kick outward independently of last heading',()=>{
 for(const angle of [Math.PI,Math.PI/2,-Math.PI/2]){const s=scene(),p=s.P[0],r=cfg.playerRadius+s.BR,x=Math.cos(angle),y=Math.sin(angle);s.ball.x=p.x+x*r;s.ball.y=p.y+y*r;assert.equal(physics(s,{x:0,y:0}).kick(p,'s'),true);assert.ok(s.ball.vx*x+s.ball.vy*y>0);}
 const s=scene();s.ball.x=s.P[0].x;s.ball.y=s.P[0].y;assert.equal(physics(s,{x:0,y:0}).kick(s.P[0],'s'),false);
});
test('manual pass strength stays independent of joystick and rolls less far than a shot',()=>{
 const speeds=[];for(const strength of [.05,1]){const s=scene();physics(s,{x:strength,y:0,pass:true}).step(1/60);speeds.push(s.ball.vx);let before=s.ball.vx;for(let i=0;i<900;i++){moveBall(s,1/60);assert.ok(s.ball.vx>=0&&s.ball.vx<=before+1e-8);before=s.ball.vx;}assert.equal(before,0);}
 assert.equal(speeds[0],speeds[1]);assert.ok(speeds[0]<cfg.shotImpulse);
 const width=require('../src/game/fieldConfig.js').dimensions(1,0).W;
 assert.ok(rolling(cfg.passImpulse,60).distance<width*.75);assert.ok(rolling(cfg.shotImpulse,60).distance<width);
});
test('slow dribbling transfers only proportional motion, without strong repeat impulses or body overlap',()=>{
 for(const strength of [.1,.3,1]){const s=scene(),p=s.P[0],sim=physics(s,{x:strength,y:0});let max=0;for(let i=0;i<240;i++){sim.step(1/60);moveBall(s,1/60);max=Math.max(max,Math.hypot(s.ball.vx,s.ball.vy));assert.ok(Math.hypot(s.ball.x-p.x,s.ball.y-p.y)>=cfg.playerRadius+s.BR-.002);}
 assert.ok(s.ball.x>2028.4);assert.ok(max<=cfg.playerMaxSpeed*strength+1e-8);}
});
test('symmetric tackles have no spontaneous energy and are independent of player iteration order',()=>{
 function tackle(reverse){const s=scene(),r=cfg.playerRadius+s.BR;s.ball.x=2000;s.P=[{id:'left',x:2000-r+2,y:2000,vx:180,vy:0,team:0},{id:'right',x:2000+r-2,y:2000,vx:-180,vy:0,team:1}];if(reverse)s.P.reverse();for(let i=0;i<60;i++)resolveContacts(s.P,s.ball,s.BR,1/60);for(const p of s.P)assert.ok(Math.hypot(s.ball.x-p.x,s.ball.y-p.y)>=r-.002);assert.ok(Math.hypot(s.ball.vx,s.ball.vy)<1e-8);return s.ball;}
 assert.deepEqual(tackle(false),tackle(true));
});
test('maximum speed shots cannot tunnel through stationary discs or either post',()=>{
 const s=scene(),p=s.P[0];s.ball.x=p.x-70;s.ball.vx=cfg.ballMaxSpeed;prepareContacts(s.ball,[p],()=>{});
 for(let i=0;i<15;i++){moveBall(s,1/60);assert.ok(s.ball.x<=p.x-cfg.playerRadius-s.BR+.002);}assert.ok(s.ball.vx<p.vx);
 for(const side of [0,1])for(const y of [s.GY0,s.GY1]){const f=scene();f.P=[];f.ball={x:side?f.W-30:30,y,vx:side?cfg.ballMaxSpeed:-cfg.ballMaxSpeed,vy:0};for(let i=0;i<10;i++)moveBall(f,1/60);assert.ok(side?f.ball.vx<0:f.ball.vx>0);assert.ok(Math.hypot(f.ball.x-(side?f.W:0),f.ball.y-y)>=f.BR+cfg.postRadius-.001);}
});
test('fixed 60 Hz simulation produces identical positions/velocities at six rendering frame rates',()=>{assert.equal(frameRates().length,6);});
test('exact free roll agrees across timesteps, stops continuously and shares the prediction model',()=>{
 const results=[];for(const fps of [20,30,60,144]){const s=scene();s.ball.vx=cfg.shotImpulse;for(let i=0;i<fps*2;i++)moveBall(s,1/fps);results.push(s.ball);}
 for(const b of results){assert.ok(Math.abs(b.x-results[0].x)<1e-8);assert.ok(Math.abs(b.vx-results[0].vx)<1e-8);}
 const s=scene();s.ball.vx=340;const before=structuredClone(s.ball),forecast=predictTrajectory(s,1);assert.deepEqual(s.ball,before);for(let i=0;i<60;i++)moveBall(s,1/60);assert.ok(Math.abs(forecast.x-s.ball.x)<1e-9);assert.equal(forecast.vx,s.ball.vx);
 for(const speed of [170,340,680]){const distance=rolling(speed,1).distance;assert.ok(Math.abs(travelTime(distance,speed)-1)<1e-6);}
 const slow=rolling(.1,1);assert.equal(slow.speed,0);assert.ok(slow.distance>0&&slow.distance<.01);
});

test('controlled rolling remains gradual, below 1.0.8 travel and above the old abrupt stop',()=>{
 const previous=(speed,dt)=>{const drag=-Math.log(.65),offset=8/drag,t=Math.min(dt,Math.log1p(speed/offset)/drag);return {speed:Math.max(0,(speed+offset)*Math.exp(-drag*t)-offset),distance:(speed+offset)*(-Math.expm1(-drag*t))/drag-offset*t};};
 for(const speed of [40,cfg.passImpulse,cfg.shotImpulse]){
  assert.equal(rolling(speed,0).speed,speed);assert.ok(rolling(speed,1).speed>0);
  assert.ok(rolling(speed,1).speed<previous(speed,1).speed);
  assert.ok(rolling(speed,60).distance<previous(speed,60).distance);
  assert.equal(rolling(speed,60).speed,0);
 }
 assert.equal(cfg.playerMaxSpeed,150);assert.equal(cfg.passImpulse,250);assert.equal(cfg.shotImpulse,360);
 const slow=rolling(40,60);assert.ok(slow.distance>30&&slow.distance<40);
 const s=scene();s.P=[];s.ball.vx=40;const start=s.ball.x;for(let i=0;i<180;i++)moveBall(s,1/60);
 assert.ok(Math.abs(s.ball.x-start-slow.distance)<1e-8);assert.equal(s.ball.vx,0);
});

test('real joystick mapping and desktop keyboard share screen/world axes in all eight directions',()=>{
 const h=gameHarness();h.api.start('train');const p=h.api.state.P[0],host=new Target(),node=new Element('div','joy'),knob=new Element(),value={x:0,y:0};bindJoystick(node,knob,value,host);
 for(let i=0;i<8;i++){const x=Math.cos(i*Math.PI/4),y=Math.sin(i*Math.PI/4);node.onpointerdown({pointerId:1,clientX:500+x*320,clientY:280+y*320});
  const keys=h.api.state.keys;for(const k of Object.keys(keys))delete keys[k];if(x>.1)keys.ArrowRight=true;if(x<-.1)keys.ArrowLeft=true;if(y>.1)keys.ArrowDown=true;if(y<-.1)keys.ArrowUp=true;const keyboard=h.api.inputOf(p),n=Math.hypot(keyboard.x,keyboard.y);
  assert.ok(Math.abs(value.x-keyboard.x/n)<1e-12);assert.ok(Math.abs(value.y-keyboard.y/n)<1e-12);host.dispatch('pointerup',{pointerId:1});
 }
});
