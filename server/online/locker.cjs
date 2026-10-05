const speed=require('../../src/core/config.js').physics.playerMaxSpeed;
const movement=require('../../src/game/lockerMovement.js');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
class Locker{
 constructor(){this.players=new Map();}
 enter(member,team){let p=this.players.get(member.id);if(!p){team=member.team??team;p={id:member.id,name:member.name,num:member.num,team,...movement.spawn([...this.players.values()],team),vx:0,vy:0,at:0};this.players.set(p.id,p);}return p;}
 input(uid,x,y){const p=this.players.get(uid);if(!p)return;const n=Math.max(1,Math.hypot(x,y));p.vx=x/n*speed;p.vy=y/n*speed;p.at=Date.now();}
 update(dt){const now=Date.now(),players=[...this.players.values()];for(const p of players){if(now-p.at>300)p.vx=p.vy=0;movement.move(p,p.vx,p.vy,dt,Math.hypot(p.vx,p.vy));}movement.separate(players);}
 snapshot(){return {type:'locker',players:[...this.players.values()].map(({id,name,num,team,x,y})=>({id,name,num,team,x,y}))};}
 leave(uid){this.players.delete(uid);}
}
module.exports={Locker};
