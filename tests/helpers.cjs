const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
function memoryStorage(value) {
  const data = new Map(value === undefined ? [] : [['maxball', value]]);
  return { data, getItem: key => data.has(key) ? data.get(key) : null, setItem: (key, value) => data.set(key, String(value)) };
}
function storageApi() {
  const context = vm.createContext({});
  vm.runInContext(read('src/input/keyboardBindings.js'), context);
  vm.runInContext(read('src/services/localSaveRepository.js'), context);
  return context.MaxballStorage;
}
class Target {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(fn);
  }
  removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn); }
  dispatch(type, event = {}) { for (const fn of this.listeners.get(type) || []) fn(event); }
}
class Element extends Target {
  constructor(tag = 'div', id = '') {
    super(); this.tagName = tag.toUpperCase(); this.id = id; this.style = {}; this.children = [];
    this.dataset = {}; this.value = ''; this._html = ''; this.textContent = ''; this.width = 1000; this.height = 560;
    this.clientWidth = 1000; this.clientHeight = 560; this.offsetWidth = 100; this.captures = new Set();
    const classes = new Set();
    this.classList = { add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x), toggle: (x, on = !classes.has(x)) => on ? classes.add(x) : classes.delete(x) };
  }
  set innerHTML(value) { this._html = value; this.children = []; }
  get innerHTML() { return this._html; }
  append(...children) { for (const child of children) { child.parent = this; this.children.push(child); } }
  get firstElementChild() { return this.children[0] || null; }
  get firstChild() { return this.children[0] || null; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(x => x !== this); }
  getBoundingClientRect() { return { left: 0, top: 0, width: 1000, height: 560 }; }
  setPointerCapture(id) { this.captures.add(id); }
  hasPointerCapture(id) { return this.captures.has(id); }
  closest(selector) { return selector === '[data-go]' && this.dataset.go ? this : null; }
  getContext() {
    const gradient = { addColorStop() {} };
    return new Proxy({ measureText: text => ({ width: String(text).length * 8 }), createLinearGradient: () => gradient, createRadialGradient: () => gradient }, {
      get: (target, key) => key in target ? target[key] : () => {}, set: (target, key, value) => (target[key] = value, true)
    });
  }
}
function gameHarness({ original = false, saved } = {}) {
  const html = read(original ? 'maxball-codigo-6 (1).txt' : 'index.html');
  const elements = new Map();
  for (const match of html.matchAll(/<([\w]+)\b[^>]*\bid="([^"]+)"[^>]*>/g)) elements.set(match[2], new Element(match[1], match[2]));
  const document = new Target();
  const screens = [...html.matchAll(/<section class="scr(?: on)?" id="([^"]+)"/g)].map(x => elements.get(x[1]));
  const emoji = ['👏', '🔥', '😂', '👍'].map(text => Object.assign(new Element('button'), { textContent: text }));
  for (const id of ['ljoy', 'ej']) elements.get(id).append(new Element());
  elements.get('home').classList.add('on');
  document.querySelector = selector => {
    if (!/^#[\w-]+$/.test(selector) || !elements.has(selector.slice(1))) throw new Error('Unknown selector: ' + selector);
    return elements.get(selector.slice(1));
  };
  document.querySelectorAll = selector => {
    if (selector === '.scr') return screens;
    if (selector === '.coins') return [elements.get('c0'), elements.get('c1')];
    if (selector === '.emo button') return emoji;
    throw new Error('Unknown selector: ' + selector);
  };
  document.createElement = tag => new Element(tag);
  document.createTextNode = text => ({ textContent: text });
  const target = new Target();
  const storage = memoryStorage(saved);
  const callbacks = new Map(); const frames = []; const errors = []; const warnings = [];
  let timerId = 0, seed = 12345;
  const math = Object.create(Math);
  math.random = () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646;
  const context = vm.createContext({
    document, localStorage: storage, Math: math, performance:{now:()=>0}, innerWidth: 1000, innerHeight: 560, devicePixelRatio: 1,
    matchMedia: () => ({ matches: false }),
    navigator: { clipboard: { writeText: async () => {} } }, location: { href: 'http://localhost/' },
    console: { warn: message => warnings.push(message), error: error => errors.push(error) },
    addEventListener: target.addEventListener.bind(target), removeEventListener: target.removeEventListener.bind(target),
    requestAnimationFrame: fn => frames.push(fn),
    setTimeout: fn => { callbacks.set(++timerId, fn); return timerId; }, clearTimeout: id => callbacks.delete(id)
  });
  context.window = context;
  // Test-only access inside the legacy closure; no debug API is shipped in the game.
  const probe = `globalThis.gameProbe = {
    start, show, update, draw, kick, moveBall, kickoff, endMatch, lockStart, lkStep, lkDraw, netUpd,
    ${original?'':'drawWithReplay, goalReplay, replaySkip, replayCredits, inputOf, remoteRender, get controls(){return window.MaxballGame;},'}
    get state(){return {G,P,ball,save,keys,tj,tb,ljs,inv,NET,LK,W,H,GY0,GY1,BR};}
  };`;
  if (original) vm.runInContext(html.match(/<script>\r?\n([\s\S]*?)<\/script>/)[1] + '\n' + probe, context);
  else {
    const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(x => x[1]).filter(file=>!file.startsWith('src/ui/')||file.endsWith('/ballVisual.js')||file.endsWith('/goalReplay.js'));
    for (const file of scripts) {
      const source = read(file);
      vm.runInContext(file.endsWith('/game.js') ? source.replace(/\n\}\)\(\);\s*$/, '\n' + probe + '\n})();') : source, context, { filename: file });
    }
  }
  return { api: context.gameProbe, elements, storage, document, target, callbacks, frames, errors, warnings };
}
module.exports = { read, plain, memoryStorage, storageApi, Target, Element, gameHarness };
