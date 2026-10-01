(function (root) {
  'use strict';
  class Net {
    constructor(rows = 15, columns = 5) {
      this.rows = rows; this.columns = columns;
      this.u = new Float64Array(rows * columns); this.v = new Float64Array(rows * columns);
      this.force = new Float64Array(rows * columns); this.sleeping = true; this.inside = false;
    }
    reset() { this.u.fill(0); this.v.fill(0); this.sleeping = true; this.inside = false; }
    impact(position, speed) {
      this.sleeping = false;
      for (let row = 1; row < this.rows - 1; row++) for (let col = 1; col < this.columns; col++) {
        const distance = (row / (this.rows - 1) - position) / .18;
        this.v[row * this.columns + col] += Math.min(560, speed) * .65 * Math.exp(-distance * distance / 2) * col / (this.columns - 1);
      }
    }
    update(dt) {
      if (this.sleeping) return;
      const count = Math.max(1, Math.ceil(dt / (1 / 120))), step = dt / count;
      let energy = 0;
      for (let sub = 0; sub < count; sub++) {
        energy = 0;
        for (let r = 1; r < this.rows - 1; r++) for (let c = 1; c < this.columns; c++) {
          const i = r * this.columns + c, u = this.u[i];
          const neighbors = this.u[i - this.columns] + this.u[i + this.columns] + this.u[i - 1] + (c < this.columns - 1 ? this.u[i + 1] : u);
          this.force[i] = 140 * (neighbors - 4 * u) - 28 * u;
        }
        for (let i = 0; i < this.u.length; i++) {
          this.v[i] = (this.v[i] + this.force[i] * step) * Math.exp(-5 * step);
          this.u[i] = Math.max(-12, Math.min(36, this.u[i] + this.v[i] * step));
          if (Math.abs(this.u[i]) >= 36) this.v[i] = Math.min(0, this.v[i]);
          energy += Math.abs(this.u[i]) + Math.abs(this.v[i]);
        }
      }
      if (energy < .02) this.reset();
    }
    sample(y, depth) {
      const r = Math.max(0, Math.min(this.rows - 1.001, y * (this.rows - 1)));
      const c = Math.max(0, Math.min(this.columns - 1.001, depth * (this.columns - 1)));
      const ri = Math.floor(r), ci = Math.floor(c), a = r - ri, b = c - ci, i = ri * this.columns + ci;
      return this.u[i] * (1-a)*(1-b) + this.u[i+1]*(1-a)*b + this.u[i+this.columns]*a*(1-b) + this.u[i+this.columns+1]*a*b;
    }
  }
  if (typeof module !== 'undefined') module.exports = { Net };
  else root.MaxballNet = Object.freeze({ Net });
})(globalThis);
