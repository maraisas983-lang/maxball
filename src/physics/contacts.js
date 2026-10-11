(function(root){
 'use strict';
 const config=(typeof module!=='undefined'?require('../core/config.js'):root.MaxballConfig).physics;
 const rotation=typeof module!=='undefined'?require('./ballRotation.js'):root.MaxballBallRotation;
 function normal(ball,p,out){const dx=ball.x-p.x,dy=ball.y-p.y,d=Math.hypot(dx,dy);out.d=d;if(d>1e-8){out.x=dx/d;out.y=dy/d;}else{const vx=p.vx-ball.vx,vy=p.vy-ball.vy,s=Math.hypot(vx,vy);out.x=s?vx/s:(p.team?-1:1);out.y=s?vy/s:0;}return out;}
 // Reuse scratch memory; the synchronous solver never allocates per iteration.
 const scratch=[];
 function resolveContacts(players,ball,radius,dt,touch=()=>{},field){
  const startX=ball.x,startY=ball.y,distance=config.playerRadius+radius,incomingSpeed=Math.hypot(ball.vx,ball.vy);let count=0,impulseX=0,impulseY=0,touched=null,best=Infinity,driveBudget=0;
  for(let i=0;i<players.length;i++){
   const p=players[i];if(p.inactive||(ball.x-p.x)**2+(ball.y-p.y)**2>=distance*distance)continue;const n=normal(ball,p,scratch[i]??={x:0,y:0,d:0});if(n.d>=distance-.001)continue;count++;
   if(n.d<best||n.d===best&&String(p.id??p.num)<String(touched?.id??touched?.num)){touched=p;best=n.d;}
   driveBudget=Math.max(driveBudget,Math.min(config.contactMaxPushSpeed,Math.max(0,p.vx*n.x+p.vy*n.y)));
   const relative=(ball.vx-p.vx)*n.x+(ball.vy-p.vy)*n.y;
   if(relative<0){
    // Players follow control input as kinematic bodies: bounce once at contact,
    // rather than retain velocity into an immovable body for repeated corrections.
    let impulse=-(1+config.contactRestitution)*relative,normalSpeed=ball.vx*n.x+ball.vy*n.y;
    if(normalSpeed>=0){
     const drive=p.vx*n.x+p.vy*n.y,transfer=1-Math.exp(-config.contactResponse*dt*config.playerMass/(config.playerMass+config.ballMass));
     impulse=Math.min(impulse,Math.max(0,Math.min(drive,config.contactMaxPushSpeed)-normalSpeed))*transfer;
    }else{
     const motion=p.vx*n.x+p.vy*n.y,drive=Math.max(0,Math.min(motion,config.contactMaxPushSpeed)),transfer=1-Math.exp(-config.contactResponse*dt*config.playerMass/(config.playerMass+config.ballMass));
     impulse=-(1+config.contactRestitution)*(normalSpeed-Math.min(0,motion))+drive*transfer;
    }
    impulseX+=impulse*n.x;impulseY+=impulse*n.y;
   }
  }
  if(!count)return;
  // One shared incoming velocity makes simultaneous contact independent of order.
  ball.vx+=impulseX/count;ball.vy+=impulseY/count;
  for(let iteration=0;iteration<config.contactIterations;iteration++){
   let active=0,nx=0,ny=0;
   for(let i=0;i<players.length;i++){if(players[i].inactive)continue;const p=players[i],n=scratch[i]??={x:0,y:0,d:0};if((ball.x-p.x)**2+(ball.y-p.y)**2>=distance*distance){n.d=Infinity;continue;}normal(ball,p,n);if(n.d<distance-.001){active++;nx+=n.x;ny+=n.y;}}
   if(!active)break;
   const balanced=active>1&&Math.hypot(nx,ny)<.8;let dx=0,dy=0;
   for(let i=0;i<players.length;i++){
    const p=players[i],n=scratch[i];if(p.inactive||n.d>=distance-.001)continue;
    const depth=distance-n.d,share=balanced?0:active===1?(p.vx*n.x+p.vy*n.y>0?config.playerMass/(config.playerMass+config.ballMass):1):.6;
    dx+=n.x*depth*share;dy+=n.y*depth*share;p.x-=n.x*depth*(1-share);p.y-=n.y*depth*(1-share);
   }
   const x=ball.x,y=ball.y;ball.x+=dx/active;ball.y+=dy/active;
   if(field){
    ball.y=Math.max(radius,Math.min(field.H-radius,ball.y));
    const mouth=ball.y>field.GY0&&ball.y<field.GY1;
    if(!mouth&&x>=0&&x<=field.W)ball.x=Math.max(radius,Math.min(field.W-radius,ball.x));
    // Transfer correction blocked by a wall to the contacting bodies.
    const blockedX=x+dx/active-ball.x,blockedY=y+dy/active-ball.y;
    if(blockedX||blockedY)for(let i=0;i<players.length;i++)if(!players[i].inactive&&scratch[i].d<distance-.001){players[i].x-=blockedX;players[i].y-=blockedY;}
   }
  }
  // Contacts may reflect an incoming shot or transfer player motion, but repeated
  // normals in a tackle must not compound into energy beyond either source.
  const speed=Math.hypot(ball.vx,ball.vy),limit=Math.min(config.ballMaxSpeed,Math.max(incomingSpeed,driveBudget));if(speed>limit){ball.vx*=limit/speed;ball.vy*=limit/speed;}
  // Continuous player-driven displacement is real rolling too. Idle overlap
  // repair and substep depenetration (dt=0) must not generate artificial spin.
  const dx=ball.x-startX,dy=ball.y-startY,travel=Math.hypot(dx,dy),driven=Math.min(travel,driveBudget*dt);
  if(driven>0)rotation.roll(ball,dx*driven/travel,dy*driven/travel,radius);
  touch(touched);
  return true;
 }
 if(typeof module!=='undefined')module.exports={resolveContacts};else root.MaxballContacts={resolveContacts};
})(globalThis);
