const {kickoff}=require('../../src/game/kickoff.js');
const {createPhysics}=require('../../src/physics/playerPhysics.js');
const {moveBall}=require('../../src/physics/ballPhysics.js');
const {createEvents}=require('../../src/core/runtime.js');
const FMT={1:[760,440,100],2:[1000,560,140],3:[1240,680,170],4:[1480,800,200]};
function seeded(seed){let n=seed>>>0;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296};}
class Match {
 constructor({id,players=[],cfg={},seed=12345}){
  this.id=id;this.cfg={n:2,time:180,gold:0,diff:1,fs:0,ball:1,sk0:0,sk1:1,...cfg};
  const [w,h,g]=FMT[this.cfg.n],scale=[1,1.3,1.6][this.cfg.fs],height=g*(1+(scale-1)*.6);
  this.W=Math.round(w*scale);this.H=Math.round(h*scale);this.GY0=this.H/2-height/2;this.GY1=this.H/2+height/2;this.BR=[9,11,14][this.cfg.ball];
  this.G={cfg:this.cfg,phase:'play',score:[0,0],time:this.cfg.time,elapsed:0,pt:0,shake:0,ko:0};
  this.random=seeded(seed);this.events=createEvents();this.log=[];this.inputs=new Map();this.stats={};this.P=[];
  for(let team=0;team<2;team++)for(let slot=0;slot<this.cfg.n;slot++){
   const human=players.find(p=>p.team===team&&p.slot===slot);
   const player={id:human?.id||`bot-${team}-${slot}`,name:human?.name||['Caio','Breno','Davi','Rui','Leo','Nico','Vini','João'][team*4+slot],displayName:human?.name||['Caio','Breno','Davi','Rui','Leo','Nico','Vini','João'][team*4+slot],team,num:human?.num||7+slot,ctrl:human?'remote':'ai',slot,x:0,y:0,vx:0,vy:0,fx:team?-1:1,fy:0,st:1,cd:0,hop:0};
   this.P.push(player);this.stats[player.id]={goals:0,assists:0,shots:0,passes:0,inputs:0};
  }
  this.physics=createPhysics({state:()=>this,input:p=>this.inputs.get(p.id)||{x:0,y:0},random:this.random,effects:{kick:(p,type)=>this.stats[p.id][type==='s'?'shots':'passes']++}});
  this.kickoff();this.record('MATCH_STARTED',{});
 }
 record(type,payload){const event={type,time:this.G.elapsed,...payload};this.log.push(event);this.events.emit(type,event);}
 kickoff(){kickoff(this);}
 setInput(userId,input){
  const player=this.P.find(p=>p.id===userId);if(!player||player.ctrl==='ai')return;
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
  this.record('GOAL_SCORED',{team,scorer:scorer?.id||null,assist,ownGoal:!!scorer&&scorer.team!==team});
 }
 finish(reason='TIME'){
  if(this.G.phase==='end')return;
  this.G.phase='end';this.G.reason=reason;
  this.record('MATCH_ENDED',{score:this.G.score.slice(),reason});
 }
 update(dt){
  if(this.G.phase==='end')return;
  this.G.pt+=dt;
  if(this.G.phase==='goal'){
   moveBall(this,dt*.4);
   if(this.G.pt>=2.6){if(this.G.ot||this.G.time<=0)this.finish();else{this.G.phase='play';this.kickoff();}}
   return;
  }
  this.G.elapsed+=dt;this.physics.step(dt);moveBall(this,dt,team=>this.goal(team));
  if(this.G.ot){this.G.otT=(this.G.otT||0)+dt;if(this.G.otT>120){this.G.score[this.random()<.5?0:1]++;this.record('PENALTY_DECIDER',{score:this.G.score.slice()});this.finish('PENALTIES');}}
  else{
   this.G.time=Math.max(0,this.G.time-dt);
   if(this.G.time===0&&this.G.phase==='play'){
    if(this.cfg.gold&&this.G.score[0]===this.G.score[1]){this.G.ot=true;this.G.otT=0;this.record('EXTRA_TIME',{});}
    else this.finish();
   }
  }
 }
 snapshot(){return {matchId:this.id,cfg:this.cfg,G:{...this.G,cfg:undefined},P:this.P.map(p=>({...p})),ball:{...this.ball},W:this.W,H:this.H,GY0:this.GY0,GY1:this.GY1,BR:this.BR};}
}
module.exports={Match,seeded};
