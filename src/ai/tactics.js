(function(root){
 'use strict';
 const field=typeof module!=='undefined'?require('../game/field.js'):root.MaxballField;
 const ballPhysics=typeof module!=='undefined'?require('../physics/ballPhysics.js'):root.MaxballBall;
 const interaction=typeof module!=='undefined'?require('../physics/interaction.js'):root.MaxballInteraction;
 const GAME_CONFIG=typeof module!=='undefined'?require('../core/config.js'):root.MaxballConfig,CONFIG=GAME_CONFIG.ai,PHYSICS=GAME_CONFIG.physics,rollingResistance=-Math.log(PHYSICS.ballFriction);
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const ROLES=['ATACANTE_CENTRAL','APOIO_DIREITO','MEIA_ESQUERDO','VOLANTE_CENTRAL','GOLEIRO'];
 class Tactics {
  constructor(state,random=Math.random){this.state=state;this.random=random;this.time=0;this.next=0;this.teams=[{},{}];this.commands=new Map();}
  update(dt){this.time+=dt;if(this.time+1e-8<this.next)return;this.next=this.time+[.2,.13,.085][this.state().G.cfg.diff??1];this.decide();}
  command(p){return this.commands.get(p)||{x:0,y:0};}
  decide(){
   const s=this.state(),{P,ball,W,H,GY0,GY1,BR,G}=s;
   if(!P?.length)return;
   const predicted=Math.hypot(ball.vx,ball.vy)>80?ballPhysics.predictTrajectory(s,[.15,.25,.35][G.cfg.diff??1]):ball,region=field.geometry(s);
   for(const team of [0,1]){
    const players=P.filter(p=>!p.inactive&&p.team===team),opponents=P.filter(p=>!p.inactive&&p.team!==team);if(!players.length)continue;
    const side=field.side(s,team),tactical=this.teams[team],direction=side?-1:1,home=side?W:0,goal=side?0:W;
    const forward=x=>(x-home)*direction;
    const inArea=p=>field.inArea(p,team,s);
    players.forEach((p,index)=>{p.id??=`local-${team}-${index}`;p.role=players.length>=4?ROLES[index]:players.length===3?(index===2?'VOLANTE_CENTRAL':ROLES[index]):index?'VOLANTE_CENTRAL':'ATACANTE_CENTRAL';});
    const closest=players.reduce((a,b)=>distance(a,ball)<distance(b,ball)?a:b),enemy=opponents.reduce((a,b)=>!a||distance(b,ball)<distance(a,ball)?b:a,null);
    const owned=interaction.contains(closest,ball,s),opponentOwns=enemy&&interaction.contains(enemy,ball,s),humanCarrier=players.find(p=>p.ctrl!=='ai'&&distance(p,ball)<110&&p.vx*direction>8);
    const phase=owned&&!opponentOwns?'ATTACKING':opponentOwns?'DEFENDING':forward(ball.x)<W*.4?'TRANSITION_DEFENSE':'TRANSITION_ATTACK';
    tactical.state=phase;
    const occupants=players.filter(inArea),areaOwners=occupants.slice().sort((a,b)=>Number(b.ctrl!=='ai')-Number(a.ctrl!=='ai')||forward(a.x)-forward(b.x)).slice(0,2).map(p=>p.id);
    const humanInArea=occupants.find(p=>p.ctrl!=='ai');
    if(humanInArea)tactical.areaOwner=humanInArea.id;
    else if(!occupants.some(p=>p.id===tactical.areaOwner))tactical.areaOwner=occupants.sort((a,b)=>forward(a.x)-forward(b.x))[0]?.id||null;
    tactical.areaOwners=areaOwners;
    const cost=p=>distance(p,predicted)+((p.role.startsWith('VOLANTE')||p.role==='GOLEIRO')&&forward(ball.x)>W*.55&&distance(p,ball)>65?100:0)+(areaOwners.length>=2&&!areaOwners.includes(p.id)&&inArea(ball)?180:0);
    const candidate=owned&&!opponentOwns?closest:players.reduce((a,b)=>cost(a)<=cost(b)?a:b),previous=players.find(p=>p.id===tactical.chaser);
    if(!previous||owned&&!opponentOwns&&candidate!==previous||(this.time>=(tactical.changeAt||0)&&cost(candidate)+CONFIG.switchAdvantage<cost(previous))){tactical.chaser=candidate.id;tactical.changeAt=this.time+CONFIG.switchChaserCooldown;}
    if(!tactical.areaOwner&&inArea(ball))tactical.areaOwner=tactical.chaser;
    const chaser=players.find(p=>p.id===tactical.chaser),ballOffset=clamp((forward(ball.x)/W-.5)*W*.24,-W*.16,W*.16),reserved=[],threats=opponents.filter(q=>q!==enemy).sort((a,b)=>forward(a.x)-forward(b.x));
    for(let index=0;index<players.length;index++){
     const p=players[index],keeper=p.role==='GOLEIRO',defender=p.role.startsWith('VOLANTE')||keeper,left=p.role.includes('ESQUERDO'),right=p.role.includes('DIREITO');
     const lane=left?-1:right?1:0;
     let depth=keeper?55:W*([.57,.46,.35,.22][index]??.3)+ballOffset;
     if(G.score[team]<G.score[1-team]&&G.time<45&&!keeper)depth+=W*.07;
     if(defender&&chaser?.role.startsWith('VOLANTE')&&chaser!==p)depth-=CONFIG.defensiveSupportDistance*.45;
     const formation={x:home+direction*clamp(depth,80,W-100),y:clamp(H/2+lane*Math.min(CONFIG.formationWidth,H*.4)/2+(ball.y-H/2)*.18,55,H-55)};
     let target={...formation},state=defender?'COVERING':'SUPPORTING';
     if(defender&&(phase==='DEFENDING'||phase==='TRANSITION_DEFENSE')){target.x=home+direction*Math.max(region.areaDepth+35,Math.min(forward(formation.x),forward(ball.x)*.6));target.y=clamp(H/2+lane*CONFIG.formationWidth*.4+(ball.y-H/2)*.35,45,H-45);}
     if(!keeper&&(owned&&!opponentOwns||humanCarrier)&&p!==chaser){const anchor=humanCarrier||closest;target.x=home+direction*clamp(forward(anchor.x)+(defender?-140:CONFIG.attackSupportDistance-index*22),region.areaDepth+20,W-65);target.y=clamp(anchor.y+lane*Math.min(H*.3,CONFIG.formationWidth*.65)+(lane===0?(index%2?95:-95):0),50,H-50);state=defender?'COVERING':'ATTACK_SUPPORT';}
     const command={x:0,y:0,shoot:false,pass:false};
     const pressure=Math.min(250,...opponents.map(q=>distance(q,p)));
     p.attributes??={aggression:.8+(index%3)*.12,vision:.75+(index%2)*.2};
     const scores={press:0,pass:0,shoot:0,carry:pressure>100?62:20,dribble:pressure<100?48:12,protect:pressure<55?58:0,intercept:opponentOwns?70:15,mark:phase==='DEFENDING'?55:10,cross:Math.abs(ball.y-H/2)>H*.25?50:10,support:40,cover:defender?55:0,returnFormation:distance(p,formation)*.1};
     if(phase==='DEFENDING'&&p!==chaser&&!keeper){const threat=threats[index%Math.max(1,threats.length)];if(threat){target={x:threat.x-direction*45,y:threat.y+(H/2-threat.y)*.15};state='MARKING';}}
     if(p===chaser){
      state='PRESSING';scores.press=90;
      const targetY=enemy&&enemy.y>H/2?GY0+28:GY1-28;
      let aim={x:goal,y:targetY},passTarget=null;const passRange=PHYSICS.passMaxSpeed*clamp((p.attributes.passing??70)/70,.8,1.2)/rollingResistance*.85;
      for(const ally of players){
       if(ally===p)continue;const range=distance(ally,ball);if(range<55||range>passRange)continue;
       const clear=this.clearLane(ball,ally,opponents,28),free=Math.min(160,...opponents.map(q=>distance(q,ally)));
       const score=(clear?28:-35)+free*.17+clamp((forward(ally.x)-forward(p.x))*.12,-20,25)-range*.03;
       if(score>scores.pass){scores.pass=score;passTarget=ally;}
      }
      const request=G.cfg.career&&G.teamRequests?.[team],requester=request&&players.find(q=>q.id===request.playerId);
      const requested=requester&&request.until>(G.elapsed||G.el||this.time)&&requester!==p;
      const range=Math.abs(goal-ball.x),laneClear=this.clearLane(ball,aim,opponents,24),angle=Math.abs(ball.y-H/2);
      scores.shoot=range<Math.min(W*.55,PHYSICS.shotImpulse*clamp((p.attributes.shooting??70)/70,.8,1.2)/rollingResistance*.85)?(laneClear?122:70)-range*.055-angle*.055:-20;
      scores.shoot*=p.attributes.aggression??(.8+(index%3)*.12);
      if(pressure<75)scores.pass+=22;
      if(requested&&request.type==='PASS'){passTarget=requester;scores.pass=150;}
      if(requested&&request.type==='SHOOT')scores.shoot=160;
      const movementScore=Math.max(scores.carry,scores.dribble,scores.protect);
      const wallEscape=owned&&!requested&&Math.min(ball.x,W-ball.x,ball.y,H-ball.y)<BR+18;
      if(wallEscape)scores.pass=Math.max(scores.pass,118);
      const passing=(passTarget||wallEscape)&&scores.pass>Math.max(scores.shoot,movementScore);
      if(owned&&!passing&&scores.shoot<movementScore){
       state=scores.protect===movementScore?'PROTECTING':scores.dribble===movementScore?'DRIBBLING':'CARRYING';
       aim=state==='PROTECTING'&&enemy?{x:ball.x+(ball.x-enemy.x)*3,y:ball.y+(ball.y-enemy.y)*3}:{x:goal,y:clamp(ball.y+(enemy?(ball.y>enemy.y?65:-65):0),GY0,GY1)};
      }
      if(passing)aim=passTarget?{x:passTarget.x+passTarget.vx*.18,y:passTarget.y+passTarget.vy*.18}:{x:clamp(ball.x+direction*220,80,W-80),y:clamp(H/2,80,H-80)};
      let ax=aim.x-ball.x,ay=aim.y-ball.y,ad=Math.hypot(ax,ay)||1;ax/=ad;ay/=ad;
      const reach=distance(p,ball),alignment=((ball.x-p.x)*ax+(ball.y-p.y)*ay)/(reach||1);
      // Arm an action just before contact; physics still enforces the exact small ring.
      if(reach<interaction.radius(s)+24&&alignment>.5&&p.cd<=0&&(passing||scores.shoot>Math.max(35,movementScore))){
       const error=[.12,.055,.018][G.cfg.diff]*(this.random()-.5),c=Math.cos(error),sn=Math.sin(error);
       command.aim={x:(ax*c-ay*sn)*ad,y:(ax*sn+ay*c)*ad};command.pass=!!passing;command.shoot=!passing;state=passing?'PASSING':'SHOOTING';
      }
      const onWrongSide=((p.x-ball.x)*ax+(p.y-ball.y)*ay)>-12;
      const side=p.y<ball.y?-1:1;
      target={x:ball.x-ax*(20+BR+3)+(onWrongSide?-ay*side*42:0),y:ball.y-ay*(20+BR+3)+(onWrongSide?ax*side*42:0)};
      if(alignment>.7&&reach<20+BR+45)target={x:ball.x+ax*36,y:ball.y+ay*36};
      if(!owned&&(opponentOwns||Math.hypot(ball.vx,ball.vy)>80)){target={x:predicted.x-(ball.last===team?ax*22:0),y:predicted.y-(ball.last===team?ay*22:0)};state='INTERCEPTING';}
     }
     if(keeper&&p!==chaser){target={x:home+direction*55,y:clamp(H/2+(ball.y-H/2)*.4,GY0+15,GY1-15)};state='GOALKEEPING';}
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
     const dx=target.x-p.x,dy=target.y-p.y,d=Math.hypot(dx,dy),speed=Math.min(1,d/40);if(d>6){command.x=dx/d*speed;command.y=dy/d*speed;}
     this.commands.set(p,command);
    }
   }
  }
  clearLane(a,b,opponents,radius){
   const dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy||1;
   return !opponents.some(p=>{const t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/length,0,1);return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t)<radius;});
  }
 }
 if(typeof module!=='undefined')module.exports={Tactics,ROLES};else root.MaxballAI={Tactics,ROLES};
})(globalThis);
