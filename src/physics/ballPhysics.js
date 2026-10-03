(function (root) {
  'use strict';
  const physics=(typeof module!=='undefined'?require('../core/config.js'):root.MaxballConfig).physics;
  const contacts=typeof module!=='undefined'?require('./contacts.js'):root.MaxballContacts;
  const contactContexts=new WeakMap();
  function prepareContacts(ball,players,touch){let context=contactContexts.get(ball);if(!context){context={players,touch,seen:new Set()};contactContexts.set(ball,context);}context.players=players;context.touch=touch;context.seen.clear();}
  const CONFIG = Object.freeze({maxSpeed:physics.ballMaxSpeed,friction:physics.ballFriction,wallBounce:physics.wallRestitution,postRadius:physics.postRadius,postBounce:physics.postRestitution});
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

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
    if (velocity < 0) { body.vx -= (1 + bounce) * velocity * nx; body.vy -= (1 + bounce) * velocity * ny; }
    return Math.max(0, -velocity);
  }

  function crossedGoal(previous, ball, field) {
    const { W, GY0, GY1, BR } = field;
    for (const side of [0, 1]) {
      const line = side ? W + BR : -BR;
      if (side ? previous.x <= line && ball.x > line : previous.x >= line && ball.x < line) {
        const t = (line - previous.x) / (ball.x - previous.x);
        const y = previous.y + (ball.y - previous.y) * t;
        if (y - BR > GY0 + CONFIG.postRadius && y + BR < GY1 - CONFIG.postRadius) return side ? 0 : 1;
      }
    }
    return null;
  }

  function moveBall(state, dt, onGoal = () => {}, onImpact = () => {}) {
    const { ball, G, W, H, GY0, GY1, BR } = state;
    if(ball.sweepStart&&(G.phase==='play'||G.phase==='penalties')){const crossed=crossedGoal(ball.sweepStart,ball,state);if(crossed!==null)onGoal(crossed);}delete ball.sweepStart;
    const speed = Math.hypot(ball.vx, ball.vy);
    if (speed > CONFIG.maxSpeed) { ball.vx *= CONFIG.maxSpeed / speed; ball.vy *= CONFIG.maxSpeed / speed; }
    // Substeps limit travel to half a radius, including shots near a post.
    const count = Math.max(1, Math.ceil(Math.hypot(ball.vx, ball.vy) * dt / (BR * .5)));
    const step = dt / count,context=contactContexts.get(ball);
    const candidates=context?.candidates||(context?(context.candidates=[]):null);
    if(candidates){candidates.length=0;const reach=physics.playerRadius+BR+CONFIG.maxSpeed*dt;for(const p of context.players)if(Math.abs(p.x-ball.x)<=reach&&Math.abs(p.y-ball.y)<=reach)candidates.push(p);}
    const notify=context?(context.notify??=(p=>{if(!context.seen.has(p.id)){context.seen.add(p.id);context.touch(p);}})):null;
    for (let n = 0; n < count; n++) {
      const previous = { x: ball.x, y: ball.y };
      ball.x += ball.vx * step; ball.y += ball.vy * step;
      if (ball.y < BR || ball.y > H - BR) {
        ball.y = clamp(ball.y, BR, H - BR); ball.vy *= -CONFIG.wallBounce; onImpact(Math.abs(ball.vy));
      }
      const mouth = ball.y > GY0 + CONFIG.postRadius + BR && ball.y < GY1 - CONFIG.postRadius - BR;
      if (!mouth && (ball.x < BR || ball.x > W - BR)) {
        ball.x = clamp(ball.x, BR, W - BR); ball.vx *= -CONFIG.wallBounce; onImpact(Math.abs(ball.vx));
      }
      for (const x of [0, W]) for (const y of [GY0, GY1]) {
        const impact = collideCircle(ball, x, y, BR + CONFIG.postRadius, CONFIG.postBounce);
        if (impact) onImpact(impact);
      }
      if(candidates?.length&&(G.phase==='play'||G.phase==='penalties')&&contacts.resolveContacts(candidates,ball,BR,step,notify,state)){
       for(const x of [0,W])for(const y of [GY0,GY1]){const impact=collideCircle(ball,x,y,BR+CONFIG.postRadius,CONFIG.postBounce);if(impact)onImpact(impact);}
      }
      const dx=ball.x-previous.x,dy=ball.y-previous.y;
      ball.rollX=(ball.rollX||0)+dy/BR;ball.rollY=(ball.rollY||0)-dx/BR;
      if ((G.phase === 'play'||G.phase==='penalties')) {
        const team = crossedGoal(previous, ball, state);
        if (team !== null) onGoal(team);
      }
      if (ball.x < 0 || ball.x > W) {
        ball.y = clamp(ball.y, GY0 + BR, GY1 - BR);
        const back = 46 - BR - 3;
        if (ball.x < -back || ball.x > W + back) {
          ball.x = clamp(ball.x, -back, W + back); ball.vx *= -.2;
        }
      }
    }
    const friction = Math.pow(CONFIG.friction, dt);
    ball.vx *= friction; ball.vy *= friction;
    if (Math.hypot(ball.vx, ball.vy) < 45) { const slow = Math.pow(physics.ballDamping, dt); ball.vx *= slow; ball.vy *= slow; }
    if(Math.hypot(ball.vx,ball.vy)<.5)ball.vx=ball.vy=0;
    ball.rot=(ball.rot||0)+Math.hypot(ball.vx,ball.vy)*dt/BR;
  }
  function predictTrajectory(state,seconds,out={}){
    const {ball,W,H,GY0,GY1,BR}=state;Object.assign(out,{x:ball.x,y:ball.y,vx:ball.vx,vy:ball.vy,rollX:ball.rollX||0,rollY:ball.rollY||0});
    const count=Math.max(1,Math.ceil(seconds/.04)),dt=seconds/count,decay=Math.pow(CONFIG.friction,dt);
    for(let i=0;i<count;i++){
      const previousX=out.x,previousY=out.y;out.x+=out.vx*dt;out.y+=out.vy*dt;
      if(out.y<BR||out.y>H-BR){out.y=clamp(out.y,BR,H-BR);out.vy*=-CONFIG.wallBounce;}
      const mouth=out.y>GY0+BR+CONFIG.postRadius&&out.y<GY1-BR-CONFIG.postRadius;
      if(!mouth&&(out.x<BR||out.x>W-BR)){out.x=clamp(out.x,BR,W-BR);out.vx*=-CONFIG.wallBounce;}
      for(const x of [0,W])for(const y of [GY0,GY1])collideCircle(out,x,y,BR+CONFIG.postRadius,CONFIG.postBounce);
      out.x=clamp(out.x,-46+BR,W+46-BR);out.rollX+=(out.y-previousY)/BR;out.rollY-=(out.x-previousX)/BR;out.vx*=decay;out.vy*=decay;
    }
    return out;
  }
  const api = { CONFIG, collideCircle, crossedGoal, moveBall, prepareContacts, predictTrajectory };
  if (typeof module !== 'undefined') module.exports = api;
  else root.MaxballBall = Object.freeze(api);
})(globalThis);
