(function(root){
'use strict';
function createPhysics({state,input,effects={},random=Math.random}){
 let G,P,ball,W,H,GY0,GY1,BR,brain,brainGame;
 const PR=20;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const burst=effects.burst||(()=>{}),beep=effects.beep||(()=>{});
 const PA={push:value=>effects.particle?.(value)};
 const c0='#c8ff2e',c1='#ff2d87';
 const inputOf=p=>p.ctrl==='ai'?ai(p):input(p);
 function sync(){({G,P,ball,W,H,GY0,GY1,BR}=state());if(G!==brainGame){brain=new tactics.Tactics(state,random);brainGame=G;}}
 function touch(p){
   const id=p.id??P.indexOf(p);
   if(ball.lastPlayer!==id){ball.previousTouch={id:ball.lastPlayer,team:ball.last,time:ball.touchTime};ball.lastPlayer=id;ball.touchTime=G.elapsed||G.el||0;}
   ball.last=p.team;
 }
function ai(p){return brain.command(p)}
function kick(p,type,aim){if(G.kl>0||G.restarting&&p.team!==G.ko)return;G.restarting=false;G.kl=.1;let pw=type=='s'?420:260,dx,dy;
 const bx=ball.x-p.x,by=ball.y-p.y,bl=Math.hypot(bx,by),nx=bl>.01?bx/bl:p.fx,ny=bl>.01?by/bl:p.fy;
 if(type=='p'&&!aim){if(p.tr>0)return;const rvn=(ball.vx-p.vx)*nx+(ball.vy-p.vy)*ny;if(rvn<-110){G.kl=0;ball.vx=p.vx*.5;ball.vy=p.vy*.5;touch(p);p.cd=0;p.tr=.4;p.dbl=0;burst(ball.x,ball.y,8,['#fff','#22d6ff'],120,.3);PA.push({t:'r',x:ball.x,y:ball.y,s:10,l:.25,m:.25,c:'#22d6ff',vx:0,vy:0,g:0});beep(300,.06,'sine',.05);return}}
 if(aim){let n=Math.hypot(aim.x,aim.y)||1;dx=aim.x/n;dy=aim.y/n;if(type=='p')pw=Math.min(360,120+n*.9);
  const dd=dx*nx+dy*ny,w=clamp((dd+.1)/.5,0,1);dx=nx*(1-w)+dx*w;dy=ny*(1-w)+dy*w;n=Math.hypot(dx,dy)||1;dx/=n;dy/=n;pw*=.6+.4*clamp((dd+.3)/1.3,0,1)}
 else{dx=nx;dy=ny;if(type=='p'){let bs=.9,b=null;P.forEach(q=>{if(q.team!=p.team||q===p)return;const mx=q.x-ball.x,my=q.y-ball.y,ml=Math.hypot(mx,my)||1,c=(mx*nx+my*ny)/ml;if(c>bs){bs=c;b=[mx/ml,my/ml,ml]}});
  if(b){dx=b[0];dy=b[1];pw=Math.min(360,120+b[2]*.9)}}}
 pw+=Math.max(0,p.vx*dx+p.vy*dy)*.35;const dbl=type=='s'&&p.dbl>0;if(dbl){pw*=1.3;p.dbl=0}ball.vx=dx*pw;ball.vy=dy*pw;touch(p);p.cd=.3;if(type=='p')p.dbl=.5;
 effects.kick?.(p,type);const col=p.team?c1:c0;
 if(dbl){burst(ball.x,ball.y,14,['#ffd84a','#fff'],280,.4);PA.push({t:'t',x:ball.x,y:ball.y-18,vx:0,vy:-50,g:0,l:.9,m:.9,c:'#ffd84a',s:18,txt:'DUPLO!'});G.shake=Math.max(G.shake,4)}
 if(type=='s'){burst(ball.x,ball.y,10,[col,'#fff'],220,.35);G.shake=Math.max(G.shake,3);beep(180,.15,'sawtooth',.08,60)}else{burst(ball.x,ball.y,6,['#fff'],180,.25);beep(420,.08,'triangle',.06)}
 PA.push({t:'r',x:ball.x,y:ball.y,s:8,l:.3,m:.3,c:col,vx:0,vy:0,g:0})}
function step(dt){G.kl=(G.kl||0)-dt;
 if(G.restarting){G.restartTime+=dt;if(G.restartTime>8)G.restarting=false;}
 brain.update(dt);
 ((G.ord=!G.ord)?P:P.slice().reverse()).forEach(p=>{const i=G.restarting&&p.team!==G.ko?{x:0,y:0}:inputOf(p);let l=Math.hypot(i.x,i.y);if(l>1){i.x/=l;i.y/=l;l=1}
  const run=false,sp=p.ctrl=='ai'?([175,195,215][G.cfg.diff])*(i.boost?1.1:1):205;
  p.st=run?Math.max(0,p.st-dt*.45):Math.min(1,p.st+dt*.2);
  const k=1-Math.exp(-12*dt);p.vx+=(i.x*sp-p.vx)*k;p.vy+=(i.y*sp-p.vy)*k;
  if(l>.2){p.fx=i.x/l;p.fy=i.y/l;const n=Math.hypot(p.fx,p.fy)||1;p.fx/=n;p.fy/=n}
  const ux=p.x+p.vx*dt,uy=p.y+p.vy*dt;let nx=clamp(ux,PR-config.playerOutsideMargin,W+config.playerOutsideMargin-PR),ny=clamp(uy,PR-config.playerOutsideMargin,H+config.playerOutsideMargin-PR);if(nx!=ux)p.vx=0;if(ny!=uy)p.vy=0;
  p.x=nx;p.y=ny;p.cd-=dt;p.dbl=(p.dbl||0)-dt;p.tr=(p.tr||0)-dt;
  if(run&&random()<.5)PA.push({t:'c',x:p.x-p.fx*14,y:p.y-p.fy*14,vx:0,vy:0,g:0,l:.25,m:.25,c:'#ffffff88',s:4,r:0});
  if(p.cd<=0&&(i.shoot||i.pass)&&dist(p,ball)<PR+BR+12)kick(p,i.shoot?'s':'p',i.aim)});
 for(let a=0;a<P.length;a++)for(let b=a+1;b<P.length;b++){const A=P[a],B=P[b],d=dist(A,B);if(d<PR*2){const o=(PR*2-d)/2,nx=d?(B.x-A.x)/d:1,ny=d?(B.y-A.y)/d:0;A.x-=nx*o;A.y-=ny*o;B.x+=nx*o;B.y+=ny*o}}
 contacts.resolveContacts(P,ball,BR,dt,touch);if(G.restarting&&Math.hypot(ball.x-W/2,ball.y-H/2)>BR)G.restarting=false;}


 return {ai(p){sync();return ai(p)},kick(...args){sync();return kick(...args)},step(dt){sync();step(dt);for(const p of P){p.x=clamp(p.x,PR-config.playerOutsideMargin,W+config.playerOutsideMargin-PR);p.y=clamp(p.y,PR-config.playerOutsideMargin,H+config.playerOutsideMargin-PR);for(const x of [0,W])for(const y of [GY0,GY1])ballPhysics.collideCircle(p,x,y,PR+6,0);}}};
}
const ballPhysics=typeof module!=='undefined'?require('./ballPhysics.js'):root.MaxballBall;
const config=(typeof module!=='undefined'?require('../core/config.js'):root.MaxballConfig).physics;
const tactics=typeof module!=='undefined'?require('../ai/tactics.js'):root.MaxballAI;
const contacts=typeof module!=='undefined'?require('./contacts.js'):root.MaxballContacts;
const api={createPhysics};if(typeof module!=='undefined')module.exports=api;else root.MaxballPhysics=Object.freeze(api);
})(globalThis);
