(function(root){
'use strict';
function createPhysics({state,input,effects={},random=Math.random}){
 let G,P,ball,W,H,GY0,GY1,BR;
 const PR=20;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const burst=effects.burst||(()=>{}),beep=effects.beep||(()=>{});
 const PA={push:value=>effects.particle?.(value)};
 const c0='#c8ff2e',c1='#ff2d87';
 const inputOf=p=>p.ctrl==='ai'?ai(p):input(p);
 function sync(){({G,P,ball,W,H,GY0,GY1,BR}=state());}
 function touch(p){
   const id=p.id??P.indexOf(p);
   if(ball.lastPlayer!==id){ball.previousTouch={id:ball.lastPlayer,team:ball.last,time:ball.touchTime};ball.lastPlayer=id;ball.touchTime=G.elapsed||G.el||0;}
   ball.last=p.team;
 }
function ai(p){const t=p.team,gx=t?0:W,ogx=t?W:0,ad=t?-1:1,df=G.cfg.diff,i={x:0,y:0,shoot:0,pass:0,press:0},
 m=P.filter(q=>q.team==t),en=P.filter(q=>q.team!=t),bp={x:ball.x+ball.vx*.22,y:ball.y+ball.vy*.22},
 cost=q=>dist(q,bp)+(q.role=='def'&&Math.abs(ball.x-ogx)>W*.4?110:0),ch=m.reduce((a,b)=>cost(a)<=cost(b)?a:b),
 ne=en.reduce((a,b)=>dist(a,ball)<=dist(b,ball)?a:b,en[0]),enHas=!!ne&&dist(ne,ball)<PR+BR+16,dB=dist(p,ball)||1;let tx,ty;
 const lane=(a,b)=>!en.some(q=>{const sx=b.x-a.x,sy=b.y-a.y,tt=clamp(((q.x-a.x)*sx+(q.y-a.y)*sy)/(sx*sx+sy*sy||1),0,1);return Math.hypot(q.x-a.x-sx*tt,q.y-a.y-sy*tt)<PR+BR+6});
 if(p===ch){
  if(dB<PR+BR+16&&!enHas){
   const kp=en.reduce((a,b)=>Math.abs(a.x-gx)<=Math.abs(b.x-gx)?a:b,en[0]),cy=kp&&kp.y>H/2?GY0+24:GY1-24,tg={x:gx,y:cy},
   av={x:gx-ball.x,y:cy-ball.y},al=Math.hypot(av.x,av.y)||1,nx=(ball.x-p.x)/dB,ny=(ball.y-p.y)/dB,dg=Math.abs(gx-p.x);
   if(p.cd<=0&&(nx*av.x+ny*av.y)/al>.62&&dg<[260,330,380][df]&&(lane(ball,tg)||dg<200)){const j=[.22,.1,.03][df]*(random()-.5)*2,c=Math.cos(j),sn=Math.sin(j);i.shoot=1;i.aim={x:av.x*c-av.y*sn,y:av.x*sn+av.y*c}}
   else if(p.cd<=0&&en.some(q=>dist(q,p)<80)){const mt=m.filter(q=>q!==p&&(q.x-p.x)*ad>50&&lane(ball,q)).sort((a,b)=>b.x*ad-a.x*ad)[0];
    if(mt){const mx=mt.x-ball.x,my=mt.y-ball.y,ml=Math.hypot(mx,my)||1;if((nx*mx+ny*my)/ml>.72){i.pass=1;i.aim={x:mx,y:my}}}}
   let sx=gx-p.x,sy=(dg<450?cy:H/2)-p.y;const s0=Math.hypot(sx,sy)||1;sx/=s0;sy/=s0;
   en.forEach(q=>{const ex=p.x-q.x,ey=p.y-q.y,ed=Math.hypot(ex,ey)||1;if(ed<130){const f=(130-ed)/130*1.6;sx+=ex/ed*f;sy+=ey/ed*f;if(ex*ad<0){const sd=Math.abs(ey)<10?(cy>p.y?1:-1):(ey>0?1:-1);sy+=sd*f*2.6;sx+=ad*f*.4}}});
   const sl=Math.hypot(sx,sy)||1;tx=p.x+sx/sl*100;ty=p.y+sy/sl*100}
  else if(enHas){i.boost=1;if(p.cd<=0&&dB<PR+BR+16){i.pass=1;i.aim={x:gx-ball.x,y:H/2-ball.y}}const uo=Math.hypot(ogx-ball.x,H/2-ball.y)||1;if(dB>100){tx=ball.x+(ogx-ball.x)/uo*40;ty=ball.y+(H/2-ball.y)/uo*40}else{tx=ball.x;ty=ball.y}}
  else{const ax=gx-bp.x,ay=H/2-bp.y,al=Math.hypot(ax,ay)||1,dot=((p.x-bp.x)*ax+(p.y-bp.y)*ay)/al;
   if(dot>-8){const sg=(p.y<H/2?1:-1)*(ax>=0?1:-1),nr=dist(p,bp)<90?36:0;tx=bp.x-ax/al*28-ay/al*sg*nr;ty=bp.y-ay/al*28+ax/al*sg*nr}else{tx=bp.x+ax/al*36;ty=bp.y+ay/al*36}}}
 else if(p.role=='def'){
  if(true){const bd=Math.abs(ball.x-ogx),f=bd<350?.3:.45,mn=bd<350?70:110;tx=ball.x+(ogx-ball.x)*f;ty=ball.y+(H/2-ball.y)*f;if(Math.abs(tx-ogx)<mn)tx=ogx+ad*mn;if(bd<350)ty=clamp(ty,GY0-20,GY1+20)}
  else{tx=ogx+ad*clamp(Math.abs(ball.x-ogx)*.4,90,330);ty=H/2+(ball.y-H/2)*.45}}
 else{const has=m.some(q=>dist(q,ball)<PR+BR+16)&&!enHas;
  if(has){tx=clamp(ball.x+ad*160,W*.12,W*.88);ty=ball.y<H/2?H*.72:H*.28}else if(enHas){tx=ne.x+(ogx-ne.x)*.35;ty=ne.y+(H/2-ne.y)*.35}else{tx=ball.x-ad*130;ty=H/2+(ball.y-H/2)*.6}}
 tx=clamp(tx,-30,W+30);ty=clamp(ty,-30,H+30);
 const dx=tx-p.x,dy=ty-p.y,l=Math.hypot(dx,dy);if(l>8){const k=Math.min(1,l/50);i.x=dx/l*k;i.y=dy/l*k}return i}
function kick(p,type,aim){if(G.kl>0)return;G.kl=.1;let pw=type=='s'?420:260,dx,dy;
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
 ((G.ord=!G.ord)?P:P.slice().reverse()).forEach(p=>{const i=inputOf(p);let l=Math.hypot(i.x,i.y);if(l>1){i.x/=l;i.y/=l;l=1}
  const run=false,sp=p.ctrl=='ai'?([175,195,215][G.cfg.diff])*(i.boost?1.1:1):205;
  p.st=run?Math.max(0,p.st-dt*.45):Math.min(1,p.st+dt*.2);
  const k=1-Math.exp(-12*dt);p.vx+=(i.x*sp-p.vx)*k;p.vy+=(i.y*sp-p.vy)*k;
  if(l>.2){p.fx=i.x/l;p.fy=i.y/l;const n=Math.hypot(p.fx,p.fy)||1;p.fx/=n;p.fy/=n}
  const ux=p.x+p.vx*dt,uy=p.y+p.vy*dt;let nx=clamp(ux,PR*.6,W-PR*.6),ny=clamp(uy,PR*.6,H-PR*.6);if(nx!=ux)p.vx=0;if(ny!=uy)p.vy=0;
  p.x=nx;p.y=ny;p.cd-=dt;p.dbl=(p.dbl||0)-dt;p.tr=(p.tr||0)-dt;
  if(run&&random()<.5)PA.push({t:'c',x:p.x-p.fx*14,y:p.y-p.fy*14,vx:0,vy:0,g:0,l:.25,m:.25,c:'#ffffff88',s:4,r:0});
  if(p.cd<=0&&(i.shoot||i.pass)&&dist(p,ball)<PR+BR+12)kick(p,i.shoot?'s':'p',i.aim)});
 for(let a=0;a<P.length;a++)for(let b=a+1;b<P.length;b++){const A=P[a],B=P[b],d=dist(A,B);if(d<PR*2){const o=(PR*2-d)/2,nx=d?(B.x-A.x)/d:1,ny=d?(B.y-A.y)/d:0;A.x-=nx*o;A.y-=ny*o;B.x+=nx*o;B.y+=ny*o}}
 G.fl=!G.fl;(G.fl?P:P.slice().reverse()).forEach(p=>{const dx=ball.x-p.x,dy=ball.y-p.y,d=Math.hypot(dx,dy),m=PR+BR;if(d<m){const nx=d?dx/d:1,ny=d?dy/d:0;ball.x=p.x+nx*m;ball.y=p.y+ny*m;
  const rv=(ball.vx-p.vx)*nx+(ball.vy-p.vy)*ny;if(rv<0){const e=clamp((-rv-120)/400,0,.8),j=-(1+e)*rv*.8;ball.vx+=j*nx;ball.vy+=j*ny;p.vx-=j*.4*nx;p.vy-=j*.4*ny}p.vx*=Math.pow(.975,dt*60);p.vy*=Math.pow(.975,dt*60)
  touch(p)}})}

 return {ai(p){sync();return ai(p)},kick(...args){sync();return kick(...args)},step(dt){sync();step(dt);for(const p of P){p.x=clamp(p.x,PR*.6,W-PR*.6);p.y=clamp(p.y,PR*.6,H-PR*.6);for(const x of [0,W])for(const y of [GY0,GY1])ballPhysics.collideCircle(p,x,y,PR+6,0);}}};
}
const ballPhysics=typeof module!=='undefined'?require('./ballPhysics.js'):root.MaxballBall;
const api={createPhysics};if(typeof module!=='undefined')module.exports=api;else root.MaxballPhysics=Object.freeze(api);
})(globalThis);
