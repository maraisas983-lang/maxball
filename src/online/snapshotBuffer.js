(function(root){
 'use strict';
 class SnapshotBuffer {
  constructor(delay=100){this.delay=delay;this.frames=[];}
  clear(){this.frames=[];}
  push(state,time){if(this.frames.length&&this.frames.at(-1).state.matchId!==state.matchId)this.clear();this.frames.push({state,time});if(this.frames.length>20)this.frames.shift();}
  sample(now){
   if(!this.frames.length)return null;
   const target=now-this.delay;
   while(this.frames.length>2&&this.frames[1].time<=target)this.frames.shift();
   const a=this.frames[0],b=this.frames[1]||a,t=a===b?1:Math.max(0,Math.min(1,(target-a.time)/(b.time-a.time||1)));
   const mix=(x,y)=>({...y,x:x.x+(y.x-x.x)*t,y:x.y+(y.y-x.y)*t});
   return {...b.state,P:b.state.P.map(p=>mix(a.state.P.find(q=>q.id===p.id)||p,p)),ball:mix(a.state.ball,b.state.ball)};
  }
 }
 if(typeof module!=='undefined')module.exports={SnapshotBuffer};else root.MaxballSnapshots={SnapshotBuffer};
})(globalThis);
