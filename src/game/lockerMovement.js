(function(root){
 'use strict';
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function blocked(x,y){return x>82&&x<818&&[165,345].some(bench=>Math.abs(y-bench)<32);}
 function move(p,x,y,dt,speed){const n=Math.max(1,Math.hypot(x,y)),nx=clamp(p.x+x/n*speed*dt,30,870),ny=clamp(p.y+y/n*speed*dt,75,480);if(!blocked(nx,p.y))p.x=nx;if(!blocked(p.x,ny))p.y=ny;}
 function separate(players){for(let iteration=0;iteration<4;iteration++)for(let a=0;a<players.length;a++)for(let b=a+1;b<players.length;b++){const p=players[a],q=players[b];if(p.team!==q.team)continue;const dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy);if(d>=36)continue;const nx=d?dx/d:1,ny=d?dy/d:0,amount=(36-d)/2;for(const [v,sign] of [[p,-1],[q,1]]){const x=clamp(v.x+nx*amount*sign,30,870),y=clamp(v.y+ny*amount*sign,75,480);if(!blocked(x,y)){v.x=x;v.y=y;}}}}
 function spawn(players,team){for(const y of [420,245,470,95])for(let x=360;x<=840;x+=48)if(!players.some(p=>p.team===team&&Math.hypot(p.x-x,p.y-y)<38))return {x,y};return {x:48,y:245};}
 const api={move,separate,spawn};if(typeof module!=='undefined')module.exports=api;else root.MaxballLockerMovement=api;
})(globalThis);
