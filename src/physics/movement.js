(function(root){
 const config=typeof module!=='undefined'?require('../core/config.js').physics:root.MaxballConfig.physics;
 function integrate(p,input,dt,speed=config.playerMaxSpeed){
  const norm=Math.max(1,Math.hypot(input.x,input.y)),x=input.x/norm,y=input.y/norm,length=Math.hypot(x,y);
  const turning=p.vx*x+p.vy*y<0,response=length<.01?config.playerDeceleration:turning?config.playerTurnResponse:config.playerAcceleration,k=1-Math.exp(-response*dt);
  p.vx+=(x*speed-p.vx)*k;p.vy+=(y*speed-p.vy)*k;if(length>.08){p.fx=x/length;p.fy=y/length;}p.x+=p.vx*dt;p.y+=p.vy*dt;return p;
 }
 const api={integrate};if(typeof module!=='undefined')module.exports=api;else root.MaxballMovement=api;
})(globalThis);
