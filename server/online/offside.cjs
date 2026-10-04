const {side}=require('../../src/game/field.js');
class Offside {
 constructor(match){this.match=match;this.candidates=new Set();this.team=null;this.pending=null;}
 kick(p){
  const m=this.match;this.candidates.clear();this.team=p.team;if(!m.cfg.settings.offside||m.G.phase!=='play')return;
  const forward=x=>side(m,p.team)?m.W-x:x,opponents=m.P.filter(q=>q.team!==p.team).map(q=>forward(q.x)).sort((a,b)=>b-a),line=opponents[Math.min(1,opponents.length-1)]??m.W;
  for(const ally of m.P)if(ally.team===p.team&&ally!==p&&forward(ally.x)>m.W/2&&forward(ally.x)>forward(m.ball.x)+1&&forward(ally.x)>line+1)this.candidates.add(ally.id);
 }
 touch(p){if(!this.match.cfg.settings.offside||!this.candidates.size)return;if(p.team!==this.team){this.candidates.clear();return;}if(this.candidates.has(p.id))this.pending={player:p.id,team:1-p.team,x:p.x,y:p.y};}
 apply(){
  const foul=this.pending;if(!foul)return false;this.pending=null;this.candidates.clear();const m=this.match;
  const x=Math.max(60,Math.min(m.W-60,foul.x)),y=Math.max(45,Math.min(m.H-45,foul.y)),dir=side(m,foul.team)?-1:1;
  m.ball={x,y,vx:0,vy:0,rot:0,last:-1};m.G.ko=foul.team;m.G.restarting=true;m.G.restartTime=0;m.G.kl=.5;
  const taker=m.P.filter(p=>p.team===foul.team).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];
  for(const p of m.P){if(Math.hypot(p.x-x,p.y-y)<100){const a=Math.atan2(p.y-y,p.x-x);p.x=x+Math.cos(a)*105;p.y=y+Math.sin(a)*105;}p.vx=p.vy=0;}
  taker.x=x-dir*(20+m.BR+3);taker.y=y;m.G.restartSpot={x,y};m.G.notice={text:'IMPEDIMENTO',until:m.G.elapsed+2};m.record('OFFSIDE',foul);return true;
 }
}
module.exports={Offside};
