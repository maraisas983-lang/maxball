(function(root){
 'use strict';
 const config=(typeof module!=='undefined'?require('../core/config.js'):root.MaxballConfig).physics;
 const ballPhysics=typeof module!=='undefined'?require('./ballPhysics.js'):root.MaxballBall;
 const tactics=typeof module!=='undefined'?require('../ai/tactics.js'):root.MaxballAI;
 const contacts=typeof module!=='undefined'?require('./contacts.js'):root.MaxballContacts;
 const interaction=typeof module!=='undefined'?require('./interaction.js'):root.MaxballInteraction;
 const movement=typeof module!=='undefined'?require('./movement.js'):root.MaxballMovement;
 const field=typeof module!=='undefined'?require('../game/field.js'):root.MaxballField;
 const goalColliders=typeof module!=='undefined'?require('./goalColliders.js'):root.MaxballGoalColliders;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 function createPhysics({state,input,effects={},random=Math.random,externalAI=null}){
  let view,G,P,ball,W,H,GY0,GY1,BR,brain,brainGame;
  const stats={steps:0,playerPairs:0,playerContacts:0,ballContacts:0},inputs=[];
  const corrections=[],previous=new Map(),active=[],contactPlayers=[],actions=[];
  const PR=config.playerRadius;
  function sync(){view=state();({G,P,ball,W,H,GY0,GY1,BR}=view);if(G!==brainGame){brain=externalAI||new tactics.Tactics(state,random);brainGame=G;}}
  function touch(p){
   if(G.restarting&&p.team!==G.ko)return;
   if(G.restarting){G.restarting=false;G.firstTouch=p.id;}
   ball.trail=p.trail??0;effects.touch?.(p);
   const id=p.id??P.indexOf(p);
   if(ball.lastPlayer!==id){ball.previousTouch={id:ball.lastPlayer,team:ball.last,time:ball.touchTime};ball.lastPlayer=id;}ball.touchTime=G.elapsed||G.el||0;ball.last=p.team;
  }
  function kick(p,type,aim,origin=p){
   if(G.kl>0||p.cd>0||G.restarting&&p.team!==G.ko||p.inactive)return false;
   const dx=ball.x-p.x,dy=ball.y-p.y,length=Math.hypot(dx,dy);
   if(!interaction.contains(origin,ball,view))return false;
   let ax=aim?.x,ay=aim?.y;
   // Movement updates heading from the current input before actions are evaluated.
   // With no input, keep that heading; AI may supply a target displacement.
   if(!aim||!Number.isFinite(ax)||!Number.isFinite(ay)||Math.hypot(ax,ay)<1e-8){ax=p.fx;ay=p.fy;aim=null;}
   if(!Number.isFinite(ax)||!Number.isFinite(ay)||Math.hypot(ax,ay)<1e-8){ax=p.team?-1:1;ay=0;}
   const n=Math.hypot(ax,ay)||1;
   const ux=ax/n,uy=ay/n;
   // A real forward contact is required. Never disable the kicker's collider.
   if(length<1e-8||(dx*ux+dy*uy)/length<config.kickFrontCos)return false;
   const power=type==='s'?config.shotImpulse:aim?ballPhysics.passSpeed(n):config.passMinSpeed+(config.passImpulse-config.passMinSpeed)*clamp(p.aimStrength??1,0,1);
   G.restarting=false;G.kl=.08;p.cd=config.kickCooldown;
   const ability=type==='s'?p.attributes?.shooting:p.attributes?.passing,factor=clamp((ability??70)/70,.8,1.2);
   ball.vx=ux*power*factor;ball.vy=uy*power*factor;
   const speed=Math.hypot(ball.vx,ball.vy);if(speed>config.ballMaxSpeed){ball.vx*=config.ballMaxSpeed/speed;ball.vy*=config.ballMaxSpeed/speed;}ball.kickedBy=p.id;
   touch(p);effects.kick?.(p,type);
   const col=p.team?'#ff2d87':'#c8ff2e';effects.burst?.(ball.x,ball.y,type==='s'?10:6,[col,'#fff'],type==='s'?220:120,.3);
   effects.beep?.(type==='s'?180:420,.1,type==='s'?'sawtooth':'triangle',.06);
   effects.particle?.({t:'r',x:ball.x,y:ball.y,s:8,l:.3,m:.3,c:col,vx:0,vy:0,g:0});
   return true;
  }
  function separatePlayers(active){
   for(let iteration=0;iteration<4;iteration++){
    for(let i=0;i<active.length;i++){corrections[i]??={x:0,y:0};corrections[i].x=corrections[i].y=0;}
    let overlaps=0;
    for(let a=0;a<active.length;a++)for(let b=a+1;b<active.length;b++){
     stats.playerPairs++;const A=active[a],B=active[b];if((A.x-B.x)**2+(A.y-B.y)**2>=PR*PR*4)continue;const d=dist(A,B);if(d>=PR*2-.01)continue;overlaps++;if(iteration===0)stats.playerContacts++;
     if(iteration===0)effects.playerContact?.(A,B);
     const nx=d?(B.x-A.x)/d:String(A.id)<String(B.id)?1:-1,ny=d?(B.y-A.y)/d:0,depth=(PR*2-d)*.5;
     corrections[a].x-=nx*depth;corrections[a].y-=ny*depth;corrections[b].x+=nx*depth;corrections[b].y+=ny*depth;
     if(iteration===0){const closing=(B.vx-A.vx)*nx+(B.vy-A.vy)*ny;if(closing<0){const impulse=closing*.5;A.vx+=nx*impulse;A.vy+=ny*impulse;B.vx-=nx*impulse;B.vy-=ny*impulse;}}
    }
    if(!overlaps)break;
    active.forEach((p,i)=>{p.x+=corrections[i].x;p.y+=corrections[i].y;});
   }
  }
  function step(dt){
   stats.steps++;ball.sweepStart={x:ball.x,y:ball.y};G.kl=(G.kl||0)-dt;
   if(G.restarting)G.restartTime+=dt;
   brain.update?.(dt);active.length=actions.length=0;
   for(const p of P)if(!p.inactive){active.push(p);let point=previous.get(p.id);if(!point){point={x:0,y:0};previous.set(p.id,point);}point.x=p.x;point.y=p.y;}
   for(let index=0;index<active.length;index++){const p=active[index];
    const source=p.ctrl==='ai'&&G.phase!=='penalties'?brain.command(p):input(p),i=inputs[index]??={};i.x=source?.x??0;i.y=source?.y??0;i.shoot=source?.shoot;i.pass=source?.pass;i.shootSeq=source?.shootSeq;i.passSeq=source?.passSeq;i.aim=source?.aim;
    const blocked=G.restarting&&p.team!==G.ko;
    if(blocked){i.x=i.y=0;i.shoot=i.pass=false;}
    let l=Math.hypot(i.x,i.y);if(l>1){i.x/=l;i.y/=l;l=1;}
    const sp=p.ctrl==='ai'?config.botMaxSpeeds[G.cfg.diff]:config.playerMaxSpeed;
    const inReach=interaction.contains(p,ball,view);
    movement.integrate(p,i,dt,sp);p.cd-=dt;p.st=1;
    for(const type of ['shoot','pass']){
     const edge=i[type]&&!p[type+'Held']||Number.isSafeInteger(i[type+'Seq'])&&i[type+'Seq']>(p[type+'Seq']||0);
     if(!blocked&&(edge||i[type]))p[type+'Buffer']=config.kickBuffer;
     p[type+'Held']=!!i[type];if(Number.isSafeInteger(i[type+'Seq']))p[type+'Seq']=i[type+'Seq'];
    }
    if(p.cd<=0&&(inReach||interaction.contains(p,ball,view))&&(p.shootBuffer>0||p.passBuffer>0))actions.push({p,type:p.shootBuffer>0?'s':'p',aim:i.aim,origin:inReach?previous.get(p.id):p});
    p.shootBuffer=(p.shootBuffer||0)-dt;p.passBuffer=(p.passBuffer||0)-dt;
   }
   // A simultaneous action has stable arbitration independent of player order.
   actions.sort((a,b)=>dist(a.p,ball)-dist(b.p,ball)||String(a.p.id).localeCompare(String(b.p.id)));
   for(const action of actions)if(kick(action.p,action.type,action.aim,action.origin)){action.p.shootBuffer=action.p.passBuffer=0;break;}
   separatePlayers(active);
   if(G.restarting){const spot=G.restartSpot||{x:W/2,y:H/2},zone=field.geometry(view).centerRadius+PR;for(const p of active)if(p.team!==G.ko){const dx=p.x-spot.x,dy=p.y-spot.y,d=Math.hypot(dx,dy);if(d<zone){p.x=spot.x+(d?dx/d:(p.team?-1:1))*zone;p.y=spot.y+(d?dy/d:0)*zone;p.vx=p.vy=0;}}}
   contactPlayers.length=0;for(const p of active)if(!G.restarting||p.team===G.ko)contactPlayers.push(p);
   if(contacts.resolveContacts(contactPlayers,ball,BR,dt,touch,view))stats.ballContacts++;
   ballPhysics.prepareContacts(ball,G.restarting?contactPlayers:active,touch);
   for(const p of active){p.x=clamp(p.x,PR-config.playerOutsideMargin,W+config.playerOutsideMargin-PR);p.y=clamp(p.y,PR-config.playerOutsideMargin,H+config.playerOutsideMargin-PR);goalColliders.resolve(p,previous.get(p.id),view,PR);}
   field.limitDefense(view,previous);
  }
  return {stats,ai(p){sync();return brain.command(p);},kick(...args){sync();return kick(...args);},step(dt){sync();step(dt);}};
 }
 const api={createPhysics};if(typeof module!=='undefined')module.exports=api;else root.MaxballPhysics=api;
})(globalThis);
