(function(root){
 'use strict';
 const config=(typeof module!=='undefined'?require('../core/config.js'):root.MaxballConfig).match;
 const kickoff=(typeof module!=='undefined'?require('./kickoff.js'):root.MaxballKickoff).kickoff;
 const scenes=new WeakMap(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t;
 const regular=[['PREPARE',.7],['LINEUP',6],['ENTRY',config.entrySeconds],['FORMATION',3],['COUNTDOWN',3]];
 const career=[['STADIUM',1.3],['ENTRY',4.8],['LINEUP',6],['ANTHEM',4],['HANDSHAKE',1.2],['CAPTAINS',1.4],['FORMATION',2.8],['REFEREE',1],['BALL',1],['COUNTDOWN',3]];
 const final=[['STADIUM',3],['ENTRY',6],['LINEUP',6],['ANTHEM',3],['HANDSHAKE',2],['CAPTAINS',2],['TROPHY',3],['FORMATION',3],['COUNTDOWN',3]];
 function stages(cfg){return cfg.final?final:cfg.career?career:regular;}
 function duration(cfg){return Math.round(stages(cfg).reduce((sum,p)=>sum+p[1],0)*1000)/1000;}
 const ease=t=>t*t*t*(t*(t*6-15)+10);
 function separate(players){for(let iteration=0;iteration<10;iteration++){let overlaps=0;for(let a=0;a<players.length;a++)for(let b=a+1;b<players.length;b++){const p=players[a],q=players[b];if(p.hid||q.hid)continue;const dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy);if(d>=40.2)continue;const nx=d?dx/d:1,ny=d?dy/d:0,push=(40.2-d)*.5;overlaps++;p.x-=nx*push;p.y-=ny*push;q.x+=nx*push;q.y+=ny*push;}if(!overlaps)break;}}
 // Visibility graph around stationary teammates; computed once per substitution.
 function route(from,to,obstacles){const clear=(a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,n=dx*dx+dy*dy||1;return obstacles.every(p=>{const t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/n,0,1);return Math.hypot(a.x+dx*t-p.x,a.y+dy*t-p.y)>=39.8;});};if(clear(from,to))return [from,to];const points=[from,to];for(const p of obstacles)for(let i=0;i<8;i++){const a=i*Math.PI/4,q={x:p.x+48*Math.cos(a),y:p.y+48*Math.sin(a)};if(obstacles.every(o=>Math.hypot(q.x-o.x,q.y-o.y)>=39.8))points.push(q);}const costs=points.map(()=>Infinity),previous=[],visited=new Set();costs[0]=0;for(let step=0;step<points.length;step++){let u=-1;for(let i=0;i<points.length;i++)if(!visited.has(i)&&(u<0||costs[i]<costs[u]))u=i;if(u<0||!Number.isFinite(costs[u]))break;if(u===1){const path=[];for(let i=1;i!==undefined;i=previous[i])path.unshift(points[i]);return path;}visited.add(u);for(let v=0;v<points.length;v++)if(!visited.has(v)){const cost=costs[u]+Math.hypot(points[u].x-points[v].x,points[u].y-points[v].y);if(cost<costs[v]&&clear(points[u],points[v])){costs[v]=cost;previous[v]=u;}}}return [from,to];}
 function sampleRoute(path,t){if(t<=0)return path[0];if(t>=1)return path.at(-1);let total=0;for(let i=1;i<path.length;i++)total+=Math.hypot(path[i].x-path[i-1].x,path[i].y-path[i-1].y);let left=total*t;for(let i=1;i<path.length;i++){const n=Math.hypot(path[i].x-path[i-1].x,path[i].y-path[i-1].y);if(left<=n||i===path.length-1){const q=n?left/n:1;return {x:mix(path[i-1].x,path[i].x,q),y:mix(path[i-1].y,path[i].y,q)};}left-=n;}return path.at(-1);}

 function begin(s){const targets=s.P.map(p=>({x:p.x,y:p.y})),lines=[],entries=[];
  // Sort each column in the same vertical order as kickoff. The formation
  // transition preserves that order instead of crossing diagonal paths.
  for(const team of [0,1]){const indices=s.P.map((p,i)=>i).filter(i=>s.P[i].team===team).sort((a,b)=>targets[a].y-targets[b].y||targets[a].x-targets[b].x),side=team^(s.G.sidesSwapped?1:0),x=s.W*(side?.72:.28);indices.forEach((i,rank)=>{lines[i]={x,y:s.H/2+(rank-(indices.length-1)/2)*72};entries[i]={x:s.W/2+(side?30:-30),y:s.H+60+rank*72};});}
  scenes.set(s.G,{targets,lines,entries});s.G.startDuration=duration(s.G.cfg);s.G.startRemaining=s.G.startDuration;s.G.startStage=(s.G.cfg.career||s.G.cfg.final)?'STADIUM':'PREPARE';s.G.cinematicVariant=s.id?Array.from(s.id).reduce((v,c)=>(v*31+c.charCodeAt(0))%3,0):Math.floor(Math.random()*3);s.P.forEach((p,i)=>{p.tx=p.x;p.ty=p.y;p.hid=true;Object.assign(p,entries[i]);p.vx=p.vy=0;}); }
 function advance(s,dt){const G=s.G,scene=scenes.get(G);if(!scene)return true;G.startRemaining=Math.max(0,G.startRemaining-dt);const elapsed=G.startDuration-G.startRemaining;let offset=0,stage=stages(G.cfg).at(-1),t=1;for(const part of stages(G.cfg)){if(elapsed<offset+part[1]){stage=part;t=clamp((elapsed-offset)/part[1],0,1);break;}offset+=part[1];}G.startStage=stage[0];G.stageProgress=t;
  s.P.forEach((p,i)=>{const target=scene.targets[i],line=scene.lines[i],entry=scene.entries[i];p.vx=p.vy=0;p.fx=p.team?-1:1;p.fy=0;p.hop=0;
   if(['STADIUM','PREPARE','LINEUP'].includes(G.startStage)&&!(G.cfg.career||G.cfg.final)){p.hid=true;return;}if(G.startStage==='STADIUM'){p.hid=true;return;}p.hid=false;
   if(G.startStage==='ENTRY'){p.x=mix(entry.x,line.x,ease(clamp(t/.22,0,1)));p.y=mix(entry.y,line.y,ease(clamp((t-.22)/.78,0,1)));p.fx=0;p.fy=-1;}
   else if((G.cfg.career||G.cfg.final)&&['LINEUP','ANTHEM','HANDSHAKE','CAPTAINS','TROPHY'].includes(G.startStage)){p.x=line.x;p.y=line.y;}
   else if(G.startStage==='FORMATION'){p.x=mix(line.x,target.x,ease(t));p.y=mix(line.y,target.y,ease(t));}
   else {p.x=target.x;p.y=target.y;p.fx=p.team?-1:1;p.fy=0;}
  });return G.startRemaining===0;
 }
 // The referee is a room organizer; retain only the match-control status.
 function official(s){const G=s.G;G.official??={mode:'PRE_MATCH'};G.official.mode=G.pauseState||(['starting','intro'].includes(G.phase)?G.startStage:G.phase==='goal'?'GOAL':G.phase==='end'?'FULL_TIME':G.phase==='halftime'?'HALF_TIME':G.phase==='play'?'PLAY':G.phase.toUpperCase());}
 function celebrate(s,dt){const scene=scenes.get(s.G)||{};if(!scene.goalTargets){const scorer=s.P.find(p=>p.id===s.G.scorerId)||s.P.find(p=>p.team===s.G.sc),x=clamp(scorer?.x??s.ball.x,60,s.W-60),y=clamp(scorer?.y??s.ball.y,55,s.H-55);scene.goalTargets=s.P.map((p,i)=>{const slot=p.slot??i,a=slot*Math.PI*2/Math.max(3,s.G.cfg.n),v=s.G.goalVariant||0,dx=p===scorer?0:v===0?Math.cos(a)*55:(slot%3-1)*48,dy=p===scorer?0:v===0?Math.sin(a)*55:v===1?48:slot*26-40;return p.team===s.G.sc?{x:clamp(x+dx,25,s.W-25),y:clamp(y+dy,25,s.H-25)}:{x:p.x,y:p.y};});scenes.set(s.G,scene);}
  for(let i=0;i<s.P.length;i++){const p=s.P[i],q=scene.goalTargets[i],dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy),step=Math.min(d,75*dt);if(d){p.x+=dx/d*step;p.y+=dy/d*step;}p.hop=p.team===s.G.sc?Math.abs(Math.sin(s.G.pt*8+i))*10:0;}separate(s.P); }
 function halftime(s,dt){let scene=scenes.get(s.G);if(!scene?.half){const target={...s,G:{...s.G,ko:1},P:s.P.map(p=>({...p}))};kickoff(target);scene={half:{from:s.P.map(p=>({x:p.x,y:p.y})),to:target.P.map(p=>({x:p.x,y:p.y}))}};scenes.set(s.G,scene);}const t=1-clamp(s.G.breakRemaining/6,0,1),q=t<.5?t*2:(t-.5)*2,ease=q*q*q*(q*(q*6-15)+10);for(let i=0;i<s.P.length;i++){const p=s.P[i],tunnel={x:s.W/2+(p.team?25:-25)+(p.slot??0)*16,y:s.H+90},a=t<.5?scene.half.from[i]:tunnel,b=t<.5?tunnel:scene.half.to[i];p.x=mix(a.x,b.x,ease);p.y=mix(a.y,b.y,ease);p.vx=p.vy=0;p.hid=false;}separate(s.P);}
 function reset(s){scenes.delete(s.G);}
 const api={begin,advance,duration,official,celebrate,halftime,reset,separate,route,sampleRoute};if(typeof module!=='undefined')module.exports=api;else root.MaxballCeremony=api;
})(globalThis);
