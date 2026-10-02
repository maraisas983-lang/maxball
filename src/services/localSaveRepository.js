(function (root) {
  'use strict';

  const VERSION = 2;
  const KEY = 'maxball';
  const BACKUP_KEY = 'maxball.backup';
  const DEFAULT_CONTROLS = Object.freeze({
    j: Object.freeze({ x: .13, y: .72, s: 1 }),
    s: Object.freeze({ x: .9, y: .78, s: 1 }),
    p: Object.freeze({ x: .78, y: .86, s: 1 }),
    op: .85
  });
  const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const integer = (value, min, max, fallback) =>
    Number.isSafeInteger(value) && value >= min && value <= max ? value : fallback;
  const number = (value, min, max, fallback) =>
    Number.isFinite(value) && value >= min && value <= max ? value : fallback;
  const member = (value, allowed, fallback) => allowed.includes(value) ? value : fallback;
  const owned = (value, count, defaults) => [...new Set([
    ...defaults,
    ...(Array.isArray(value) ? value.filter(i => Number.isInteger(i) && i >= 0 && i < count) : [])
  ])];

  function normalizeSave(value, kitCount, effectCount, random = Math.random) {
    const source = record(value) ? value : {};
    const controls = record(source.ctl) ? source.ctl : {};
    const stats = record(source.st) ? source.st : {};
    const room = record(source.room) ? source.room : {};
    const kits = owned(source.k, kitCount, [0, 1]);
    const effects = owned(source.f, effectCount, [0]);
    const kit = member(source.kit, kits, 0);
    const balance = integer(source.coins, 0, Number.MAX_SAFE_INTEGER, 50);
    // Preserve the original v2 bonus, without removing acquired cosmetics.
    const bonus = source.v === VERSION ? 0 : 150;
    const result = {
      v: VERSION,
      coins: Math.min(Number.MAX_SAFE_INTEGER, balance + bonus),
      k: kits, f: effects, kit,
      fx: member(source.fx, effects, 0),
      num: integer(source.num, 1, 99, 10),
      ctl: { op: number(controls.op, .3, 1, DEFAULT_CONTROLS.op) },
      zoom: number(source.zoom, 60, 160, 100),
      ns: source.ns === true,
      name: typeof source.name === 'string' && /^[\p{L}\p{N} _.-]{3,14}$/u.test(source.name)
        ? source.name : 'Jogador' + Math.floor(1000 + random() * 9000),
      // This is a local display code, never an account ID or authentication token.
      fid: typeof source.fid === 'string' && /^MAX-[A-Z0-9]{4}$/.test(source.fid)
        ? source.fid : 'MAX-' + Math.floor(random() * 1679616).toString(36).padStart(4, '0').toUpperCase(),
      fr: [...new Set((Array.isArray(source.fr) ? source.fr : [])
        .filter(item => typeof item === 'string' && item.trim().length >= 2 && item.length <= 20))].slice(0, 50),
      st: {
        p: integer(stats.p, 0, Number.MAX_SAFE_INTEGER, 0),
        w: integer(stats.w, 0, Number.MAX_SAFE_INTEGER, 0),
        g: integer(stats.g, 0, Number.MAX_SAFE_INTEGER, 0)
      },
      room: {
        n: integer(room.n, 1, 5, 2),
        time: member(room.time, [60, 180, 300, 600], 300),
        gold: member(room.gold, [0, 1], 0),
        diff: integer(room.diff, 0, 2, 1),
        fs: integer(room.fs, 0, 2, 0),
        side: integer(room.side, 0, 2, 0),
        sk0: integer(room.sk0, 0, kitCount - 1, kit),
        sk1: integer(room.sk1, -1, kitCount - 1, -1),
        ball: integer(room.ball, 0, 2, 1)
      }
    };
    for (const key of ['j', 's', 'p']) {
      const control = record(controls[key]) ? controls[key] : {};
      const fallback = DEFAULT_CONTROLS[key];
      result.ctl[key] = {
        x: number(control.x, .06, .94, fallback.x),
        y: number(control.y, .12, .94, fallback.y),
        s: number(control.s, .6, 1.6, fallback.s)
      };
    }
    return result;
  }

  function createLocalSaveRepository({
    getStorage = () => root.localStorage,
    kitCount, effectCount, onError = () => {}, random = Math.random
  }) {
    let storage;
    let writable = false;
    const report = code => onError(code);
    const normalize = value => normalizeSave(value, kitCount, effectCount, random);

    function write(value) {
      if (!writable) return false;
      try {
        storage.setItem(KEY, JSON.stringify(normalize(value)));
        return true;
      } catch (_) {
        report('write');
        return false;
      }
    }

    function load() {
      writable = false;
      let raw;
      try {
        storage = getStorage();
        raw = storage.getItem(KEY);
      } catch (_) {
        report('read');
        return normalize({});
      }
      let parsed = {};
      if (raw !== null) {
        try {
          parsed = JSON.parse(raw);
          if (!record(parsed)) { parsed = {}; report('invalid'); }
        } catch (_) { report('invalid'); }
        // Never downgrade or overwrite a save produced by a future release.
        if (Number.isFinite(parsed.v) && parsed.v > VERSION) {
          report('future');
          return normalize({ ...parsed, v: VERSION });
        }
        try {
          if (storage.getItem(BACKUP_KEY) === null) storage.setItem(BACKUP_KEY, raw);
        } catch (_) {
          report('backup');
          return normalize(parsed);
        }
      }
      writable = true;
      const state = normalize(parsed);
      write(state);
      return state;
    }

    return Object.freeze({ load, save: write });
  }

  root.MaxballStorage = Object.freeze({ DEFAULT_CONTROLS, normalizeSave, createLocalSaveRepository });
})(globalThis);
