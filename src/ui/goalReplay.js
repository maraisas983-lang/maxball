(function(root){
 'use strict';
 // Only visual positions are recorded. Playback never runs physics or match events.
 class GoalReplay{
  constructor(){this.reset();}
  reset(){this.frames=[];this.time=0;this.nextSample=0;this.clip=null;this.age=0;}
  capture(dt,state,force=false){
   this.time+=dt;if(!force&&this.time+1e-6<this.nextSample)return;this.nextSample=this.time+.05;
   const frame={time:this.time,ball:{...state.ball},P:state.P.map(p=>({id:p.id,x:p.x,y:p.y,hop:p.hop||0,hid:!!p.hid,inactive:!!p.inactive}))};
   this.frames.push(frame);while(this.frames.length>66||this.frames.length>1&&this.frames[0].time<this.time-3)this.frames.shift();
  }
  start(state){this.capture(0,state,true);this.clip=this.frames.slice();this.age=0;return this.clip.length>1;}
  skip(){this.clip=null;this.frames=[];}
  advance(dt){if(this.clip)this.age+=dt;}
  sample(){
   const clip=this.clip;if(!clip||clip.length<2||this.age<.85)return null;
   const first=clip[0],last=clip[clip.length-1],t=first.time+(this.age-.85)*.8;
   if(t>last.time+.18){this.skip();return null;}
   let i=1;while(i<clip.length-1&&clip[i].time<t)i++;const a=clip[i-1],b=clip[i],f=Math.max(0,Math.min(1,(t-a.time)/(b.time-a.time||1)));
   const mix=(x,y)=>x+(y-x)*f,ball={...b.ball};for(const k of ['x','y','rollX','rollY','rot'])ball[k]=mix(a.ball[k]||0,b.ball[k]||0);
   const previous=new Map(a.P.map(p=>[p.id,p]));return {ball,P:b.P.map(p=>{const q=previous.get(p.id)||p;return {...p,x:mix(q.x,p.x),y:mix(q.y,p.y),hop:mix(q.hop,p.hop)};}),progress:Math.max(0,Math.min(1,(t-first.time)/(last.time-first.time||1)))};
  }
 }
 if(typeof module!=='undefined')module.exports={GoalReplay};else root.MaxballReplay={GoalReplay};
})(globalThis);
