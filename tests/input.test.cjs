const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { read, Target, gameHarness, plain } = require('./helpers.cjs');

test('input lifecycle resets on blur/hidden and can remove its listeners', () => {
  const context=vm.createContext({}); vm.runInContext(read('src/input/inputLifecycle.js'),context);
  const target=new Target(),document=new Target();let resets=0;
  const dispose=context.MaxballInput.installInputLifecycle({target,document,reset:()=>resets++});
  target.dispatch('blur'); document.hidden=false; document.dispatch('visibilitychange'); assert.equal(resets,1);
  document.hidden=true;document.dispatch('visibilitychange');assert.equal(resets,2);
  dispose();target.dispatch('blur');document.dispatch('visibilitychange');assert.equal(resets,2);
});
test('real game controls clear on focus loss, screen change and settings', () => {
  const h=gameHarness();h.api.start('train');
  const fill=()=>{const s=h.api.state;s.keys.KeyW=1;s.tb.s=1;s.tj.x=1;s.ljs.y=1;};
  const check=()=>{const s=h.api.state;assert.deepEqual(plain(s.keys),{});assert.equal(s.tb.s,0);assert.equal(s.tj.x,0);assert.equal(s.ljs.y,0);};
  fill();h.target.dispatch('blur');check();fill();h.api.show('home');check();
  fill();h.elements.get('gset').onclick();check();fill();h.elements.get('zok').onclick();check();
});
test('typing and adjusting form fields does not move the player', () => {
  const h=gameHarness();
  for(const tagName of ['INPUT','TEXTAREA','SELECT'])h.target.dispatch('keydown',{code:'KeyW',target:{tagName}});
  h.target.dispatch('keydown',{code:'KeyW',target:{tagName:'DIV',isContentEditable:true}});
  assert.equal(h.api.state.keys.KeyW,undefined);
  h.target.dispatch('keydown',{code:'KeyW',target:{tagName:'BODY'}});assert.equal(h.api.state.keys.KeyW,1);
  h.target.dispatch('keyup',{code:'KeyW'});assert.equal(h.api.state.keys.KeyW,0);
});
