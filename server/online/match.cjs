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
const ceremony=require('../../src/game/ceremony.js');
function seeded(seed){let n=seed>>>0;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296};}
class Match {
 constructor({id,players=[],cfg={},seed=12345,botController=null}){
  this.id=id;this.seed=seed;this.botController=botController;this.cfg={n:2,time:180,gold:0,diff:1,fs:0,ball:1,sk0:0,sk1:1,...cfg};
  this.cfg.intermissionLobby=this.cfg.halftime===true;
  this.cfg.settings=rules.settings(cfg.settings,!!cfg.gold);
  Object.assign(this,dimensions(this.cfg.n,this.cfg.fs));this.BR=require('../../src/core/config.js').physics.ballRadius;
  this.G={cfg:this.cfg,period:'REGULATION',phase:this.cfg.presentation?'starting':'play',startRemaining:this.cfg.presentation?timing.introSeconds:0,score:[0,0],time:this.cfg.time,elapsed:0,pt:0,shake:0,ko:0};
  this.random=seeded(seed);this.events=createEvents();this.log=[];this.inputs=new Map();this.stats={};this.activity=new Map();this.inputAt=new Map();this.P=[];this.retiredPlayers=[];this.substitutionQueue=[];
  for(let team=0;team<2;team++)for(let slot=0;slot<this.cfg.n;slot++){
   const human=players.find(p=>p.team===team&&p.slot===slot);
   const player={id:human?.id||`bot-${team}-${slot}`,name:human?.name||['Caio','Breno','Davi','Rui','Leo','Nico','Vini','João','Ivo','Theo'][team*5+slot],displayName:human?.name||['Caio','Breno','Davi','Rui','Leo','Nico','Vini','João','Ivo','Theo'][team*5+slot],team,position:human?.position||null,kit:human?.kit??null,trail:human?.trail||0,celebration:human?.celebration||0,num:human?.num||7+slot,ctrl:human?'remote':'ai',slot,x:0,y:0,vx:0,vy:0,fx:team?-1:1,fy:0,st:1,cd:0,hop:0};
   const real=this.cfg.teams?.[team]?.squad?.[[4,3,2,1,0][slot]];if(real&&!human){player.name=player.displayName=real.name;player.realPosition=real.role;player.attributes=real.attributes;}
   this.P.push(player);this.stats[player.id]=performanceStats.empty();
  }
  this.offside=new Offside(this);
  this.physics=createPhysics({state:()=>this,externalAI:botController?{command:p=>botController.command(this,p)}:null,input:p=>this.penalties?this.penalties.input(p):this.inputs.get(p.id)||{x:0,y:0},random:this.random,effects:{playerContact:(a,b)=>this.contact(a,b),touch:p=>{this.offside.touch(p);if(!this.penalties)performanceStats.touch(this,p,this.stats);},kick:(p,type)=>{this.G.lastKick={seq:(this.G.lastKick?.seq||0)+1,type};if(this.penalties){this.penalties.kicked(p);return;}performanceStats.kick(this,p,type,this.stats);this.offside.kick(p);}}});
  this.kickoff();if(this.cfg.presentation)ceremony.begin(this);ceremony.official(this,0);this.record('MATCH_STARTED',{});
 }
 record(type,payload){const event={type,time:this.G.elapsed,...payload};this.log.push(event);this.events.emit(type,event);}
 removePlayer(userId){
  const p=this.P.find(p=>p.id===userId);if(!p)return;
  this.retiredPlayers=this.retiredPlayers.filter(q=>q.id!==userId);this.retiredPlayers.push({...p});this.P=this.P.filter(q=>q.id!==userId);this.inputs.delete(userId);this.inputAt.delete(userId);this.activity.delete(userId);this.offside.candidates.clear();this.offside.pending=null;
  this.substitutionQueue=this.substitutionQueue.filter(s=>s.in.id!==userId&&s.out.id!==userId);if(this.G.substitution&&(this.G.substitution.in.id===userId||this.G.substitution.out.id===userId)){this.G.substitution=null;for(const q of this.P)q.hid=!!q.sentOff;}this.G.pendingSubstitutions=this.substitutionQueue.length;this.G.substitutionWaiting=this.substitutionQueue.map(s=>s.out);
  this.botRevision=(this.botRevision||0)+1;this.botController?.invalidate(this);this.record('PLAYER_LEFT',{playerId:userId,team:p.team});
  if(this.G.phase!=='end'&&[0,1].some(team=>!this.P.some(q=>q.team===team&&!q.sentOff))){this.G.winner=this.P.some(q=>q.team===1-p.team&&!q.sentOff)?1-p.team:null;this.finish('TEAM_LEFT');}
  else if(this.G.phase==='penalties'&&this.penalties&&[this.penalties.state.shooter,this.penalties.state.keeper].includes(userId))this.penalties.prepare();
 }
 addPlayer(incoming,team){
  const slot=Array.from({length:this.cfg.n},(_,i)=>i).find(i=>!this.P.some(p=>p.team===team&&p.slot===i));if(slot===undefined||this.P.some(p=>p.id===incoming.id))throw Error('Time cheio.');
  const p={...incoming,team,slot,displayName:incoming.name,ctrl:'remote',x:this.W*(team?.72:.28),y:this.H/2+(slot?80:0),vx:0,vy:0,fx:team?-1:1,fy:0,st:1,cd:0,hop:0};this.P.push(p);this.stats[p.id]??=performanceStats.empty();this.retiredPlayers=this.retiredPlayers.filter(q=>q.id!==p.id);this.botRevision=(this.botRevision||0)+1;this.botController?.invalidate(this);return p;
 }
 kickoff(){this.botRevision=(this.botRevision||0)+1;this.botController?.invalidate(this);ceremony.reset(this);kickoff(this);this.offside.candidates.clear();this.offside.pending=null;}
 pause(userId){if(this.G.pauseState==='PAUSED')return;this.G.pauseState='PAUSED';this.G.pausedBy=userId;this.G.resumeRemaining=0;this.G.official.mode='PAUSED';this.inputs.clear();this.record('REFEREE_PAUSED',{userId});}
 resumeHalf(){if(this.G.phase!=='halftime'||!this.cfg.intermissionLobby)return;this.G.phase='play';this.G.breakRemaining=0;this.G.intermissionEndsAt=null;this.G.ko=1;this.kickoff();this.G.pauseState='PAUSED';this.resume();this.record('SECOND_HALF_STARTED',{score:this.G.score.slice()});}
 resume(){if(this.G.pauseState!=='PAUSED')return;this.G.pauseState='RESUMING';this.G.resumeRemaining=3;this.G.official.mode='RESUMING';this.inputs.clear();this.record('REFEREE_RESUMING',{});}
 substitute(outId,incoming){
  const index=this.P.findIndex(p=>p.id===outId),out=this.P[index];if(!out||out.sentOff||this.P.some(p=>p.id===incoming.id))throw new Error('Substituição inválida.');
  this.retiredPlayers=this.retiredPlayers.filter(p=>p.id!==incoming.id&&p.id!==outId);this.retiredPlayers.push({...out});
  const next={...out,...incoming,team:out.team,slot:out.slot,displayName:incoming.name,ctrl:'remote',attributes:undefined,vx:0,vy:0,cd:0,shootHeld:false,passHeld:false,shootSeq:0,passSeq:0,shootBuffer:0,passBuffer:0};
  this.P[index]=next;this.stats[next.id]??=performanceStats.empty();this.inputs.delete(outId);this.inputs.delete(next.id);this.offside.candidates.clear();this.offside.pending=null;
  if(this.G.phase==='halftime'){next.hid=false;this.botRevision=(this.botRevision||0)+1;this.botController?.invalidate(this);this.record('SUBSTITUTION',{outId,inId:next.id,team:next.team,halftime:true});return next;}
  const animation={out:{id:out.id,name:out.displayName||out.name,team:out.team,num:out.num,kit:out.kit,x:out.x,y:out.y},outPosition:{x:out.x,y:out.y},in:{id:next.id,name:next.name,num:next.num},target:{x:out.x,y:out.y},elapsed:0,duration:3};
  animation.path=ceremony.route({x:this.W/2,y:this.H+55},animation.target,this.P.filter(p=>p!==next&&!p.hid));if(this.G.substitution)this.substitutionQueue.push(animation);else this.G.substitution=animation;this.G.pendingSubstitutions=this.substitutionQueue.length;this.G.substitutionWaiting=this.substitutionQueue.map(sub=>sub.out);this.botRevision=(this.botRevision||0)+1;this.botController?.invalidate(this);next.hid=true;next.x=this.W/2;next.y=this.H+55;this.record('SUBSTITUTION',{outId,inId:next.id,team:next.team});return next;
 }
 setInput(userId,input){
  if(this.G.pauseState||this.G.phase==='end')return;
  const player=this.P.find(p=>p.id===userId);if(!player||player.ctrl==='ai')return;
  if(['starting','halftime'].includes(this.G.phase))return;
  if(this.cfg.career&&(input.requestPass||input.requestShot)&&this.G.elapsed>=(player.requestAt||0)){
   this.G.teamRequests[player.team]={playerId:userId,type:input.requestShot?'SHOOT':'PASS',until:this.G.elapsed+4};player.requestAt=this.G.elapsed+1;
  }
  this.inputs.set(userId,input);this.inputAt.set(userId,this.G.elapsed);this.stats[userId].inputs++;
 }
 goal(team){
  if(this.G.phase!=='play')return;
  const scorer=this.P.find(p=>p.id===this.ball.lastPlayer),previous=this.ball.previousTouch;
  let assist=null;
  if(scorer?.team===team){this.stats[scorer.id].goals++;if(previous?.id&&previous.id!==scorer.id&&previous.team===team&&this.G.elapsed-previous.time<8){assist=previous.id;this.stats[assist].assists++;}}
  this.G.celebration=scorer?.celebration||0;this.G.score[team]++;this.G.phase='goal';this.G.pt=0;this.G.sc=team;this.G.ko=1-team;this.G.scorerId=scorer?.id||null;this.G.scorerName=scorer?.displayName||scorer?.name||'Gol da equipe';this.G.assistId=assist;this.G.assistName=[...this.P,...this.retiredPlayers].find(p=>p.id===assist)?.displayName||[...this.P,...this.retiredPlayers].find(p=>p.id===assist)?.name||null;this.G.ownGoal=!!scorer&&scorer.team!==team;this.G.goalVariant=((this.G.cinematicVariant||0)+this.G.score.reduce((a,b)=>a+b,0))%3;
  for(const p of this.P)if(p.team!==team&&field.inArea(p,p.team,this))this.stats[p.id].goalsConceded++;
  if(scorer&&scorer.team!==team)this.stats[scorer.id].errors++;
  this.record('GOAL_SCORED',{team,scorer:scorer?.id||null,scorerName:this.G.scorerName,assist,assistName:this.G.assistName,ownGoal:!!scorer&&scorer.team!==team});
 }
 finish(reason='TIME'){
  if(this.G.phase==='end')return;
  this.substitutionQueue=[];this.G.substitution=null;this.G.substitutionWaiting=[];this.G.pendingSubstitutions=0;for(const p of this.P)p.hid=false;this.G.phase='end';this.G.period='FINISHED';this.G.reason=reason;this.G.pauseState=null;ceremony.official(this,0);if(this.G.winner===undefined)this.G.winner=this.G.score[0]===this.G.score[1]?null:this.G.score[0]>this.G.score[1]?0:1;
  this.performance=performanceStats.finalize([...this.retiredPlayers,...this.P],this.stats,this.G.winner);
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
  if(this.G.phase==='halftime'&&this.cfg.intermissionLobby){this.G.breakRemaining=Math.max(0,this.G.breakRemaining-dt);if(this.G.breakRemaining<=1e-6)this.resumeHalf();return;}
  if(this.G.substitution){const sub=this.G.substitution;if(sub.elapsed===0)sub.path=ceremony.route({x:this.W/2,y:this.H+55},sub.target,[...this.P.filter(p=>p.id!==sub.in.id&&!p.hid),...this.G.substitutionWaiting||[]]);sub.elapsed=Math.min(sub.duration,sub.elapsed+dt);if(sub.duration-sub.elapsed<1e-6)sub.elapsed=sub.duration;const p=this.P.find(p=>p.id===sub.in.id),t=Math.max(0,(sub.elapsed/sub.duration-.5)*2),e=t*t*t*(t*(t*6-15)+10);p.hid=t===0;const position=ceremony.sampleRoute(sub.path,e);p.x=position.x;p.y=position.y;if(t===0){const u=Math.min(1,sub.elapsed/sub.duration*2),q=u*u*u*(u*(u*6-15)+10),ghost={...ceremony.sampleRoute(sub.path,1-q),hid:false};ceremony.separate([...this.P,ghost]);sub.outPosition={x:ghost.x,y:ghost.y};}else{ceremony.separate(this.P);sub.outPosition=null;}if(t>=1){this.G.substitution=this.substitutionQueue.shift()||null;this.G.pendingSubstitutions=this.substitutionQueue.length;this.G.substitutionWaiting=this.substitutionQueue.map(waiting=>waiting.out);}return;}
  if(this.G.pauseState){if(this.G.pauseState==='RESUMING'){this.G.resumeRemaining=Math.max(0,this.G.resumeRemaining-dt);if(this.G.resumeRemaining<1e-6){this.G.resumeRemaining=0;this.G.pauseState=null;this.inputs.clear();for(const p of this.P){p.shootBuffer=p.passBuffer=0;p.shootHeld=p.passHeld=false;}this.record('REFEREE_RESUMED',{});}}return;}
  ceremony.official(this,dt);
  if(this.G.phase==='starting'){
   if(ceremony.advance(this,dt)){this.G.phase='play';this.inputs.clear();this.kickoff();}return;
  }
  if(this.G.phase==='penalties'){this.G.elapsed+=dt;this.penalties.update(dt);return;}
  if(this.G.phase==='halftime'){if(this.cfg.intermissionLobby)return;this.G.breakRemaining-=dt;ceremony.halftime(this,dt);if(this.G.breakRemaining<=1e-6){this.G.phase='play';this.G.ko=1;this.kickoff();}return;}
  this.G.pt+=dt;
  if(this.G.phase==='goal'){ceremony.celebrate(this,dt);moveBall(this,dt*.4);if(this.G.pt>=timing.goalPauseSeconds){if(this.cfg.goldenSecondHalf&&this.G.halfPlayed){this.G.winner=this.G.sc;this.finish('GOLDEN_GOAL');return;}if(this.cfg.goalLimit&&Math.max(...this.G.score)>=this.cfg.goalLimit){this.finish('GOAL_LIMIT');return;}if(this.G.time<=0)this.nextPeriod();else{this.G.phase='play';this.kickoff();}}return;}
  for(const p of this.P){const input=this.inputs.get(p.id);if(p.ctrl==='remote'&&this.G.elapsed-(this.inputAt.get(p.id)??-10)<1.5&&!p.hid&&!p.inactive&&input&&(Math.abs(input.x||0)+Math.abs(input.y||0)>.1||input.shoot||input.pass))this.activity.set(p.id,(this.activity.get(p.id)||0)+dt);}
  this.G.elapsed+=dt;this.physics.step(dt);if(this.applyFoul())return;if(!this.offside.apply())moveBall(this,dt,team=>this.goal(team));
  if(this.G.ot)this.G.otT=(this.G.otT||0)+dt;
  this.G.time=Math.max(0,this.G.time-dt);
  if(this.cfg.halftime&&!this.G.halfPlayed&&!this.G.ot&&this.G.time<=this.cfg.time/2&&this.G.phase==='play'){this.G.halfPlayed=true;this.G.sidesSwapped=!this.G.sidesSwapped;this.G.phase='halftime';this.G.breakRemaining=this.cfg.intermissionLobby?300:6;this.G.pauseState=null;if(this.cfg.intermissionLobby)this.G.time=this.cfg.time/2;this.inputs.clear();this.record('HALFTIME',{});}
  if(this.G.time===0&&this.G.phase==='play')this.nextPeriod();
 }
 snapshot(){return {matchId:this.id,cfg:this.cfg,G:{...this.G,cfg:undefined},P:this.P.map(p=>({...p})),ball:{...this.ball},W:this.W,H:this.H,GY0:this.GY0,GY1:this.GY1,BR:this.BR};}
}
module.exports={Match,seeded};
