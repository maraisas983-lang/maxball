(function(root){
 'use strict';
 const config=(typeof module!=='undefined'?require('../core/config.js'):root.MaxballConfig).match;
 const kickoff=(typeof module!=='undefined'?require('./kickoff.js'):root.MaxballKickoff).kickoff;
 const scenes=new WeakMap(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t;
 const regular=[['PREPARE',.7],['LINEUP',6],['ENTRY',config.entrySeconds],['COUNTDOWN',3]];
 const career=[['STADIUM',1.3],['ENTRY',4.8],['LINEUP',6],['ANTHEM',4],['HANDSHAKE',1.2],['CAPTAINS',1.4],['FORMATION',2.8],['REFEREE',1],['BALL',1],['COUNTDOWN',3]];
 const final=[['STADIUM',3],['ENTRY',6],['LINEUP',6],['ANTHEM',3],['HANDSHAKE',2],['CAPTAINS',2],['TROPHY',3],['FORMATION',3],['COUNTDOWN',3]];
 function stages(cfg){return cfg.final?final:cfg.career?career:regular;}
 function duration(cfg){return Math.round(stages(cfg).reduce((sum,p)=>sum+p[1],0)*1000)/1000;}
 function row(p,s){return {x:s.W/2+(p.slot??s.P.filter(q=>q.team===p.team).indexOf(p))*46-(s.G.cfg.n-1)*23,y:s.H/2+(p.team?1:-1)*65};}
 function begin(s){const targets=s.P.map(p=>({x:p.x,y:p.y}));scenes.set(s.G,{targets});s.G.startDuration=duration(s.G.cfg);s.G.startRemaining=s.G.startDuration;s.G.startStage=(s.G.cfg.career||s.G.cfg.final)?'STADIUM':'PREPARE';s.G.cinematicVariant=s.id?Array.from(s.id).reduce((v,c)=>(v*31+c.charCodeAt(0))%3,0):Math.floor(Math.random()*3);for(const p of s.P){p.tx=p.x;p.ty=p.y;p.hid=true;p.x=s.W/2+(p.team?25:-25);p.y=s.H+60+(p.slot??0)*46;p.vx=p.vy=0;} }
 function advance(s,dt){const G=s.G,scene=scenes.get(G);if(!scene)return true;G.startRemaining=Math.max(0,G.startRemaining-dt);const elapsed=G.startDuration-G.startRemaining;let offset=0,stage=stages(G.cfg).at(-1),t=1;for(const part of stages(G.cfg)){if(elapsed<offset+part[1]){stage=part;t=clamp((elapsed-offset)/part[1],0,1);break;}offset+=part[1];}G.startStage=stage[0];G.stageProgress=t;
  s.P.forEach((p,i)=>{const target=scene.targets[i],line=row(p,s),slot=p.slot??s.P.filter(q=>q.team===p.team).indexOf(p);p.vx=p.vy=0;p.fx=0;p.fy=-1;p.hop=0;
   if(['STADIUM','PREPARE','LINEUP'].includes(G.startStage)&&!(G.cfg.career||G.cfg.final)){p.hid=true;return;}if(G.startStage==='STADIUM'){p.hid=true;return;}p.hid=false;
   if(G.startStage==='ENTRY'){const q=clamp((t-slot*.05)/(1-slot*.05),0,1),ease=q*q*q*(q*(q*6-15)+10);p.hid=q===0;p.x=mix(s.W/2+(p.team?25:-25),(G.cfg.career||G.cfg.final)?line.x:target.x,ease);p.y=mix(s.H+60+slot*46,(G.cfg.career||G.cfg.final)?line.y:target.y,ease);}
   else if((G.cfg.career||G.cfg.final)&&['LINEUP','ANTHEM','HANDSHAKE','CAPTAINS','TROPHY'].includes(G.startStage)){p.x=line.x;p.y=line.y;if(G.startStage==='HANDSHAKE')p.y+=Math.sin(t*Math.PI)*(p.team?-18:18);if(['CAPTAINS','TROPHY'].includes(G.startStage)&&slot===0){const q=G.startStage==='TROPHY'?1:t;p.x=mix(line.x,s.W/2+(p.team?35:-35),q);p.y=mix(line.y,s.H/2-55,q);}}
   else if(G.startStage==='FORMATION'){const from=slot===0?{x:s.W/2+(p.team?35:-35),y:s.H/2-55}:line,ease=t*t*t*(t*(t*6-15)+10);p.x=mix(from.x,target.x,ease);p.y=mix(from.y,target.y,ease);}
   else {p.x=target.x;p.y=target.y;p.fx=p.team?-1:1;p.fy=0;}
  });return G.startRemaining===0;
 }
 // The referee is a room organizer; retain only the match-control status.
 function official(s){const G=s.G;G.official??={mode:'PRE_MATCH'};G.official.mode=G.pauseState||(['starting','intro'].includes(G.phase)?G.startStage:G.phase==='goal'?'GOAL':G.phase==='end'?'FULL_TIME':G.phase==='halftime'?'HALF_TIME':G.phase==='play'?'PLAY':G.phase.toUpperCase());}
 function celebrate(s,dt){const scene=scenes.get(s.G)||{};if(!scene.goalTargets){const scorer=s.P.find(p=>p.id===s.G.scorerId)||s.P.find(p=>p.team===s.G.sc),x=clamp(scorer?.x??s.ball.x,60,s.W-60),y=clamp(scorer?.y??s.ball.y,55,s.H-55);scene.goalTargets=s.P.map((p,i)=>{const slot=p.slot??i,a=slot*Math.PI*2/Math.max(3,s.G.cfg.n),v=s.G.goalVariant||0,dx=p===scorer?0:v===0?Math.cos(a)*55:(slot%3-1)*48,dy=p===scorer?0:v===0?Math.sin(a)*55:v===1?48:slot*26-40;return p.team===s.G.sc?{x:clamp(x+dx,25,s.W-25),y:clamp(y+dy,25,s.H-25)}:{x:p.x,y:p.y};});scenes.set(s.G,scene);}
  for(let i=0;i<s.P.length;i++){const p=s.P[i],q=scene.goalTargets[i],dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy),step=Math.min(d,75*dt);if(d){p.x+=dx/d*step;p.y+=dy/d*step;}p.hop=p.team===s.G.sc?Math.abs(Math.sin(s.G.pt*8+i))*10:0;} }
 function halftime(s,dt){let scene=scenes.get(s.G);if(!scene?.half){const target={...s,G:{...s.G,ko:1},P:s.P.map(p=>({...p}))};kickoff(target);scene={half:{from:s.P.map(p=>({x:p.x,y:p.y})),to:target.P.map(p=>({x:p.x,y:p.y}))}};scenes.set(s.G,scene);}const t=1-clamp(s.G.breakRemaining/6,0,1),q=t<.5?t*2:(t-.5)*2,ease=q*q*q*(q*(q*6-15)+10);for(let i=0;i<s.P.length;i++){const p=s.P[i],tunnel={x:s.W/2+(p.team?25:-25)+(p.slot??0)*16,y:s.H+90},a=t<.5?scene.half.from[i]:tunnel,b=t<.5?tunnel:scene.half.to[i];p.x=mix(a.x,b.x,ease);p.y=mix(a.y,b.y,ease);p.vx=p.vy=0;p.hid=false;}}
 function reset(s){scenes.delete(s.G);}
 const api={begin,advance,duration,official,celebrate,halftime,reset};if(typeof module!=='undefined')module.exports=api;else root.MaxballCeremony=api;
})(globalThis);
