(function (root) {
  'use strict';
  const physics=(typeof module!=='undefined'?require('../core/config.js'):root.MaxballConfig).physics;
  const contacts=typeof module!=='undefined'?require('./contacts.js'):root.MaxballContacts;
  const rotation=typeof module!=='undefined'?require('./ballRotation.js'):root.MaxballBallRotation;
  const contactContexts=new WeakMap();
  function prepareContacts(ball,players,touch){let context=contactContexts.get(ball);if(!context){context={players,touch,seen:new Set()};contactContexts.set(ball,context);}context.players=players;context.touch=touch;context.seen.clear();}
  const CONFIG = Object.freeze({maxSpeed:physics.ballMaxSpeed,friction:physics.ballFriction,wallBounce:physics.wallRestitution,postRadius:physics.postRadius,postBounce:physics.postRestitution});
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  // Exact integration of dv/dt = -drag*v - rollingResistance along motion.
  // One model supplies simulation, pass timing and trajectory prediction.
  function rolling(speed,dt,friction=CONFIG.friction){
    if(speed<=0)return {speed:0,distance:0};
    const drag=-Math.log(friction),offset=physics.ballRollingResistance/drag;
    const stop=Math.log1p(speed/offset)/drag,t=Math.min(dt,stop),decay=Math.exp(-drag*t);
    return {speed:dt>=stop?0:Math.max(0,(speed+offset)*decay-offset),distance:(speed+offset)*(-Math.expm1(-drag*t))/drag-offset*t};
  }

  function collideCircle(body, x, y, radius, bounce) {
    let dx=body.x-x,dy=body.y-y;if(dx*dx+dy*dy>=radius*radius)return 0;let distance=Math.hypot(dx,dy);
    if (distance >= radius) return 0;
    if (distance < 1e-8) {
      const speed = Math.hypot(body.vx, body.vy);
      dx = speed ? -body.vx / speed : 1; dy = speed ? -body.vy / speed : 0; distance = 1;
    }
    const nx = dx / distance, ny = dy / distance;
    body.x = x + nx * radius; body.y = y + ny * radius;
    const velocity = body.vx * nx + body.vy * ny;
    if (velocity < 0) { body.impactVersion=(body.impactVersion||0)+1; body.vx -= (1 + bounce) * velocity * nx; body.vy -= (1 + bounce) * velocity * ny; }
    return Math.max(0, -velocity);
  }

  function crossedGoal(previous, ball, field) {
    const { W, GY0, GY1, BR } = field;
    for (const side of [0, 1]) {
      const line = side ? W + BR : -BR;
      if (side ? previous.x <= line && ball.x > line : previous.x >= line && ball.x < line) {
        const t = (line - previous.x) / (ball.x - previous.x);
        const y = previous.y + (ball.y - previous.y) * t;
        if (y - BR > GY0 && y + BR < GY1) return (side ? 0 : 1)^(field.G?.sidesSwapped&&field.G.phase!=='penalties'?1:0);
      }
    }
    return null;
  }

  function moveBall(state, dt, onGoal = () => {}, onImpact = () => {}, visual=true) {
    const { ball, G, W, H, GY0, GY1, BR } = state;let awarded=false;
    if(ball.sweepStart&&(G.phase==='play'||G.phase==='penalties')){const crossed=crossedGoal(ball.sweepStart,ball,state);if(crossed!==null){awarded=true;onGoal(crossed);if(G.phase==='goal'){ball.vx*=.12;ball.vy*=.12;delete ball.sweepStart;return;}}}delete ball.sweepStart;
    const speed = Math.hypot(ball.vx, ball.vy);
    if (speed > CONFIG.maxSpeed) { ball.vx *= CONFIG.maxSpeed / speed; ball.vy *= CONFIG.maxSpeed / speed; }
    // Substeps limit travel to half a radius, including shots near a post.
    const count = Math.max(1, Math.ceil(Math.hypot(ball.vx, ball.vy) * dt / (BR * .5)));
    const step = dt / count,context=contactContexts.get(ball);
    const candidates=context?.candidates||(context?(context.candidates=[]):null);
    if(candidates){candidates.length=0;const reach=physics.playerRadius+BR+CONFIG.maxSpeed*dt;for(const p of context.players)if(Math.abs(p.x-ball.x)<=reach&&Math.abs(p.y-ball.y)<=reach)candidates.push(p);}
    const notify=context?(context.notify??=(p=>{if(!context.seen.has(p.id)){context.seen.add(p.id);context.touch(p);}})):null;
    const previous={x:0,y:0};
    for (let n = 0; n < count; n++) {
      previous.x=ball.x;previous.y=ball.y;
      const incoming=Math.hypot(ball.vx,ball.vy),roll=rolling(incoming,step,G.phase==='goal'?.12:CONFIG.friction);
      if(incoming){ball.x+=ball.vx/incoming*roll.distance;ball.y+=ball.vy/incoming*roll.distance;ball.vx*=roll.speed/incoming;ball.vy*=roll.speed/incoming;}
      if(roll.speed===0)ball.vx=ball.vy=0;
      if (ball.y < BR || ball.y > H - BR) {
        const approaching=ball.y<BR?ball.vy<0:ball.vy>0;
        ball.y = clamp(ball.y, BR, H - BR);
        if(approaching){ball.vy *= -CONFIG.wallBounce; ball.impactVersion=(ball.impactVersion||0)+1; onImpact(Math.abs(ball.vy));}
      }
      const mouth = ball.y > GY0 && ball.y < GY1;
      if (!mouth && G.phase!=='goal' && previous.x>=0 && previous.x<=W && (ball.x < BR || ball.x > W - BR)) {
        const approaching=ball.x<BR?ball.vx<0:ball.vx>0;
        ball.x = clamp(ball.x, BR, W - BR);
        if(approaching){ball.vx *= -CONFIG.wallBounce; ball.impactVersion=(ball.impactVersion||0)+1; onImpact(Math.abs(ball.vx));}
      }
      if(G.phase!=='goal')for (const x of [0, W]) for (const y of [GY0, GY1]) {
        const impact = collideCircle(ball, x, y, BR + CONFIG.postRadius, CONFIG.postBounce);
        if (impact) onImpact(impact);
      }
      if(!awarded&&(G.phase==='play'||G.phase==='penalties')){const scored=crossedGoal(previous,ball,state);if(scored!==null){awarded=true;onGoal(scored);if(G.phase==='goal'){rotation.roll(ball,ball.x-previous.x,ball.y-previous.y,BR);ball.vx*=.12;ball.vy*=.12;return;}}}
      if(visual)rotation.roll(ball,ball.x-previous.x,ball.y-previous.y,BR);
      // Resolve only approaching relative velocity: an already separating contact
      // receives no second impulse, regardless of the number of substeps.
      if(candidates?.length&&(G.phase==='play'||G.phase==='penalties')&&contacts.resolveContacts(candidates,ball,BR,0,notify,state)){
       for(const x of [0,W])for(const y of [GY0,GY1]){const impact=collideCircle(ball,x,y,BR+CONFIG.postRadius,CONFIG.postBounce);if(impact)onImpact(impact);}
      }
      if (!awarded&&(G.phase === 'play'||G.phase==='penalties')) {
        const team = crossedGoal(previous, ball, state);
        if (team !== null) {awarded=true;onGoal(team);if(G.phase==='goal'){ball.vx*=.12;ball.vy*=.12;return;}}
      }
      if (ball.x < 0 || ball.x > W) {
        const netY=clamp(ball.y,GY0+BR,GY1-BR);if(netY!==ball.y)ball.vy=0;ball.y=netY;
        const back = 46 - BR - 3;
        if (ball.x < -back || ball.x > W + back) {
          ball.x = clamp(ball.x, -back, W + back); ball.vx = 0; ball.vy *= .35;
        }
      }
    }
    ball.rot=(ball.rot||0)+Math.hypot(ball.vx,ball.vy)*dt/BR;
  }
  function predictTrajectory(state,seconds,out={},visual=true){
    const {ball,W,H,GY0,GY1,BR}=state;Object.assign(out,{x:ball.x,y:ball.y,vx:ball.vx,vy:ball.vy,rollX:ball.rollX||0,rollY:ball.rollY||0,qx:ball.qx||0,qy:ball.qy||0,qz:ball.qz||0,qw:ball.qw??1});
    const count=Math.max(1,Math.ceil(seconds*60)),dt=seconds/count;
    const predicted={ball:out,W,H,GY0,GY1,BR,G:{phase:state.G?.phase==='goal'?'goal':'play'}};
    for(let i=0;i<count;i++)moveBall(predicted,dt,()=>{},()=>{},visual);
    return out;
  }
  const passSpeed=distance=>Math.max(physics.passMinSpeed,Math.min(physics.passMaxSpeed,physics.passArrivalSpeed-Math.log(physics.ballFriction)*Math.max(0,distance)));
  // Active actions are a regulated external impulse, separate from passive
  // two-body collisions. Incoming normal/tangent momentum remains bounded.
  function kickBall(ball,nx,ny,power){
    const length=Math.hypot(nx,ny);if(length<1e-8)return false;nx/=length;ny/=length;
    const normal=ball.vx*nx+ball.vy*ny,tangent=-ball.vx*ny+ball.vy*nx;
    const outgoing=power+clamp(normal*physics.kickMomentum,-power*physics.kickMomentum,power*physics.kickMomentum);
    const side=clamp(tangent*physics.kickTangentRetention,-power*physics.kickTangentLimit,power*physics.kickTangentLimit);
    const jn=physics.ballMass*(outgoing-normal),jt=physics.ballMass*(side-tangent);
    ball.vx+=(jn*nx-jt*ny)/physics.ballMass;ball.vy+=(jn*ny+jt*nx)/physics.ballMass;
    const speed=Math.hypot(ball.vx,ball.vy);if(speed>CONFIG.maxSpeed){ball.vx*=CONFIG.maxSpeed/speed;ball.vy*=CONFIG.maxSpeed/speed;}
    return true;
  }
  function travelTime(distance,speed){
    if(distance<=0)return 0;
    const drag=-Math.log(CONFIG.friction),resistance=physics.ballRollingResistance,offset=resistance/drag;
    const stop=Math.log(1+speed/offset)/drag;
    const travelled=t=>(speed+offset)*(1-Math.exp(-drag*t))/drag-offset*t;
    if(travelled(stop)<distance)return Infinity;
    let low=0,high=stop;for(let i=0;i<24;i++){const mid=(low+high)/2;if(travelled(mid)<distance)low=mid;else high=mid;}
    return (low+high)/2;
  }
  const api = { CONFIG, rolling, passSpeed, kickBall, travelTime, collideCircle, crossedGoal, moveBall, prepareContacts, predictTrajectory };
  if (typeof module !== 'undefined') module.exports = api;
  else root.MaxballBall = Object.freeze(api);
})(globalThis);
