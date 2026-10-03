(function(root){
 'use strict';
 const config=(typeof module!=='undefined'?require('../core/config.js'):root.MaxballConfig).physics;
 function normal(ball,p,out){const dx=ball.x-p.x,dy=ball.y-p.y,d=Math.hypot(dx,dy);out.d=d;if(d>1e-8){out.x=dx/d;out.y=dy/d;}else{const vx=p.vx-ball.vx,vy=p.vy-ball.vy,s=Math.hypot(vx,vy);out.x=s?vx/s:(p.team?-1:1);out.y=s?vy/s:0;}return out;}
 // Reuse scratch memory; the synchronous solver never allocates per iteration.
 const scratch=[];
 function resolveContacts(players,ball,radius,dt,touch=()=>{},field){
  const distance=config.playerRadius+radius;let count=0,impulseX=0,impulseY=0,touched=null,best=Infinity;
  for(let i=0;i<players.length;i++){
   const p=players[i];if(p.inactive||(ball.x-p.x)**2+(ball.y-p.y)**2>=distance*distance)continue;const n=normal(ball,p,scratch[i]??={x:0,y:0,d:0});if(n.d>=distance-.001)continue;count++;
   if(n.d<best||n.d===best&&String(p.id??p.num)<String(touched?.id??touched?.num)){touched=p;best=n.d;}
   const relative=(ball.vx-p.vx)*n.x+(ball.vy-p.vy)*n.y;
   if(relative<0&&!(ball.kickedBy===p.id&&ball.contactProtection>0)){
    // Players follow control input as kinematic bodies: bounce once at contact,
    // rather than retain velocity into an immovable body for repeated corrections.
    let impulse=-(1+config.contactRestitution)*relative,normalSpeed=ball.vx*n.x+ball.vy*n.y;
    if(normalSpeed>=0)impulse=Math.min(impulse,Math.max(0,config.contactMaxPushSpeed-normalSpeed));
    impulseX+=impulse*n.x;impulseY+=impulse*n.y;
   }
  }
  if(!count)return;
  // One shared incoming velocity makes simultaneous contact independent of order.
  ball.vx+=impulseX/count;ball.vy+=impulseY/count;
  for(let iteration=0;iteration<config.contactIterations;iteration++){
   let active=0,nx=0,ny=0;
   for(let i=0;i<players.length;i++){if(players[i].inactive)continue;const n=normal(ball,players[i],scratch[i]??={x:0,y:0,d:0});if(n.d<distance-.001){active++;nx+=n.x;ny+=n.y;}}
   if(!active)break;
   const balanced=active>1&&Math.hypot(nx,ny)<.8;let dx=0,dy=0;
   for(let i=0;i<players.length;i++){
    const p=players[i],n=scratch[i];if(p.inactive||n.d>=distance-.001)continue;
    const depth=distance-n.d,share=balanced?0:active===1?1:.6;
    dx+=n.x*depth*share;dy+=n.y*depth*share;p.x-=n.x*depth*(1-share);p.y-=n.y*depth*(1-share);
   }
   const x=ball.x,y=ball.y;ball.x+=dx/active;ball.y+=dy/active;
   if(field){
    ball.y=Math.max(radius,Math.min(field.H-radius,ball.y));
    const mouth=ball.y>field.GY0+config.postRadius+radius&&ball.y<field.GY1-config.postRadius-radius;
    if(!mouth)ball.x=Math.max(radius,Math.min(field.W-radius,ball.x));
    // Transfer correction blocked by a wall to the contacting bodies.
    const blockedX=x+dx/active-ball.x,blockedY=y+dy/active-ball.y;
    if(blockedX||blockedY)for(let i=0;i<players.length;i++)if(!players[i].inactive&&scratch[i].d<distance-.001){players[i].x-=blockedX;players[i].y-=blockedY;}
   }
  }
  const speed=Math.hypot(ball.vx,ball.vy);if(speed>config.ballMaxSpeed){ball.vx*=config.ballMaxSpeed/speed;ball.vy*=config.ballMaxSpeed/speed;}
  if(!(ball.kickedBy===touched.id&&ball.contactProtection>0))touch(touched);
  return true;
 }
 if(typeof module!=='undefined')module.exports={resolveContacts};else root.MaxballContacts={resolveContacts};
})(globalThis);
