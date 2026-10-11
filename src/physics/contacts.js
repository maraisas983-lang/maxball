(function(root){
 'use strict';
 const config=(typeof module!=='undefined'?require('../core/config.js'):root.MaxballConfig).physics;
 const rotation=typeof module!=='undefined'?require('./ballRotation.js'):root.MaxballBallRotation;
 function normal(ball,p,out){const dx=ball.x-p.x,dy=ball.y-p.y,d=Math.hypot(dx,dy);out.d=d;if(d>1e-8){out.x=dx/d;out.y=dy/d;}else{const vx=p.vx-ball.vx,vy=p.vy-ball.vy,s=Math.hypot(vx,vy);out.x=s?vx/s:(p.team?-1:1);out.y=s?vy/s:0;}return out;}
 // Shared by local play, authoritative server and fast-ball substeps.
 // Contact impulses never read input, heading, kick state or visual rotation.
 const scratch=[],ordered=[];
 function resolveContacts(players,ball,radius,dt,touch=()=>{},field){
  const distance=config.playerRadius+radius,ib=1/config.ballMass,ip=1/config.playerMass,effective=1/(ib+ip);
  const startX=ball.x,startY=ball.y;let count=0,touched=null,best=Infinity,drive=0;
  ordered.length=0;
  for(const p of players)if(!p.inactive&&(ball.x-p.x)**2+(ball.y-p.y)**2<=(distance+config.contactSlop)**2)ordered.push(p);
  ordered.sort((a,b)=>String(a.id??a.num).localeCompare(String(b.id??b.num)));
  for(const p of ordered){
   const c=normal(ball,p,scratch[count]??={});c.p=p;c.impulse=0;
   const relative=(ball.vx-p.vx)*c.x+(ball.vy-p.vy)*c.y;
   c.target=relative < -config.contactBounceThreshold ? -relative*config.contactRestitution : 0;
   drive=Math.max(drive,Math.max(0,p.vx*c.x+p.vy*c.y));
   if(c.d<best){touched=p;best=c.d;}count++;
  }
  if(!count)return false;
  // Accumulated non-negative constraints: later iterations refine the SAME
  // impulse, rather than applying restitution again. Jacobi relaxation gives
  // simultaneous contacts the same incoming state (including symmetric tackles).
  for(let iteration=0;iteration<config.contactVelocityIterations;iteration++){
   let bx=0,by=0,error=0;
   for(let i=0;i<count;i++){
    const c=scratch[i],p=c.p,relative=(ball.vx-p.vx)*c.x+(ball.vy-p.vy)*c.y;
    const next=Math.max(0,c.impulse+(c.target-relative)*effective/count),delta=next-c.impulse;
    c.impulse=next;c.delta=delta;bx+=delta*c.x;by+=delta*c.y;error=Math.max(error,Math.abs(delta));
   }
   ball.vx+=bx*ib;ball.vy+=by*ib;
   for(let i=0;i<count;i++){const c=scratch[i];c.p.vx-=c.delta*c.x*ip;c.p.vy-=c.delta*c.y*ip;}
   if(error<1e-9)break;
  }
  for(let i=0;i<count;i++)if(scratch[i].impulse>1e-8){ball.impactVersion=(ball.impactVersion||0)+1;break;}
  // Split position correction: inverse-mass weighting, no velocity/energy bias.
  for(let iteration=0;iteration<config.contactIterations;iteration++){
   let active=0,dx=0,dy=0;
   for(let i=0;i<count;i++){const c=normal(ball,scratch[i].p,scratch[i]);c.depth=Math.max(0,distance-c.d);if(c.depth>config.contactSlop)active++;}
   if(!active)break;
   for(let i=0;i<count;i++){
    const c=scratch[i];if(c.depth<=config.contactSlop)continue;
    const correction=c.depth*effective/active;
    dx+=c.x*correction*ib;dy+=c.y*correction*ib;c.p.x-=c.x*correction*ip;c.p.y-=c.y*correction*ip;
   }
   const x=ball.x,y=ball.y;ball.x+=dx;ball.y+=dy;
   if(field){
    ball.y=Math.max(radius,Math.min(field.H-radius,ball.y));
    const mouth=ball.y>field.GY0&&ball.y<field.GY1;
    if(!mouth&&x>=0&&x<=field.W)ball.x=Math.max(radius,Math.min(field.W-radius,ball.x));
    const blockedX=x+dx-ball.x,blockedY=y+dy-ball.y;
    if(blockedX||blockedY)for(let i=0;i<count;i++)if(scratch[i].depth>config.contactSlop){scratch[i].p.x-=blockedX;scratch[i].p.y-=blockedY;}
   }
  }
  // Account for movement-driven sub-tick separation in rolling, but not idle
  // overlap repair. This is visual only and never writes linear velocity.
  const dx=ball.x-startX,dy=ball.y-startY,travel=Math.hypot(dx,dy),rolled=Math.min(travel,drive*dt);
  if(rolled>0)rotation.roll(ball,dx*rolled/travel,dy*rolled/travel,radius);
  touch(touched);return true;
 }
 if(typeof module!=='undefined')module.exports={resolveContacts};else root.MaxballContacts={resolveContacts};
})(globalThis);
