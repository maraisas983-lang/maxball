(function (root) {
  'use strict';
  let listenerTotal=0;
  function createEvents() {
    const listeners = new Map();
    return {
      on(type, listener) {
        if (!listeners.has(type)) listeners.set(type, new Set());
        const set=listeners.get(type);if(!set.has(listener)){set.add(listener);listenerTotal++;}
        return () => {if(set.delete(listener))listenerTotal--;};
      },
      emit(type, payload) { for (const fn of listeners.get(type) || []) fn(payload); },
      clear() { for(const set of listeners.values()){listenerTotal-=set.size;set.clear();}listeners.clear(); }
    };
  }
  function createClock(step, frequency = 60) {
    const dt = 1 / frequency;
    let accumulator = 0;
    return {
      advance(seconds) {
        accumulator += Math.max(0, Math.min(.25, seconds));
        while (accumulator + 1e-10 >= dt) { step(dt); accumulator -= dt; }
      },
      reset() { accumulator = 0; }
    };
  }
  function createTimers(schedule = setTimeout, cancel = clearTimeout) {
    const ids = new Set();
    return {
      after(fn, delay) {
        const id = schedule(() => { ids.delete(id); fn(); }, delay);
        ids.add(id); return id;
      },
      clear() { for (const id of ids) cancel(id); ids.clear(); }
    };
  }
  const api = { createEvents, createClock, createTimers, listenerCount:()=>listenerTotal };
  if (typeof module !== 'undefined') module.exports = api;
  else root.MaxballCore = Object.freeze(api);
})(globalThis);
