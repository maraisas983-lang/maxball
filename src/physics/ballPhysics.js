(function (root) {
  'use strict';
  const CONFIG = Object.freeze({ maxSpeed: 560, friction: .46, wallBounce: .92, postRadius: 6, postBounce: .7 });
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function collideCircle(body, x, y, radius, bounce) {
    let dx = body.x - x, dy = body.y - y, distance = Math.hypot(dx, dy);
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
    const speed = Math.hypot(ball.vx, ball.vy);
    if (speed > CONFIG.maxSpeed) { ball.vx *= CONFIG.maxSpeed / speed; ball.vy *= CONFIG.maxSpeed / speed; }
    // Substeps limit travel to half a radius, including shots near a post.
    const count = Math.max(1, Math.ceil(Math.hypot(ball.vx, ball.vy) * dt / (BR * .5)));
    const step = dt / count;
    for (let n = 0; n < count; n++) {
      const previous = { x: ball.x, y: ball.y };
      ball.x += ball.vx * step; ball.y += ball.vy * step;
      if (ball.y < BR || ball.y > H - BR) {
        ball.y = clamp(ball.y, BR, H - BR); ball.vy *= -CONFIG.wallBounce; onImpact(Math.abs(ball.vy));
      }
      const mouth = ball.y > GY0 && ball.y < GY1;
      if (!mouth && (ball.x < BR || ball.x > W - BR)) {
        ball.x = clamp(ball.x, BR, W - BR); ball.vx *= -CONFIG.wallBounce; onImpact(Math.abs(ball.vx));
      }
      for (const x of [0, W]) for (const y of [GY0, GY1]) {
        const impact = collideCircle(ball, x, y, BR + CONFIG.postRadius, CONFIG.postBounce);
        if (impact) onImpact(impact);
      }
      if (G.phase === 'play') {
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
    if (Math.hypot(ball.vx, ball.vy) < 45) { const slow = Math.pow(.03, dt); ball.vx *= slow; ball.vy *= slow; }
    ball.rot += Math.hypot(ball.vx, ball.vy) * dt * .05;
  }
  const api = { CONFIG, collideCircle, crossedGoal, moveBall };
  if (typeof module !== 'undefined') module.exports = api;
  else root.MaxballBall = Object.freeze(api);
})(globalThis);
