(function(root){
 'use strict';
 const {collideCircle}=typeof module!=='undefined'?require('./ballPhysics.js'):root.MaxballBall;
 function resolve(p,previous,s,r=20){
  if(Math.min(p.x,previous.x)>r+6&&Math.max(p.x,previous.x)<s.W-r-6)return;
  const target={x:p.x,y:p.y},dx=target.x-previous.x,dy=target.y-previous.y,steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/(r*.4)));
  p.x=previous.x;p.y=previous.y;
  for(let step=0;step<steps;step++){
   p.x+=dx/steps;p.y+=dy/steps;
   for(const side of [0,1]){
    const front=side?s.W:0,back=side?s.W+46:-46;
    for(const y of [s.GY0,s.GY1]){collideCircle(p,front,y,r+6,0);const x=Math.max(Math.min(front,back),Math.min(Math.max(front,back),p.x));collideCircle(p,x,y,r+3,0);}
    const y=Math.max(s.GY0,Math.min(s.GY1,p.y));collideCircle(p,back,y,r+3,0);
   }
  }
 }
 const api={resolve};if(typeof module!=='undefined')module.exports=api;else root.MaxballGoalColliders=api;
})(globalThis);
