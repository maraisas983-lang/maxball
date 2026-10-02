(function(root){
 'use strict';
 const config=(typeof module!=='undefined'?require('../core/config.js'):root.MaxballConfig).physics;
 function normal(ball,p){
  const dx=ball.x-p.x,dy=ball.y-p.y,d=Math.hypot(dx,dy);
  if(d>1e-8)return {x:dx/d,y:dy/d,d};
  const vx=p.vx-ball.vx,vy=p.vy-ball.vy,s=Math.hypot(vx,vy);
  return {x:s?vx/s:(p.team?-1:1),y:s?vy/s:0,d:0};
 }
 function resolveContacts(players,ball,radius,dt,touch=()=>{}){
  const distance=config.playerRadius+radius;
  const contacts=players.map(p=>({p,n:normal(ball,p)})).filter(c=>c.n.d<distance-.001);
  if(!contacts.length)return;
  // Compute from one velocity snapshot; competing contacts never see a full
  // impulse already applied by the preceding player in the array.
  let impulseX=0,impulseY=0;
  for(const {p,n} of contacts){
   const relative=(ball.vx-p.vx)*n.x+(ball.vy-p.vy)*n.y;
   if(relative<0&&!(ball.kickedBy===p.id&&ball.contactProtection>0)){const restitution=config.contactRestitution;
    let impulse=-(1+restitution)*relative/(1+config.ballMass/config.playerMass);
    const normalSpeed=ball.vx*n.x+ball.vy*n.y;
    if(normalSpeed>=0)impulse=Math.min(impulse,Math.max(0,config.contactMaxPushSpeed-normalSpeed));
    impulseX+=impulse*n.x;impulseY+=impulse*n.y;
    p.vx-=impulse*config.ballMass/config.playerMass*n.x/contacts.length;p.vy-=impulse*config.ballMass/config.playerMass*n.y/contacts.length;
   }
   const damping=Math.pow(.975,dt*60);p.vx*=damping;p.vy*=damping;
  }
  ball.vx+=impulseX/contacts.length;ball.vy+=impulseY/contacts.length;
  // Balanced pressure cannot eject the ball to one side. Move the bodies
  // apart instead of repeatedly teleporting the ball between penetrations.
  for(let iteration=0;iteration<config.contactIterations;iteration++){
   const active=players.map(p=>({p,n:normal(ball,p)})).filter(c=>c.n.d<distance-.001);
   if(!active.length)break;
   const nx=active.reduce((s,c)=>s+c.n.x,0),ny=active.reduce((s,c)=>s+c.n.y,0),balanced=active.length>1&&Math.hypot(nx,ny)<.8;
   let dx=0,dy=0;
   for(const {p,n} of active){const depth=distance-n.d,share=balanced?0:active.length===1?1:.6;
    dx+=n.x*depth*share;dy+=n.y*depth*share;
    p.x-=n.x*depth*(1-share);p.y-=n.y*depth*(1-share);
   }
   ball.x+=dx/active.length;ball.y+=dy/active.length;
  }
  const speed=Math.hypot(ball.vx,ball.vy);if(speed>config.ballMaxSpeed){ball.vx*=config.ballMaxSpeed/speed;ball.vy*=config.ballMaxSpeed/speed;}
  const touched=contacts.slice().sort((a,b)=>a.n.d-b.n.d||String(a.p.id??a.p.num).localeCompare(String(b.p.id??b.p.num)))[0];
  if(!(ball.kickedBy===touched.p.id&&ball.contactProtection>0))touch(touched.p);
 }
 if(typeof module!=='undefined')module.exports={resolveContacts};else root.MaxballContacts={resolveContacts};
})(globalThis);
