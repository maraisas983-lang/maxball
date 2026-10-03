const rules=require('../../src/game/rules.js');
const timing=require('../../src/core/config.js').match;
const {Penalties}=require('./penalties.cjs');
const {Offside}=require('./offside.cjs');
const {kickoff}=require('../../src/game/kickoff.js');
const {createPhysics}=require('../../src/physics/playerPhysics.js');
const {moveBall}=require('../../src/physics/ballPhysics.js');
const {createEvents}=require('../../src/core/runtime.js');
const field=require('../../src/game/field.js');
const performanceStats=require('../../src/game/performance.js');
const {dimensions}=require('../../src/game/fieldConfig.js');
function seeded(seed){let n=seed>>>0;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296};}
class Match {
 constructor({id,players=[],cfg={},seed=12345}){
  this.id=id;this.cfg={n:2,time:180,gold:0,diff:1,fs:0,ball:1,sk0:0,sk1:1,...cfg};
  this.cfg.settings=rules.settings(cfg.settings,!!cfg.gold);
  Object.assign(this,dimensions(this.cfg.n,this.cfg.fs));this.BR=11;
  this.G={cfg:this.cfg,period:'REGULATION',phase:this.cfg.presentation?'starting':'play',startRemaining:this.cfg.presentation?timing.introSeconds:0,score:[0,0],time:this.cfg.time,elapsed:0,pt:0,shake:0,ko:0};
  this.random=seeded(seed);this.events=createEvents();this.log=[];this.inputs=new Map();this.stats={};this.P=[];
  for(let team=0;team<2;team++)for(let slot=0;slot<this.cfg.n;slot++){
   const human=players.find(p=>p.team===team&&p.slot===slot);
   const player={id:human?.id||`bot-${team}-${slot}`,name:human?.name||['Caio','Breno','Davi','Rui','Leo','Nico','Vini','João','Ivo','Theo'][team*5+slot],displayName:human?.name||['Caio','Breno','Davi','Rui','Leo','Nico','Vini','João','Ivo','Theo'][team*5+slot],team,num:human?.num||7+slot,ctrl:human?'remote':'ai',slot,x:0,y:0,vx:0,vy:0,fx:team?-1:1,fy:0,st:1,cd:0,hop:0};
   this.P.push(player);this.stats[player.id]=performanceStats.empty();
  }
  this.offside=new Offside(this);
  this.physics=createPhysics({state:()=>this,input:p=>this.penalties?this.penalties.input(p):this.inputs.get(p.id)||{x:0,y:0},random:this.random,effects:{playerContact:(a,b)=>this.contact(a,b),touch:p=>{this.offside.touch(p);if(!this.penalties)performanceStats.touch(this,p,this.stats);},kick:(p,type)=>{if(this.penalties){this.penalties.kicked(p);return;}performanceStats.kick(this,p,type,this.stats);this.offside.kick(p);}}});
  this.kickoff();if(this.cfg.presentation){this.introPositions=this.P.map(p=>({x:p.x,y:p.y}));this.P.forEach((p,i)=>{p.x=this.W/2+(i%5-2)*45;p.y=this.H+60;});}this.record('MATCH_STARTED',{});
 }
 record(type,payload){const event={type,time:this.G.elapsed,...payload};this.log.push(event);this.events.emit(type,event);}
 kickoff(){kickoff(this);this.offside.candidates.clear();this.offside.pending=null;}
 setInput(userId,input){
  const player=this.P.find(p=>p.id===userId);if(!player||player.ctrl==='ai')return;
  if(['starting','halftime'].includes(this.G.phase))return;
  if(this.cfg.career&&(input.requestPass||input.requestShot)&&this.G.elapsed>=(player.requestAt||0)){
   this.G.teamRequests[player.team]={playerId:userId,type:input.requestShot?'SHOOT':'PASS',until:this.G.elapsed+4};player.requestAt=this.G.elapsed+1;
  }
  this.inputs.set(userId,input);this.stats[userId].inputs++;
 }
 goal(team){
  if(this.G.phase!=='play')return;
  const scorer=this.P.find(p=>p.id===this.ball.lastPlayer),previous=this.ball.previousTouch;
  let assist=null;
  if(scorer?.team===team){this.stats[scorer.id].goals++;if(previous?.id&&previous.id!==scorer.id&&previous.team===team&&this.G.elapsed-previous.time<8){assist=previous.id;this.stats[assist].assists++;}}
  this.G.score[team]++;this.G.phase='goal';this.G.pt=0;this.G.sc=team;this.G.ko=1-team;
  for(const p of this.P)if(p.team!==team&&field.inArea(p,p.team,this))this.stats[p.id].goalsConceded++;
  if(scorer&&scorer.team!==team)this.stats[scorer.id].errors++;
  this.record('GOAL_SCORED',{team,scorer:scorer?.id||null,assist,ownGoal:!!scorer&&scorer.team!==team});
 }
 finish(reason='TIME'){
  if(this.G.phase==='end')return;
  this.G.phase='end';this.G.period='FINISHED';this.G.reason=reason;if(this.G.winner===undefined)this.G.winner=this.G.score[0]===this.G.score[1]?null:this.G.score[0]>this.G.score[1]?0:1;
  this.performance=performanceStats.finalize(this.P,this.stats,this.G.winner);
  this.record('MATCH_ENDED',{score:this.G.score.slice(),reason});
 }
 moveBall(dt,onGoal){moveBall(this,dt,onGoal);}
 contact(){ /* Contacts use physical resolution, never an automatic penalty. */ }
 applyFoul(){this.pendingFoul=null;return false;}
 nextPeriod(){
  const next=rules.nextPeriod(this.cfg.settings,this.G.period,this.G.score[0]===this.G.score[1]);
  if(next==='FINISHED'){this.finish();return;}
  this.G.period=next;this.inputs.clear();
  if(next==='EXTRA_TIME'){this.G.ot=true;this.G.otT=0;this.G.time=timing.extraTimeSeconds;this.G.phase='play';this.kickoff();this.record('EXTRA_TIME',{});}
  else{this.G.phase='penalties';this.penalties=new Penalties(this);this.record('PENALTY_SHOOTOUT',{});}
 }
 update(dt){
  if(this.G.phase==='end')return;
  if(this.G.phase==='starting'){
   this.G.startRemaining=Math.max(0,this.G.startRemaining-dt);const elapsed=timing.introSeconds-this.G.startRemaining;
   this.G.startStage=elapsed<.7?'PREPARE':elapsed<2.2?'LINEUP':elapsed<3?'ENTRY':'COUNTDOWN';
   const progress=Math.max(0,Math.min(1,(elapsed-2.2)/.8));this.P.forEach((p,i)=>{const target=this.introPositions[i];p.x=this.W/2+(i%5-2)*45+(target.x-this.W/2-(i%5-2)*45)*progress;p.y=this.H+60+(target.y-this.H-60)*progress;});
   if(this.G.startRemaining===0){this.G.phase='play';this.inputs.clear();this.kickoff();}return;
  }
  if(this.G.phase==='penalties'){this.G.elapsed+=dt;this.penalties.update(dt);return;}
  if(this.G.phase==='halftime'){this.G.breakRemaining-=dt;if(this.G.breakRemaining<=0){this.G.phase='play';this.G.ko=1;this.kickoff();}return;}
  this.G.pt+=dt;
  if(this.G.phase==='goal'){moveBall(this,dt*.4);if(this.G.pt>=2.6){if(this.cfg.goalLimit&&Math.max(...this.G.score)>=this.cfg.goalLimit){this.finish('GOAL_LIMIT');return;}if(this.G.time<=0)this.nextPeriod();else{this.G.phase='play';this.kickoff();}}return;}
  this.G.elapsed+=dt;this.physics.step(dt);if(this.applyFoul())return;if(!this.offside.apply())moveBall(this,dt,team=>this.goal(team));
  if(this.G.ot)this.G.otT=(this.G.otT||0)+dt;
  this.G.time=Math.max(0,this.G.time-dt);
  if(this.cfg.halftime&&!this.G.halfPlayed&&!this.G.ot&&this.G.time<=this.cfg.time/2&&this.G.phase==='play'){this.G.halfPlayed=true;this.G.phase='halftime';this.G.breakRemaining=5;this.inputs.clear();this.record('HALFTIME',{});}
  if(this.G.time===0&&this.G.phase==='play')this.nextPeriod();
 }
 snapshot(){return {matchId:this.id,cfg:this.cfg,G:{...this.G,cfg:undefined},P:this.P.map(p=>({...p})),ball:{...this.ball},W:this.W,H:this.H,GY0:this.GY0,GY1:this.GY1,BR:this.BR};}
}
module.exports={Match,seeded};
