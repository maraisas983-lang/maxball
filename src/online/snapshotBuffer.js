(function(root){
 'use strict';
 class SnapshotBuffer {
  constructor(delay=70){this.delay=delay;this.baseDelay=delay;this.frames=[];this.jitter=0;this.offset=null;}
  clear(){this.frames=[];this.offset=null;this.jitter=0;}
  push(state,time){
   const previous=this.frames.at(-1);if(previous&&previous.state.matchId!==state.matchId)this.clear();
   if(this.frames.length&&Number.isFinite(state.tick)&&state.tick<=this.frames.at(-1).state.tick)return;
   if(Number.isFinite(state.serverTime)){
    const offset=time-state.serverTime;this.offset=this.offset===null?offset:Math.min(offset,this.offset+.1);
    if(previous&&Number.isFinite(previous.state.serverTime)){const variation=Math.abs((time-previous.arrival)-(state.serverTime-previous.state.serverTime));this.jitter=this.jitter*.9+Math.min(150,variation)*.1;}
    this.delay=Math.max(this.baseDelay,Math.min(150,this.baseDelay+this.jitter*2));
   }
   this.frames.push({state,time:Number.isFinite(state.serverTime)?state.serverTime+this.offset:time,arrival:time});if(this.frames.length>20)this.frames.shift();
  }
  sample(now){
   if(!this.frames.length)return null;
   const target=now-this.delay;
   while(this.frames.length>2&&this.frames[1].time<=target)this.frames.shift();
   const a=this.frames[0],b=this.frames[1]||a,t=a===b?1:Math.max(0,Math.min(1,(target-a.time)/(b.time-a.time||1)));
   const discontinuity=a.state.G?.phase!==b.state.G?.phase||a.state.G?.ko!==b.state.G?.ko;
   const mix=(x,y)=>discontinuity||Math.hypot(y.x-x.x,y.y-x.y)>120?{...y}:{...y,x:x.x+(y.x-x.x)*t,y:x.y+(y.y-x.y)*t};
   const players=new Map(a.state.P.map(p=>[p.id,p]));
   return {...b.state,P:b.state.P.map(p=>mix(players.get(p.id)||p,p)),ball:mix(a.state.ball,b.state.ball)};
  }
 }
 if(typeof module!=='undefined')module.exports={SnapshotBuffer};else root.MaxballSnapshots={SnapshotBuffer};
})(globalThis);
