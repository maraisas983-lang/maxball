(function(root){
 const movement=typeof module!=='undefined'?require('../physics/movement.js'):root.MaxballMovement;
 const field=typeof module!=='undefined'?require('../game/field.js'):root.MaxballField;
 function predict(state,userId,input,seconds){
  const source=state?.P.find(p=>p.id===userId);if(!source)return null;
  const p={...source};if(Math.hypot(input.x,input.y)<.01)p.vx=p.vy=0;if(state.G.pauseState||state.G.phase!=='play'||state.G.restarting||p.inactive)return p;
  if([0,state.W].some(x=>[state.GY0,state.GY1].some(y=>Math.hypot(p.x-x,p.y-y)<70)))return p;
  // Predict movement only in free space; contacts and all ball actions stay authoritative.
  if(Math.hypot(p.x-state.ball.x,p.y-state.ball.y)<85||state.P.some(q=>q.id!==p.id&&Math.hypot(p.x-q.x,p.y-q.y)<90))return p;
  let remaining=Math.max(0,Math.min(.2,seconds));while(remaining>0){const dt=Math.min(1/60,remaining);movement.integrate(p,input,dt);remaining-=dt;}
  p.x=Math.max(-50,Math.min(state.W+50,p.x));p.y=Math.max(-50,Math.min(state.H+50,p.y));if(state.G.areaOccupancy?.[p.team]>=2&&!field.inArea(source,p.team,state)&&field.inArea(p,p.team,state))return {...source};return p;
 }
 function predictTimeline(state,userId,history,from,to){if(!history.length)return predict(state,userId,{x:0,y:0},0);let p=state.P.find(p=>p.id===userId);if(!p)return null;let input=history[0],at=from;for(const sample of history){if(sample.at<=from){input=sample;continue;}if(sample.at>to)break;if(sample.at>at){p=predict({...state,P:state.P.map(q=>q.id===userId?p:q)},userId,input,(sample.at-at)/1000);at=sample.at;}input=sample;}return predict({...state,P:state.P.map(q=>q.id===userId?p:q)},userId,input,Math.max(0,to-at)/1000);}
 const api={predict,predictTimeline};if(typeof module!=='undefined')module.exports=api;else root.MaxballPrediction=api;
})(globalThis);
