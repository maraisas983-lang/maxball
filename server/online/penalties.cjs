const {shootoutWinner}=require('../../src/game/rules.js');
const timing=require('../../src/core/config.js').match;
const {radius:interactionRadius}=require('../../src/physics/interaction.js');
class Penalties {
 constructor(match,{team=0,onComplete=null}={}){this.match=match;this.onComplete=onComplete;this.state={score:[0,0],taken:[0,0],history:[[],[]],turn:team,attempt:0,result:null,time:0,kicked:false,single:!!onComplete};match.G.penalties=this.state;this.prepare();}
 prepare(){
  const m=this.match,s=this.state,attack=m.P.filter(p=>p.team===s.turn&&!p.sentOff),defense=m.P.filter(p=>p.team!==s.turn&&!p.sentOff);
  const shooter=attack[s.taken[s.turn]%attack.length],keeper=defense.find(p=>p.ctrl!=='ai')||defense.at(-1);
  s.shooter=shooter.id;s.keeper=keeper.id;s.time=0;s.kicked=false;s.result=null;s.attempt++;
  m.ball={x:m.W-190,y:m.H/2,vx:0,vy:0,rot:0,last:-1};m.G.restarting=false;m.G.kl=0;
  for(const p of m.P){p.inactive=p.sentOff||p!==shooter&&p!==keeper;p.hid=!!p.sentOff;p.vx=p.vy=0;p.cd=0;p.shootBuffer=p.passBuffer=0;if(p.inactive){p.x=m.W/2;p.y=60+p.slot*50+p.team*220;}}
  shooter.x=m.ball.x-(interactionRadius(m)-.75);shooter.y=m.ball.y;shooter.fx=1;shooter.fy=0;
  keeper.x=m.W-24;keeper.y=m.H/2;keeper.fx=-1;keeper.fy=0;
  this.aimY=m.GY0+18+m.random()*(m.GY1-m.GY0-36);this.reaction=.35+m.random()*.3;this.shootAt=.7+m.random()*.7;
  // Place an automatic taker behind its intended contact angle during setup.
  // The kick itself obeys the same ball-player normal as every human action.
  if(shooter.ctrl==='ai'){const dx=m.W-m.ball.x,dy=this.aimY-m.ball.y,n=Math.hypot(dx,dy),r=interactionRadius(m)-.75;shooter.x=m.ball.x-dx/n*r;shooter.y=m.ball.y-dy/n*r;}
  this.keeperGuess=m.H/2+(m.random()<.5?-1:1)*(m.GY1-m.GY0)*.25;
  m.record('PENALTY_READY',{turn:s.turn,shooter:s.shooter,keeper:s.keeper});
 }
 input(p){
  const m=this.match,s=this.state;if(p.inactive||s.result!==null)return {x:0,y:0};
  if(p.id===s.shooter){if(s.kicked)return {x:0,y:0};if(p.ctrl!=='ai')return m.inputs.get(p.id)||{x:0,y:0};return {x:0,y:0,shoot:s.time>=this.shootAt,aim:{x:m.W-m.ball.x,y:this.aimY-m.ball.y}};}
  if(p.ctrl!=='ai'){const input=m.inputs.get(p.id)||{};return {x:0,y:input.y||0};}
  const target=s.kicked&&s.time-s.flightAt>this.reaction?m.ball.y:this.keeperGuess;return {x:0,y:Math.max(-1,Math.min(1,(target-p.y)/40))};
 }
 kicked(p){if(p.id===this.state.shooter&&!this.state.kicked){this.state.kicked=true;this.state.flightAt=this.state.time;}}
 goal(team){if(this.state.kicked&&team===0)this.resolve(true);}
 resolve(scored){
  const m=this.match,s=this.state;if(s.result!==null)return;s.result=scored?'GOAL':'MISS';s.history[s.turn].push(!!scored);s.taken[s.turn]++;if(scored)s.score[s.turn]++;s.pause=timing.penaltyPauseSeconds;
  m.record('PENALTY_TAKEN',{team:s.turn,shooter:s.shooter,scored,score:s.score.slice(),taken:s.taken.slice()});
 }
 update(dt){
  const m=this.match,s=this.state;
  if(s.result!==null){s.pause-=dt;if(s.pause>0)return;if(this.onComplete){this.onComplete(s.result==='GOAL',s.shooter);return;}const winner=shootoutWinner(s.score,s.taken);if(winner!==null){m.G.winner=winner;m.finish('PENALTIES');return;}s.turn=1-s.turn;this.prepare();return;}
  s.time+=dt;m.physics.step(dt);
  const keeper=m.P.find(p=>p.id===s.keeper);keeper.x=m.W-24;keeper.y=Math.max(m.GY0+20,Math.min(m.GY1-20,keeper.y));
  m.moveBall(dt,team=>this.goal(team));
  if(s.time>=timing.penaltySeconds||s.kicked&&(s.time-s.flightAt>timing.penaltyFlightSeconds||m.ball.vx<0||Math.hypot(m.ball.vx,m.ball.vy)<20))this.resolve(false);
 }
}
module.exports={Penalties};
