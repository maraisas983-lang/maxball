(function(root){
 'use strict';
 const field=typeof module!=='undefined'?require('../game/field.js'):root.MaxballField;
 const ballPhysics=typeof module!=='undefined'?require('../physics/ballPhysics.js'):root.MaxballBall;
 const interaction=typeof module!=='undefined'?require('../physics/interaction.js'):root.MaxballInteraction;
 const GAME_CONFIG=typeof module!=='undefined'?require('../core/config.js'):root.MaxballConfig,CONFIG=GAME_CONFIG.ai,PHYSICS=GAME_CONFIG.physics,rollingResistance=-Math.log(PHYSICS.ballFriction);
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const ROLES=['ATACANTE_CENTRAL','APOIO_DIREITO','MEIA_ESQUERDO','VOLANTE_CENTRAL','GOLEIRO'];
 class Tactics {
  constructor(state,random=Math.random){this.state=state;this.random=random;this.time=0;this.next=0;this.teams=[{},{}];this.commands=new Map();this.predictions=[{},{},{},{},{}];this.motion=new Map();this.dribbles=new Map();this.support=new Map();this.costs=new Map();}
  update(dt){this.time+=dt;if(this.time+1e-8<this.next)return;this.next=this.time+[.2,.13,.085][this.state().G.cfg.diff??1];const at=root.MaxballPerf?performance.now():0;this.decide();if(root.MaxballPerf)root.MaxballPerf.meter.add('ai',performance.now()-at);}
  command(p){return this.commands.get(p)||{x:0,y:0};}
  decide(){
   const s=this.state(),{P,ball,W,H,GY0,GY1,BR,G}=s;
   if(!P?.length)return;
   const moving=Math.hypot(ball.vx,ball.vy)>80,horizons=[.16,.34,.6,.9,1.25],forecast=moving?this.predictions.map((out,i)=>ballPhysics.predictTrajectory(s,horizons[i],out,false)):null,predicted=forecast?.[1]||ball,region=field.geometry(s),difficulty=clamp(G.cfg.diff??1,0,2);
   const live=new Set(P.map(p=>p.id));for(const cache of [this.motion,this.dribbles,this.support])for(const id of cache.keys())if(!live.has(id))cache.delete(id);
   for(const team of [0,1]){
    const players=P.filter(p=>!p.inactive&&p.team===team),opponents=P.filter(p=>!p.inactive&&p.team!==team);if(!players.length)continue;
    const side=field.side(s,team),tactical=this.teams[team],direction=side?-1:1,home=side?W:0,goal=side?0:W;
    const forward=x=>(x-home)*direction;
    const inArea=p=>field.inArea(p,team,s);
    players.forEach((p,index)=>{p.id??=`local-${team}-${index}`;p.role=players.length>=4?ROLES[index]:players.length===3?(index===2?'VOLANTE_CENTRAL':ROLES[index]):index?'VOLANTE_CENTRAL':'ATACANTE_CENTRAL';});
    const closest=players.reduce((a,b)=>distance(a,ball)<distance(b,ball)?a:b),enemy=opponents.reduce((a,b)=>!a||distance(b,ball)<distance(a,ball)?b:a,null);
    const owned=interaction.contains(closest,ball,s),opponentOwns=enemy&&interaction.contains(enemy,ball,s),humanCarrier=players.find(p=>p.ctrl!=='ai'&&distance(p,ball)<110&&p.vx*direction>8);
    if(G.restarting||opponentOwns||tactical.combination?.until<this.time)tactical.combination=null;
    if(tactical.pendingPass){const pass=tactical.pendingPass;if(this.time>pass.until||opponentOwns)tactical.pendingPass=null;else if(ball.lastPlayer===pass.from&&ball.lastAction==='p'&&(ball.kickAt??0)>pass.previousKick){tactical.combination={...pass,kickAt:ball.kickAt,until:this.time+4};tactical.pendingPass=null;}}
    let combination=tactical.combination;
    if(combination&&ball.kickedBy===combination.to&&ball.lastAction==='p'&&ball.kickAt>combination.kickAt)combination=tactical.combination=null;
    const phase=owned&&!opponentOwns?'ATTACKING':opponentOwns?'DEFENDING':forward(ball.x)<W*.4?'TRANSITION_DEFENSE':'TRANSITION_ATTACK';
    tactical.state=phase;
    const occupants=players.filter(inArea),areaOwners=occupants.slice().sort((a,b)=>Number(b.ctrl!=='ai')-Number(a.ctrl!=='ai')||forward(a.x)-forward(b.x)).slice(0,2).map(p=>p.id);
    const humanInArea=occupants.find(p=>p.ctrl!=='ai');
    if(humanInArea)tactical.areaOwner=humanInArea.id;
    else if(!occupants.some(p=>p.id===tactical.areaOwner))tactical.areaOwner=occupants.sort((a,b)=>forward(a.x)-forward(b.x))[0]?.id||null;
    tactical.areaOwners=areaOwners;
    this.costs.clear();const cost=p=>{if(this.costs.has(p))return this.costs.get(p);const speed=PHYSICS.botMaxSpeeds[difficulty]*clamp((p.attributes?.speed??70)/70,.8,1.2),catchAt=forecast?.findIndex((point,i)=>distance(p,point)<=speed*horizons[i]+interaction.radius(s));const interception=catchAt>=0?horizons[catchAt]*speed+distance(p,forecast[catchAt])*.15:distance(p,predicted)+(moving?180:0);const value=interception+(p.role==='GOLEIRO'&&forward(ball.x)>region.areaDepth+90?W*.65:0)+((p.role.startsWith('VOLANTE')||p.role==='GOLEIRO')&&forward(ball.x)>W*.55&&distance(p,ball)>65?100:0)+(areaOwners.length>=2&&!areaOwners.includes(p.id)&&inArea(ball)?180:0);this.costs.set(p,value);return value;};
    const receiver=combination&&ball.last===team&&!owned?players.find(p=>p.id===combination.to):null;
    const candidate=receiver||(owned&&!opponentOwns?closest:players.reduce((a,b)=>cost(a)<=cost(b)?a:b)),previous=players.find(p=>p.id===tactical.chaser);
    if(!previous||receiver&&candidate!==previous||owned&&!opponentOwns&&candidate!==previous||(this.time>=(tactical.changeAt||0)&&cost(candidate)+CONFIG.switchAdvantage<cost(previous))){tactical.chaser=candidate.id;tactical.changeAt=this.time+CONFIG.switchChaserCooldown;}
    if(!tactical.areaOwner&&inArea(ball))tactical.areaOwner=tactical.chaser;
    const chaser=players.find(p=>p.id===tactical.chaser),ballOffset=clamp((forward(ball.x)/W-.5)*W*.24,-W*.16,W*.16),reserved=[],marked=new Set(),threats=opponents.filter(q=>q!==enemy).sort((a,b)=>forward(a.x)-forward(b.x));
    for(let index=0;index<players.length;index++){
     const p=players[index],keeper=p.role==='GOLEIRO',defender=p.role.startsWith('VOLANTE')||keeper,left=p.role.includes('ESQUERDO'),right=p.role.includes('DIREITO');
     const lane=left?-1:right?1:0;
     let depth=keeper?55:W*([.57,.46,.35,.22][index]??.3)+ballOffset;
     if(G.score[team]<G.score[1-team]&&G.time<45&&!keeper)depth+=W*.07;
     if(defender&&chaser?.role.startsWith('VOLANTE')&&chaser!==p)depth-=CONFIG.defensiveSupportDistance*.45;
     const formation={x:home+direction*clamp(depth,80,W-100),y:clamp(H/2+lane*Math.min(CONFIG.formationWidth,H*.4)/2+(ball.y-H/2)*.18,55,H-55)};
     let target={...formation},state=defender?'COVERING':'SUPPORTING';
     if(defender&&(phase==='DEFENDING'||phase==='TRANSITION_DEFENSE')){target.x=home+direction*Math.max(region.areaDepth+35,Math.min(forward(formation.x),forward(ball.x)*.6));target.y=clamp(H/2+lane*CONFIG.formationWidth*.4+(ball.y-H/2)*.35,45,H-45);}
     if(!keeper&&(owned&&!opponentOwns||humanCarrier)&&p!==chaser){const anchor=humanCarrier||closest;target.x=home+direction*clamp(forward(anchor.x)+(defender?-140:CONFIG.attackSupportDistance-index*22),region.areaDepth+20,W-65);target.y=clamp(anchor.y+lane*Math.min(H*.3,CONFIG.formationWidth*.65)+(lane===0?(index%2?95:-95):0),50,H-50);target=this.supportTarget(s,p,target,opponents,direction,defender);state=defender?'COVERING':'ATTACK_SUPPORT';}
     const command={x:0,y:0,shoot:false,pass:false};
     const pressure=Math.min(250,...opponents.map(q=>distance(q,p)));
     p.attributes??={aggression:.8+(index%3)*.12,vision:.75+(index%2)*.2};
     const scores={press:0,pass:0,shoot:0,carry:pressure>100?62:20,dribble:pressure<100?48:12,protect:pressure<55?58:0,intercept:opponentOwns?70:15,mark:phase==='DEFENDING'?55:10,cross:Math.abs(ball.y-H/2)>H*.25?50:10,support:40,cover:defender?55:0,returnFormation:distance(p,formation)*.1};
     p.markedOpponent=null;if(phase==='DEFENDING'&&p!==chaser&&!keeper){const threat=threats.filter(q=>!marked.has(q.id)).sort((a,b)=>distance(p,a)+forward(a.x)*.2-distance(p,b)-forward(b.x)*.2)[0];if(threat){marked.add(threat.id);p.markedOpponent=threat.id;target={x:threat.x-direction*45,y:threat.y+(H/2-threat.y)*.15};state='MARKING';}}
     if(p===chaser){
      state='PRESSING';scores.press=90;
      // Compare the center and both corners against the actual defending line.
      // The nearest opponent to the ball is not necessarily the goalkeeper.
      const shot=this.shotPlan(s,p,opponents);let aim=shot.target;
      let passTarget=null,passPlan=null;const passRange=PHYSICS.passMaxSpeed*clamp((p.attributes.passing??70)/70,.8,1.2)/rollingResistance*.85;
      for(const ally of players){
       if(ally===p)continue;const range=distance(ally,ball);if(range<55||range>passRange)continue;
       const plan=this.passPlan(s,p,ally,opponents);if(!plan)continue;
       const free=Math.min(160,...opponents.map(q=>distance(q,plan.target)));
       const score=(plan.safe?42:-45)+free*.2+clamp((forward(plan.target.x)-forward(p.x))*.14,-18,30)-plan.arrival*5;
       if(score>scores.pass){scores.pass=score;passTarget=ally;passPlan=plan;}
      }
      const request=G.cfg.career&&G.teamRequests?.[team],requester=request&&players.find(q=>q.id===request.playerId);
      const requested=requester&&request.until>(G.elapsed||G.el||this.time)&&requester!==p;
      const range=distance(ball,aim),laneClear=shot.safe,angle=Math.abs(ball.y-H/2);
      scores.shoot=range<Math.min(W*.55,PHYSICS.shotImpulse*clamp((p.attributes.shooting??70)/70,.8,1.2)/rollingResistance*.85)?(laneClear?122:70)-range*.055-angle*.055:-20;
      scores.shoot*=p.attributes.aggression??(.8+(index%3)*.12);
      if(pressure<75)scores.pass+=22;
      if(requested&&request.type==='PASS'){const plan=this.passPlan(s,p,requester,opponents);if(plan){passTarget=requester;passPlan=plan;scores.pass=150;}}
      if(combination?.to===p.id){const runner=players.find(q=>q.id===combination.from),returnPlan=runner&&this.passPlan(s,p,runner,opponents);if(returnPlan?.safe&&forward(returnPlan.target.x)>forward(p.x)-45&&range>150){passTarget=runner;passPlan=returnPlan;scores.pass=145;}}
      if(requested&&request.type==='SHOOT')scores.shoot=160;
      const movementScore=Math.max(scores.carry,scores.dribble,scores.protect);
      const wallEscape=owned&&!requested&&Math.min(ball.x,W-ball.x,ball.y,H-ball.y)<BR+18;
      if(wallEscape)scores.pass=Math.max(scores.pass,118);
      const passing=(passTarget||wallEscape)&&scores.pass>Math.max(scores.shoot,movementScore);
      if(owned&&!passing&&scores.shoot<movementScore){
       state=scores.protect===movementScore?'PROTECTING':scores.dribble===movementScore?'DRIBBLING':'CARRYING';
       aim=state==='PROTECTING'&&enemy?{x:ball.x+(ball.x-enemy.x)*3,y:ball.y+(ball.y-enemy.y)*3}:pressure<140?this.dribblePlan(s,p,opponents,direction):{x:goal,y:clamp(ball.y,GY0,GY1)};
      }
      if(passing)aim=passPlan?.target||(passTarget?{x:passTarget.x,y:passTarget.y}:{x:clamp(ball.x+direction*220,80,W-80),y:clamp(H/2,80,H-80)});
      let ax=aim.x-ball.x,ay=aim.y-ball.y,ad=Math.hypot(ax,ay)||1;ax/=ad;ay/=ad;
      const reach=distance(p,ball),alignment=((ball.x-p.x)*ax+(ball.y-p.y)*ay)/(reach||1);
      // Arm an action just before contact; physics still enforces the exact small ring.
      if(reach<interaction.radius(s)+24&&alignment>.5&&p.cd<=0&&(passing||scores.shoot>Math.max(35,movementScore))){
       const error=[.12,.055,.018][difficulty]*(this.random()-.5),c=Math.cos(error),sn=Math.sin(error);
       command.aim={x:(ax*c-ay*sn)*ad,y:(ax*sn+ay*c)*ad};command.pass=!!passing;command.shoot=!passing;state=passing?'PASSING':'SHOOTING';
       if(passing&&passTarget&&!keeper&&!tactical.combination&&!tactical.pendingPass)tactical.pendingPass={from:p.id,to:passTarget.id,previousKick:ball.kickAt??-1,until:this.time+1,run:{x:clamp(p.x+direction*180,65,W-65),y:clamp(p.y+(passTarget.y>p.y?-65:65),55,H-55)}};
      }
      const onWrongSide=((p.x-ball.x)*ax+(p.y-ball.y)*ay)>-12;
      const side=p.y<ball.y?-1:1;
      target={x:ball.x-ax*(20+BR+3)+(onWrongSide?-ay*side*42:0),y:ball.y-ay*(20+BR+3)+(onWrongSide?ax*side*42:0)};
      if(alignment>.7&&reach<20+BR+45)target={x:ball.x+ax*36,y:ball.y+ay*36};
      if(!owned&&(opponentOwns||moving)){const speed=PHYSICS.botMaxSpeeds[difficulty]*clamp((p.attributes?.speed??70)/70,.8,1.2),intercept=forecast?.find((point,i)=>distance(p,point)<=speed*horizons[i]+interaction.radius(s))||predicted;target={x:intercept.x-(ball.last===team?ax*22:0),y:intercept.y-(ball.last===team?ay*22:0)};state='INTERCEPTING';}
     }
     if(combination?.from===p.id&&ball.last===team&&!interaction.contains(p,ball,s)){target={...combination.run};state='GIVE_AND_GO';command.shoot=command.pass=false;}
     if(keeper&&p!==chaser&&state!=='GIVE_AND_GO'){const coverage=this.keeperTarget(s,team);target=coverage.target;state=coverage.shot?'SHOT_COVER':'GOALKEEPING';}
     // Humans may leave their slot; an ally covers an abandoned defensive lane.
     const human=players.find(q=>q.ctrl!=='ai'&&q.role.startsWith('VOLANTE')&&forward(q.x)>W*.65);
     if(human&&defender&&p!==chaser){target.x=home+direction*Math.min(forward(target.x),W*.27);state='COVERING';}
     for(const ally of players){if(ally===p||p===chaser&&distance(ally,ball)<90)continue;const dx=target.x-ally.x,dy=target.y-ally.y,d=Math.hypot(dx,dy);if(d<CONFIG.minTeammateDistance){const sign=index%2?1:-1;target.y+=(d?dy/d:sign)*(CONFIG.minTeammateDistance-d);target.x+=(d?dx/d:-direction)*(CONFIG.minTeammateDistance-d)*.4;}}
     if(p!==chaser&&!keeper)for(const q of reserved){const dy=target.y-q.y,dx=target.x-q.x,d=Math.hypot(dx,dy);if(d<CONFIG.minTeammateDistance){target.y+=(dy?Math.sign(dy):index%2?1:-1)*(CONFIG.minTeammateDistance-d);}}
     if(areaOwners.length>=2&&!areaOwners.includes(p.id)){
      const entering=inArea(target)||forward(p.x)<region.areaDepth+30&&p.y>GY0-region.areaPadding-25&&p.y<GY1+region.areaPadding+25;
      if(entering){target.x=home+direction*(region.areaDepth+55);target.y=clamp(target.y,45,H-45);state='COVERING';}
     }
     target.x=clamp(target.x,-40,W+40);target.y=clamp(target.y,-40,H+40);
     // Sidestep blockers only while travelling; never scatter the contact approach.
     if(distance(p,ball)>90)for(const opponent of opponents){const dx=p.x-opponent.x,dy=p.y-opponent.y,d=Math.hypot(dx,dy);if(d<55&&d>0){target.x+=dx/d*(55-d);target.y+=dy/d*(55-d);}}
     target.x=clamp(target.x,-40,W+40);target.y=clamp(target.y,-40,H+40);
     reserved.push(target);p.basePosition={x:home+direction*(defender?W*.3:W*.3+Math.min(CONFIG.formationDepth,W*.23)),y:H/2+lane*CONFIG.formationWidth/2};p.formationTarget=formation;p.targetPosition=target;p.currentState=state;p.primaryBallChaser=p.id===tactical.chaser;p.defensiveAreaOwner=tactical.areaOwner;p.defensiveAreaOwners=areaOwners;p.decisionScores=scores;
     // Keep a stable escape side when blocked instead of alternating every decision.
     let motion=this.motion.get(p.id);if(!motion){motion={x:p.x,y:p.y,at:this.time,blocked:0,escapeUntil:0,side:index%2?1:-1};this.motion.set(p.id,motion);}const elapsed=this.time-motion.at;if(elapsed>=.25){motion.blocked=distance(p,motion)<5&&distance(p,target)>55?motion.blocked+elapsed:0;motion.x=p.x;motion.y=p.y;motion.at=this.time;if(motion.blocked>.65){motion.escapeUntil=this.time+.65;motion.blocked=0;}}
     if(p.ctrl==='ai'&&motion.escapeUntil>this.time){const dx=target.x-p.x,dy=target.y-p.y,n=Math.hypot(dx,dy)||1;target.x=clamp(p.x+dx/n*35-dy/n*65*motion.side,25,W-25);target.y=clamp(p.y+dy/n*35+dx/n*65*motion.side,25,H-25);p.currentState='FINDING_SPACE';}
     const dx=target.x-p.x,dy=target.y-p.y,d=Math.hypot(dx,dy),speed=Math.min(1,d/40);if(d>6){command.x=dx/d*speed;command.y=dy/d*speed;}
     this.commands.set(p,command);
    }
   }
  }
  keeperTarget(s,team){
   const direction=field.side(s,team)?-1:1,home=direction===1?0:s.W,x=home+direction*55,b=s.ball;
   const toward=b.vx*direction<-35,crossing=toward?(x-b.x)/b.vx:-1,remaining=crossing>0?1-rollingResistance*crossing:-1;
   const shot=toward&&remaining>.08&&crossing>0;const y=shot?b.y+b.vy*crossing:s.H/2+(b.y-s.H/2)*.4;
   return {shot,target:{x,y:clamp(y,s.GY0+18,s.GY1-18)}};
  }
  supportTarget(s,p,desired,opponents,direction,defender){
   const previous=this.support.get(p.id);if(previous&&previous.until>this.time&&distance(previous,desired)<100&&opponents.every(q=>distance(q,previous)>65))return {x:previous.x,y:previous.y};
   let best={...desired},quality=-Infinity;
   for(const dx of [-45,0,45])for(const dy of [-65,0,65]){const spot={x:clamp(desired.x+dx,50,s.W-50),y:clamp(desired.y+dy,50,s.H-50)},free=Math.min(200,...opponents.map(q=>distance({x:q.x+(q.vx||0)*.25,y:q.y+(q.vy||0)*.25},spot))),lane=this.clearLane(s.ball,spot,opponents,PHYSICS.playerRadius+s.BR+9),progress=(spot.x-desired.x)*direction,score=(lane?95:-90)+free*.5-distance(spot,desired)*.18-distance(p,spot)*.05+progress*(defender?-.08:.08);if(score>quality){quality=score;best=spot;}}
   this.support.set(p.id,{...best,until:this.time+.4});return best;
  }
  shotPlan(s,p,opponents){
   const goal=field.side(s,p.team)?0:s.W,factor=clamp((p.attributes?.shooting??70)/70,.8,1.2);let best=null;
   for(const y of [s.GY0+s.BR+12,s.H/2,s.GY1-s.BR-12]){const target={x:goal,y},dx=goal-s.ball.x,dy=y-s.ball.y,range=Math.hypot(dx,dy),speed=PHYSICS.shotImpulse*factor,arrival=Math.min(3,ballPhysics.travelTime(range,speed));
    const clearance=Math.min(180,...opponents.map(q=>{const t=clamp(((q.x-s.ball.x)*dx+(q.y-s.ball.y)*dy)/(range*range||1),0,1),at=arrival*t,px=q.x+(q.vx||0)*at*.7,py=q.y+(q.vy||0)*at*.7;return Math.hypot(px-s.ball.x-dx*t,py-s.ball.y-dy*t)-PHYSICS.playerRadius-s.BR;}));const safe=clearance>5,quality=(safe?160:0)+clearance*.35-range*.04;if(!best||quality>best.quality)best={target,safe,quality,arrival};
   }return best;
  }
  passPlan(s,player,ally,opponents){
   const factor=clamp((player.attributes?.passing??70)/70,.8,1.2);let target={x:ally.x,y:ally.y},arrival=0,speed=0;
   // Match the same friction and pass strength used by the physical kick.
   for(let i=0;i<4;i++){const range=distance(s.ball,target);speed=ballPhysics.passSpeed(range)*factor;arrival=ballPhysics.travelTime(range,speed);if(arrival>3)return null;target={x:clamp(ally.x+(ally.vx||0)*arrival,40,s.W-40),y:clamp(ally.y+(ally.vy||0)*arrival,40,s.H-40)};}
   const finalRange=distance(s.ball,target);speed=ballPhysics.passSpeed(finalRange)*factor;arrival=ballPhysics.travelTime(finalRange,speed);if(arrival>3)return null;
   const dx=target.x-s.ball.x,dy=target.y-s.ball.y,length=dx*dx+dy*dy||1;
   const clearance=Math.min(200,...opponents.map(q=>{const fraction=clamp(((q.x-s.ball.x)*dx+(q.y-s.ball.y)*dy)/length,0,1),time=ballPhysics.travelTime(Math.sqrt(length)*fraction,speed);const px=q.x+(q.vx||0)*time*.65,py=q.y+(q.vy||0)*time*.65;return Math.hypot(px-s.ball.x-dx*fraction,py-s.ball.y-dy*fraction)-PHYSICS.playerRadius-s.BR-Math.max(0,time-.3)*PHYSICS.playerMaxSpeed*.25;}));
   return {target,arrival,speed,clearance,safe:clearance>8};
  }
  dribblePlan(s,p,opponents,direction){
   let move=this.dribbles.get(p.id);
   if(!move||move.until<this.time){let best=-Infinity;for(const side of [-1,1]){const target={x:clamp(s.ball.x+direction*110,35,s.W-35),y:clamp(s.ball.y+side*85,35,s.H-35)},space=Math.min(250,...opponents.map(q=>distance(q,target)));if(space>best){best=space;move={target,side,at:this.time,until:this.time+.85};}}this.dribbles.set(p.id,move);}
   // A short body feint followed by the chosen escape; possession is still contact.
   return this.time-move.at<.16?{x:s.ball.x+direction*60,y:clamp(s.ball.y-move.side*35,35,s.H-35)}:move.target;
  }
  clearLane(a,b,opponents,radius){
   const dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy||1;
   return !opponents.some(p=>{const t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/length,0,1);return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t)<radius;});
  }
 }
 if(typeof module!=='undefined')module.exports={Tactics,ROLES};else root.MaxballAI={Tactics,ROLES};
})(globalThis);
