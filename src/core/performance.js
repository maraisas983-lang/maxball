(function(root){
 'use strict';
 class Meter {
  constructor(now=()=>performance.now()){this.now=now;this.reset();}
  reset(){this.samples=new Float64Array(180);this.used=0;this.cursor=0;this.lastFrame=0;this.started=this.now();this.frames=0;this.activeMs=0;this.minimum=Infinity;this.costs={physics:0,render:0,network:0,ai:0};this.counts={physics:0,render:0,network:0,ai:0,collisions:0,created:0};this.entities=0;this.particles=0;}
  add(kind,ms,count=1){if(kind in this.costs)this.costs[kind]+=Math.max(0,ms);if(kind in this.counts)this.counts[kind]+=count;}
  frame(now,entities=0,particles=0){if(this.lastFrame){const ms=now-this.lastFrame;if(ms>0){this.activeMs+=ms;this.samples[this.cursor++%180]=ms;this.used=Math.min(180,this.used+1);this.minimum=Math.min(this.minimum,1000/ms);}}this.lastFrame=now;this.frames++;this.entities=entities;this.particles=particles;}
  idle(){this.lastFrame=0;}
  snapshot(){const seconds=Math.max(.001,(this.activeMs+(this.used?this.samples[0]:0))/1000||(this.now()-this.started)/1000),times=Array.from(this.samples.subarray(0,this.used)).sort((a,b)=>a-b),mean=times.reduce((a,b)=>a+b,0)/Math.max(1,times.length),cost={};for(const key of Object.keys(this.costs))cost[key]={meanMs:this.costs[key]/Math.max(1,this.counts[key]),updatesPerSecond:this.counts[key]/seconds};return {fps:mean?1000/mean:0,minFps:Number.isFinite(this.minimum)?this.minimum:0,averageFps:this.frames/seconds,frameMs:mean,p95FrameMs:times[Math.floor(times.length*.95)]||0,cost,entities:this.entities,particles:this.particles,collisionsPerSecond:this.counts.collisions/seconds,managedObjectsPerSecond:this.counts.created/seconds,heapBytes:root.performance?.memory?.usedJSHeapSize??null,listeners:root.MaxballCore?.listenerCount?.()??null};}
 }
 class ParticlePool {
  constructor(limit=640){this.limit=limit;this.active=[];this.free=[];this.created=0;}
  acquire(value){if(this.active.length>=this.limit)return null;const p=this.free.pop()||{t:'c',x:0,y:0,vx:0,vy:0,g:0,l:0,m:0,c:'#fff',s:0,r:0,txt:''};if(!p._pooled){p._pooled=true;this.created++;}p.t='c';p.x=p.y=p.vx=p.vy=p.g=p.l=p.m=p.s=p.r=0;p.txt='';Object.assign(p,value);this.active.push(p);return p;}
  release(p){if(this.free.length<640)this.free.push(p);}
  clear(){for(const p of this.active)this.release(p);this.active.length=0;}
 }
 const meter=new Meter(),api={Meter,ParticlePool,meter};
 if(typeof module!=='undefined')module.exports=api;else root.MaxballPerf=api;
})(globalThis);
