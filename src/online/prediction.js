(function(root){
 const movement=typeof module!=='undefined'?require('../physics/movement.js'):root.MaxballMovement;
 function predict(state,userId,input,seconds){
  const source=state?.P.find(p=>p.id===userId);if(!source)return null;
  const p={...source};if(state.G.phase!=='play'||state.G.restarting||p.inactive)return p;
  if([0,state.W].some(x=>[state.GY0,state.GY1].some(y=>Math.hypot(p.x-x,p.y-y)<70)))return p;
  // Predict movement only in free space; contacts and all ball actions stay authoritative.
  if(Math.hypot(p.x-state.ball.x,p.y-state.ball.y)<85||state.P.some(q=>q.id!==p.id&&Math.hypot(p.x-q.x,p.y-q.y)<90))return p;
  let remaining=Math.max(0,Math.min(.12,seconds));while(remaining>0){const dt=Math.min(1/60,remaining);movement.integrate(p,input,dt);remaining-=dt;}
  p.x=Math.max(-50,Math.min(state.W+50,p.x));p.y=Math.max(-50,Math.min(state.H+50,p.y));return p;
 }
 const api={predict};if(typeof module!=='undefined')module.exports=api;else root.MaxballPrediction=api;
})(globalThis);
