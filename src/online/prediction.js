(function(root){
 const movement=typeof module!=='undefined'?require('../physics/movement.js'):root.MaxballMovement;
 const field=typeof module!=='undefined'?require('../game/field.js'):root.MaxballField;
 const config=typeof module!=='undefined'?require('../core/config.js').physics:root.MaxballConfig.physics;
 function predict(state,userId,input,seconds){
  const source=state?.P.find(p=>p.id===userId);if(!source)return null;
  const p={...source};if(Math.hypot(input.x,input.y)<.01)p.vx=p.vy=0;if(state.G.pauseState||state.G.phase!=='play'||state.G.restarting||p.inactive)return p;
  if([0,state.W].some(x=>[state.GY0,state.GY1].some(y=>Math.hypot(p.x-x,p.y-y)<70)))return p;
  // Predict movement only in free space; contacts and all ball actions stay authoritative.
  const radius=config.playerRadius||20,ballRadius=state.BR||config.ballRadius,others=state.P.filter(q=>q.id!==p.id&&!q.inactive&&!q.hid);
  if(Math.hypot(p.x-state.ball.x,p.y-state.ball.y)<radius+ballRadius||others.some(q=>Math.hypot(p.x-q.x,p.y-q.y)<2*radius))return p;
  let remaining=Math.max(0,Math.min(.2,seconds));while(remaining>0){const dt=Math.min(1/60,remaining);movement.integrate(p,input,dt);remaining-=dt;
   for(const q of [state.ball,...others]){const r=q===state.ball?radius+ballRadius:radius*2,dx=p.x-q.x,dy=p.y-q.y,d=Math.hypot(dx,dy);if(d<r&&d>1e-6){p.x=q.x+dx/d*r;p.y=q.y+dy/d*r;p.vx=p.vy=0;}}
  }
  p.x=Math.max(-50,Math.min(state.W+50,p.x));p.y=Math.max(-50,Math.min(state.H+50,p.y));if(state.G.areaOccupancy?.[p.team]>=2&&!field.inArea(source,p.team,state)&&field.inArea(p,p.team,state))return {...source};return p;
 }
 function predictTimeline(state,userId,history,from,to){if(!history.length)return predict(state,userId,{x:0,y:0},0);let p=state.P.find(p=>p.id===userId);if(!p)return null;let input=history[0],at=from;for(const sample of history){if(sample.at<=from){input=sample;continue;}if(sample.at>to)break;if(sample.at>at){p=predict({...state,P:state.P.map(q=>q.id===userId?p:q)},userId,input,(sample.at-at)/1000);at=sample.at;}input=sample;}return predict({...state,P:state.P.map(q=>q.id===userId?p:q)},userId,input,Math.max(0,to-at)/1000);}
 function reconcile(state,userId,previous,input,dt,target){
  if(!previous||!Number.isFinite(dt)||dt<=0||dt>.25||Math.hypot(target.x-previous.x,target.y-previous.y)>120)return target;
  const advancing=predict({...state,P:state.P.map(p=>p.id===userId?previous:p)},userId,input,Math.min(.05,dt));if(!advancing)return target;
  const blend=1-Math.exp(-10*Math.min(.05,dt));return {...target,x:advancing.x+(target.x-advancing.x)*blend,y:advancing.y+(target.y-advancing.y)*blend};
 }
 const api={predict,predictTimeline,reconcile};if(typeof module!=='undefined')module.exports=api;else root.MaxballPrediction=api;
})(globalThis);
