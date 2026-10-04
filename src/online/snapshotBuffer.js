(function(root){
 'use strict';
 const physics=typeof module!=='undefined'?require('../physics/ballPhysics.js'):root.MaxballBall;
 class SnapshotBuffer {
  constructor(delay=70){this.delay=delay;this.baseDelay=delay;this.frames=[];this.jitter=0;this.offset=null;}
  clear(){this.frames=[];this.offset=null;this.jitter=0;}
  push(state,time){
   let previous=this.frames.at(-1);if(previous&&previous.state.matchId!==state.matchId){this.clear();previous=null;}
   if(this.frames.length&&Number.isFinite(state.tick)&&state.tick<=this.frames.at(-1).state.tick)return;
   if(Number.isFinite(state.serverTime)){
    const offset=time-state.serverTime;this.offset=this.offset===null?offset:Math.min(offset,this.offset+.1);
    if(previous&&Number.isFinite(previous.state.serverTime)){const variation=Math.abs((time-previous.arrival)-(state.serverTime-previous.state.serverTime));this.jitter=this.jitter*.9+Math.min(150,variation)*.1;}
    this.delay=Math.max(this.baseDelay,Math.min(150,this.baseDelay+this.jitter*2));
   }
   this.frames.push({state,players:new Map(state.P.map(p=>[p.id,p])),time:Number.isFinite(state.serverTime)?state.serverTime+this.offset:time,arrival:time});if(this.frames.length>20)this.frames.shift();
  }
  sample(now){
   if(!this.frames.length)return null;
   const target=now-this.delay;
   while(this.frames.length>2&&this.frames[1].time<=target)this.frames.shift();
   const a=this.frames[0],b=this.frames[1]||a,t=a===b?1:Math.max(0,Math.min(1,(target-a.time)/(b.time-a.time||1)));
   const cinematic=['starting','intro','halftime'].includes(b.state.G?.phase);
   const discontinuity=(!cinematic&&a.state.G?.phase!==b.state.G?.phase)||a.state.G?.ko!==b.state.G?.ko||a.state.G?.pauseState!==b.state.G?.pauseState||a.state.G?.sidesSwapped!==b.state.G?.sidesSwapped;
   const mix=(x,y)=>discontinuity||Math.hypot(y.x-x.x,y.y-x.y)>120?{...y}:{...y,x:x.x+(y.x-x.x)*t,y:x.y+(y.y-x.y)*t};
   const players=a.players;
   const ball=mix(a.state.ball,b.state.ball);
   // Unwrap rolling angles without changing authoritative coordinates or velocities.
   for(const key of ['rollX','rollY'])if(Number.isFinite(a.state.ball[key])&&Number.isFinite(b.state.ball[key])&&!discontinuity)ball[key]=a.state.ball[key]+(b.state.ball[key]-a.state.ball[key])*t;
   const P=b.state.P.map(p=>mix(players.get(p.id)||p,p)),gap=Math.min(50,Math.max(0,target-b.time))/1000;
   if(gap>0&&Number.isFinite(b.state.W)&&b.state.G.phase==='play'&&!b.state.G.restarting&&!b.state.G.pauseState){
    // A short missing frame can continue in free space. Never predict a contact.
    if(P.every(p=>p.inactive||Math.hypot(p.x-ball.x,p.y-ball.y)>80))Object.assign(ball,physics.predictTrajectory({...b.state,ball},gap));
    for(const p of P)if(!p.inactive&&Math.hypot(p.x-ball.x,p.y-ball.y)>80&&!P.some(q=>q!==p&&!q.inactive&&Math.hypot(p.x-q.x,p.y-q.y)<80)){
     p.x=Math.max(-50,Math.min(b.state.W+50,p.x+p.vx*gap));p.y=Math.max(-50,Math.min(b.state.H+50,p.y+p.vy*gap));
    }
   }
   return {...b.state,P,ball};
  }
 }
 if(typeof module!=='undefined')module.exports={SnapshotBuffer};else root.MaxballSnapshots={SnapshotBuffer};
})(globalThis);
