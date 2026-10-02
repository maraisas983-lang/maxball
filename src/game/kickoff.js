(function(root){
 'use strict';
 const field=typeof module!=='undefined'?require('./field.js'):root.MaxballField;
 function kickoff(s){
  const {G,P,W,H,BR}=s;G.restartSpot=null;G.ko??=0;G.restarting=true;G.restartTime=0;G.kl=0;G.teamRequests={};
  s.ball={x:W/2,y:H/2,vx:0,vy:0,rot:0,last:-1};
  for(const team of [0,1])P.filter(p=>p.team===team).forEach((p,index)=>{
   const dir=team?-1:1,home=team?W:0,n=G.cfg.n;
   let depth=index<2?W*.36:W*.20,y=n>=3?H/2+(index%2?1:-1)*100:H/2+(index?100:0);
   if(index===0){depth=team===G.ko?W/2-20-BR-3:W*.34;y=H/2;}
   if(team!==G.ko&&Math.hypot(depth-W/2,y-H/2)<field.geometry(s).centerRadius+25)depth=W/2-field.geometry(s).centerRadius-25;
   p.x=home+dir*depth;p.y=y;p.vx=p.vy=0;p.fx=dir;p.fy=0;p.cd=p.tr=p.dbl=p.hop=0;
  });
  return s.ball;
 }
 if(typeof module!=='undefined')module.exports={kickoff};else root.MaxballKickoff={kickoff};
})(globalThis);
