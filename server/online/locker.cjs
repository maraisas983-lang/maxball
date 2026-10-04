const speed=require('../../src/core/config.js').physics.playerMaxSpeed;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
class Locker{
 constructor(){this.players=new Map();}
 enter(member,team){let p=this.players.get(member.id);if(!p){p={id:member.id,name:member.name,num:member.num,team:member.team??team,x:450+(this.players.size%5-2)*45,y:420,vx:0,vy:0,at:0};this.players.set(p.id,p);}return p;}
 input(uid,x,y){const p=this.players.get(uid);if(!p)return;const n=Math.max(1,Math.hypot(x,y));p.vx=x/n*speed;p.vy=y/n*speed;p.at=Date.now();}
 update(dt){for(const p of this.players.values()){if(Date.now()-p.at>300)p.vx=p.vy=0;const ox=p.x,oy=p.y;p.x=clamp(p.x+p.vx*dt,30,870);p.y=clamp(p.y+p.vy*dt,75,480);for(const y of [165,345])if(p.x>82&&p.x<818&&p.y>y-32&&p.y<y+32){p.x=ox;p.y=oy;}}}
 snapshot(){return {type:'locker',players:[...this.players.values()].map(({id,name,num,team,x,y})=>({id,name,num,team,x,y}))};}
 leave(uid){this.players.delete(uid);}
}
module.exports={Locker};
