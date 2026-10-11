(function(root){
 'use strict';
 const physics=typeof module!=='undefined'?require('../physics/playerPhysics.js'):root.MaxballPhysics;
 const balls=typeof module!=='undefined'?require('../physics/ballPhysics.js'):root.MaxballBall;
 const config=typeof module!=='undefined'?require('../core/config.js').physics:root.MaxballConfig.physics;
 // Use the authoritative engine in an isolated copy, including its contacts.
 // The displayed ball and opponents remain server-authoritative.
 function replay(state,userId,segments){
  const source=state?.P.find(p=>p.id===userId);if(!source)return null;
  if(state.G.pauseState||state.G.phase!=='play'||state.G.restarting||source.inactive)return {...source};
  const world={...state,P:state.P.map(p=>({...p,ctrl:'remote',attributes:p.attributes&&{...p.attributes}})),ball:{...state.ball},G:{...state.G,cfg:state.cfg||state.G.cfg,areaOccupancy:state.G.areaOccupancy?.slice(),substitution:null}};
  let current={x:0,y:0};const engine=physics.createPhysics({state:()=>world,externalAI:{command:()=>({x:0,y:0})},input:p=>p.id===userId?current:{x:(p.vx||0)/config.playerMaxSpeed,y:(p.vy||0)/config.playerMaxSpeed}});
  let budget=.5;
  for(const segment of segments){current={x:segment.x||0,y:segment.y||0};let left=Math.max(0,Math.min(budget,segment.seconds));while(left>1e-8){const dt=Math.min(1/60,left);engine.step(dt);balls.moveBall(world,dt);left-=dt;budget-=dt;}if(budget<=1e-8)break;}
  const p=world.P.find(p=>p.id===userId);if(!segments.length||Math.hypot(current.x,current.y)<.01)p.vx=p.vy=0;return p;
 }
 function predict(state,userId,input,seconds){return replay(state,userId,[{...input,seconds:Math.min(.2,seconds)}]);}
 function predictTimeline(state,userId,history,from,to){let input=history[0]||{x:0,y:0},at=from;const segments=[];for(const s of history){if(s.at<=from){input=s;continue;}if(s.at>to)break;segments.push({...input,seconds:(s.at-at)/1000});at=s.at;input=s;}segments.push({...input,seconds:Math.max(0,to-at)/1000});return replay(state,userId,segments);}
 // Replay only the interval not yet simulated by the server, not a ping guess.
 function pending(state,userId,commands,now){const ack=state.inputState?.[userId];if(!ack)return replay(state,userId,commands.map((c,i)=>({...c,seconds:Math.max(0,((commands[i+1]?.at??now)-c.at)/1000)})));const index=commands.findIndex(c=>c.seq===ack.seq),segments=[];for(let i=0;i<commands.length;i++){const c=commands[i];if(c.seq<ack.seq)continue;let seconds=Math.max(0,((commands[i+1]?.at??now)-c.at)/1000);if(i===index)seconds=Math.max(0,seconds-ack.seconds);segments.push({...c,seconds});}return replay(state,userId,segments);}
 function reconcile(state,userId,previous,input,dt,target){if(!previous||!Number.isFinite(dt)||dt<=0||dt>.25)return target;const advancing=predict({...state,P:state.P.map(p=>p.id===userId?previous:p)},userId,input,Math.min(.05,dt)),k=1-Math.exp(-10*dt);return {...target,x:advancing.x+(target.x-advancing.x)*k,y:advancing.y+(target.y-advancing.y)*k};}
 const api={predict,predictTimeline,replay,pending,reconcile};if(typeof module!=='undefined')module.exports=api;else root.MaxballPrediction=api;
})(globalThis);
