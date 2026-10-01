(function(root){
 'use strict';
 const CONFIG=(typeof module!=='undefined'?require('../core/config.js'):root.MaxballConfig).ai;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const ROLES=['ATACANTE_ESQUERDO','ATACANTE_DIREITO','VOLANTE_ESQUERDO','VOLANTE_DIREITO'];
 class Tactics {
  constructor(state,random=Math.random){this.state=state;this.random=random;this.time=0;this.next=0;this.teams=[{},{}];this.commands=new Map();}
  update(dt){this.time+=dt;if(this.time+1e-8<this.next)return;this.next=this.time+CONFIG.decisionInterval;this.decide();}
  command(p){return {...(this.commands.get(p)||{x:0,y:0})};}
  decide(){
   const s=this.state(),{P,ball,W,H,GY0,GY1,BR,G}=s;
   if(!P?.length)return;
   for(const team of [0,1]){
    const players=P.filter(p=>p.team===team),opponents=P.filter(p=>p.team!==team);if(!players.length)continue;
    const tactical=this.teams[team],direction=team?-1:1,home=team?W:0,goal=team?0:W;
    const forward=x=>(x-home)*direction;
    const inArea=p=>forward(p.x)<CONFIG.defensiveAreaDepth&&p.y>GY0-CONFIG.defensiveAreaPadding&&p.y<GY1+CONFIG.defensiveAreaPadding;
    players.forEach((p,index)=>{p.id??=`local-${team}-${index}`;p.role=players.length>=4?ROLES[index]:players.length===3?(index===2?'VOLANTE_CENTRAL':ROLES[index]):index?'VOLANTE_CENTRAL':'ATACANTE_CENTRAL';});
    const closest=players.reduce((a,b)=>distance(a,ball)<distance(b,ball)?a:b),enemy=opponents.reduce((a,b)=>!a||distance(b,ball)<distance(a,ball)?b:a,null);
    const owned=distance(closest,ball)<20+BR+18,opponentOwns=enemy&&distance(enemy,ball)<20+BR+18;
    const phase=owned&&!opponentOwns?'ATTACKING':opponentOwns?'DEFENDING':forward(ball.x)<W*.4?'TRANSITION_DEFENSE':'TRANSITION_ATTACK';
    tactical.state=phase;
    const occupants=players.filter(inArea);
    const humanInArea=occupants.find(p=>p.ctrl!=='ai');
    if(humanInArea)tactical.areaOwner=humanInArea.id;
    else if(!occupants.some(p=>p.id===tactical.areaOwner))tactical.areaOwner=occupants.sort((a,b)=>forward(a.x)-forward(b.x))[0]?.id||null;
    const cost=p=>distance(p,{x:ball.x+ball.vx*.2,y:ball.y+ball.vy*.2})+(p.role.startsWith('VOLANTE')&&forward(ball.x)>W*.55?100:0)+(tactical.areaOwner&&tactical.areaOwner!==p.id&&inArea(ball)?180:0);
    const candidate=players.reduce((a,b)=>cost(a)<=cost(b)?a:b),previous=players.find(p=>p.id===tactical.chaser);
    if(!previous||(this.time>=(tactical.changeAt||0)&&cost(candidate)+CONFIG.switchAdvantage<cost(previous))){tactical.chaser=candidate.id;tactical.changeAt=this.time+CONFIG.switchChaserCooldown;}
    if(!tactical.areaOwner&&inArea(ball))tactical.areaOwner=tactical.chaser;
    const chaser=players.find(p=>p.id===tactical.chaser),ballOffset=clamp((forward(ball.x)/W-.5)*W*.24,-W*.16,W*.16);
    for(let index=0;index<players.length;index++){
     const p=players[index],defender=p.role.startsWith('VOLANTE'),left=p.role.includes('ESQUERDO'),right=p.role.includes('DIREITO');
     const lane=left?-1:right?1:0;
     let depth=W*.3+ballOffset+(defender?0:Math.min(CONFIG.formationDepth,W*.23));
     if(defender&&chaser?.role.startsWith('VOLANTE')&&chaser!==p)depth-=CONFIG.defensiveSupportDistance*.45;
     const formation={x:home+direction*clamp(depth,80,W-100),y:clamp(H/2+lane*Math.min(CONFIG.formationWidth,H*.4)/2+(ball.y-H/2)*.18,55,H-55)};
     let target={...formation},state=defender?'COVERING':'SUPPORTING';
     const command={x:0,y:0,shoot:false,pass:false};
     const scores={press:0,pass:0,shoot:0,support:40,cover:defender?55:0,returnFormation:distance(p,formation)*.1};
     if(p===chaser){
      state='PRESSING';scores.press=90;
      const targetY=enemy&&enemy.y>H/2?GY0+28:GY1-28;
      let aim={x:goal,y:targetY},passTarget=null;
      for(const ally of players){
       if(ally===p)continue;const range=distance(ally,ball);if(range<55||range>500)continue;
       const clear=this.clearLane(ball,ally,opponents,28),free=Math.min(160,...opponents.map(q=>distance(q,ally)));
       const score=(clear?38:-35)+free*.22+clamp((forward(ally.x)-forward(p.x))*.12,-20,25)-range*.03;
       if(score>scores.pass){scores.pass=score;passTarget=ally;}
      }
      const request=G.cfg.career&&G.teamRequests?.[team],requester=request&&players.find(q=>q.id===request.playerId);
      const requested=requester&&request.until>(G.elapsed||G.el||this.time)&&requester!==p;
      const range=Math.abs(goal-ball.x),laneClear=this.clearLane(ball,aim,opponents,24),angle=Math.abs(ball.y-H/2);
      scores.shoot=range<360?(laneClear?85:48)-range*.05-angle*.08:-20;
      if(requested&&request.type==='PASS'){passTarget=requester;scores.pass=150;}
      if(requested&&request.type==='SHOOT')scores.shoot=160;
      const passing=passTarget&&scores.pass>scores.shoot;
      if(passing)aim={x:passTarget.x+passTarget.vx*.18,y:passTarget.y+passTarget.vy*.18};
      let ax=aim.x-ball.x,ay=aim.y-ball.y,ad=Math.hypot(ax,ay)||1;ax/=ad;ay/=ad;
      const reach=distance(p,ball),alignment=((ball.x-p.x)*ax+(ball.y-p.y)*ay)/(reach||1);
      if(reach<20+BR+12&&alignment>.55&&p.cd<=0&&(passing||scores.shoot>35)){
       const error=[.12,.055,.018][G.cfg.diff]*(this.random()-.5),c=Math.cos(error),sn=Math.sin(error);
       command.aim={x:(ax*c-ay*sn)*ad,y:(ax*sn+ay*c)*ad};command.pass=!!passing;command.shoot=!passing;state=passing?'PASSING':'SHOOTING';
      }
      const onWrongSide=((p.x-ball.x)*ax+(p.y-ball.y)*ay)>-12;
      const side=p.y<ball.y?-1:1;
      target={x:ball.x-ax*(20+BR+3)+(onWrongSide?-ay*side*42:0),y:ball.y-ay*(20+BR+3)+(onWrongSide?ax*side*42:0)};
      if(alignment>.7&&reach<20+BR+45)target={x:ball.x+ax*36,y:ball.y+ay*36};
      if(opponentOwns&&!owned)target={x:ball.x+ball.vx*.14,y:ball.y+ball.vy*.14};
     }
     // Humans may leave their slot; an ally covers an abandoned defensive lane.
     const human=players.find(q=>q.ctrl!=='ai'&&q.role.startsWith('VOLANTE')&&forward(q.x)>W*.65);
     if(human&&defender&&p!==chaser){target.x=home+direction*Math.min(forward(target.x),W*.27);state='COVERING';}
     for(const ally of players){if(ally===p)continue;const dx=target.x-ally.x,dy=target.y-ally.y,d=Math.hypot(dx,dy);if(d<CONFIG.minTeammateDistance){const sign=index%2?1:-1;target.y+=(d?dy/d:sign)*(CONFIG.minTeammateDistance-d);target.x+=(d?dx/d:-direction)*(CONFIG.minTeammateDistance-d)*.4;}}
     if(tactical.areaOwner&&tactical.areaOwner!==p.id){
      const entering=inArea(target)||forward(p.x)<CONFIG.defensiveAreaDepth+30&&p.y>GY0-CONFIG.defensiveAreaPadding-25&&p.y<GY1+CONFIG.defensiveAreaPadding+25;
      if(entering){target.x=home+direction*(CONFIG.defensiveAreaDepth+55);target.y=clamp(target.y,45,H-45);state='COVERING';}
     }
     target.x=clamp(target.x,-40,W+40);target.y=clamp(target.y,-40,H+40);
     p.formationTarget=formation;p.targetPosition=target;p.currentState=state;p.primaryBallChaser=p.id===tactical.chaser;p.defensiveAreaOwner=tactical.areaOwner;p.decisionScores=scores;
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
