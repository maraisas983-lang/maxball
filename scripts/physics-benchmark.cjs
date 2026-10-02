// Reproducible MAXBALL measurements in world units; not Mamoball parameters.
const {Match}=require('../server/online/match.cjs');
const {moveBall}=require('../src/physics/ballPhysics.js');
const {createPhysics}=require('../src/physics/playerPhysics.js');
const cfg=require('../src/core/config.js').physics;
const result={};
for(const initial of [0,60,205]){
 const m=new Match({id:'contact',players:[{id:'p',team:0,slot:0}],cfg:{n:1}}),p=m.P[0];m.P=[p];m.G.restarting=false;m.G.kl=0;p.x=100;p.y=100;p.vx=initial;m.ball={x:130,y:100,vx:0,vy:0,rot:0};m.physics.step(1/60);result['contact_'+initial]=+m.ball.vx.toFixed(3);
}
for(const action of ['pass','shot']){
 const speed=action==='pass'?cfg.passImpulse:cfg.shotImpulse;
 const s={W:10000,H:10000,GY0:4900,GY1:5100,BR:11,G:{phase:'play'},ball:{x:1000,y:1000,vx:speed,vy:0,rot:0}};let ticks=0;
 while(s.ball.vx>speed/2&&ticks<600){moveBall(s,1/60);ticks++;}
 result[action]={initialSpeed:speed,secondsToHalf:+(ticks/60).toFixed(3),distanceToHalf:+(s.ball.x-1000).toFixed(3)};
}
const m=new Match({id:'movement',players:[{id:'p',team:0,slot:0}],cfg:{n:1}}),p=m.P[0];m.P=[p];m.G.restarting=false;p.x=p.y=100;m.ball.x=600;m.ball.y=300;let input={x:1,y:0};m.physics=createPhysics({state:()=>m,input:()=>input});
for(let i=0;i<6;i++)m.physics.step(1/60);result.speedAfter100ms=+p.vx.toFixed(3);
input={x:0,y:0};for(let i=0;i<30;i++)m.physics.step(1/60);result.speedAfter500msReleased=+p.vx.toFixed(6);
console.log(JSON.stringify(result,null,2));
