const test = require('node:test');
const assert = require('node:assert/strict');
const { read, plain, gameHarness } = require('./helpers.cjs');
const stableSave=JSON.stringify({v:2,coins:200,k:[0,1,4],f:[0,1],kit:4,fx:1,num:10,name:'POGGI',fid:'MAX-TEST',st:{p:0,w:0,g:0},fr:[]});

test('legacy CSS and screens remain available alongside the new home and HUD', () => {
 const original=read('maxball-codigo-6 (1).txt'),current=read('index.html');
 assert.equal(read('styles/game.css'),original.match(/<style>\r?\n([\s\S]*?)<\/style>/)[1]);
 for(const [,id] of original.matchAll(/<section class="scr(?: on)?" id="([^"]+)"/g))assert.ok(current.includes('id="'+id+'"'),id);
 for(const id of ['home-avatar','home-xp','versus','penalty-hud','match-notice'])assert.ok(current.includes('id="'+id+'"'));
});
test('movement responds promptly at a calmer speed and stops without diagonal boost',()=>{
 const before=gameHarness({original:true,saved:stableSave}),after=gameHarness({saved:stableSave});
 for(const h of [before,after]){h.api.start('train');h.api.state.P[0].x=150;h.api.state.P[0].y=100;h.api.state.keys.KeyD=1;for(let i=0;i<6;i++)h.api.update(1/60);}
 assert.ok(after.api.state.P[0].vx/160>before.api.state.P[0].vx/205);
 for(const h of [before,after]){h.api.state.keys.KeyD=0;for(let i=0;i<30;i++)h.api.update(1/60);}
 assert.ok(after.api.state.P[0].vx<before.api.state.P[0].vx/10);
 after.api.state.keys.KeyD=after.api.state.keys.KeyS=1;for(let i=0;i<30;i++)after.api.update(1/60);
 assert.ok(Math.hypot(after.api.state.P[0].vx,after.api.state.P[0].vy)<=160.001);
 assert.equal(after.errors.length,0);
});
test('all team sizes and field sizes start, simulate and render with finite coordinates',()=>{
  const h=gameHarness({saved:stableSave});
  for(let n=1;n<=4;n++)for(let fs=0;fs<=2;fs++) {
    h.api.start('bot',{n,fs,side:2,diff:2});
    for(let frame=0;frame<120;frame++)h.api.update(1/60);
    h.api.draw();
    assert.equal(h.api.state.P.length,n*2);
    for(const body of [...h.api.state.P,h.api.state.ball])for(const key of ['x','y','vx','vy'])assert.ok(Number.isFinite(body[key]),`${n}v${n} fs=${fs} ${key}`);
  }
});
test('valid central goal rewards once through normal lifecycle and restarts play',()=>{
  const h=gameHarness({saved:stableSave});h.api.start('bot');
  const s=h.api.state;s.ball.x=s.W+s.BR-1;s.ball.y=s.H/2;s.ball.vx=100;
  h.api.moveBall(1/30);assert.deepEqual(plain(s.G.score),[1,0]);assert.equal(s.G.phase,'goal');assert.equal(s.save.coins,210);
  for(let i=0;i<400;i++)h.api.update(1/60);
  assert.equal(s.G.phase,'play');assert.deepEqual(plain(s.G.score),[1,0]);assert.equal(s.save.coins,210);
  h.api.draw();
});
test('shirt number, profile, friends and local purchases remain usable',()=>{
  const h=gameHarness({saved:stableSave});
  h.api.show('custom');h.elements.get('np').onclick();assert.equal(h.api.state.save.num,11);
  h.api.show('prof');h.elements.get('pnm').value='Ana 10';h.elements.get('psv').onclick();assert.equal(h.api.state.save.name,'Ana 10');
  h.api.show('friends');h.elements.get('fin').value='MAX-AAAA';h.elements.get('fadd').onclick();assert.deepEqual(plain(h.api.state.save.fr),['MAX-AAAA']);
  const {save,inv}=h.api.state;save.coins=90;inv.shop=true;inv.i=2;h.api.show('custom');h.elements.get('peq').onclick();
  assert.equal(save.coins,0);assert.ok(save.k.includes(2));assert.equal(save.kit,2);
  const count=save.k.length;h.elements.get('peq').onclick();assert.equal(save.coins,0);assert.equal(save.k.length,count);
  const persisted=JSON.parse(h.storage.getItem('maxball'));assert.equal(persisted.name,'Ana 10');assert.equal(persisted.num,11);
});
test('partial save no longer crashes room, inventory, controls or match startup',()=>{
  const h=gameHarness({saved:JSON.stringify({v:2,k:null,f:null,kit:400,room:{n:0},ctl:{j:{}},st:null})});
  for(const screen of ['home','prof','friends','custom','room','ctl'])h.api.show(screen);
  h.api.lockStart();h.api.lkDraw();h.api.lkStep(1/60);h.api.lkDraw();
  h.api.start('bot');h.api.update(1/60);h.api.draw();assert.equal(h.errors.length,0);
});
test('original corruption failure is reproduced by the test harness',()=>{
  assert.throws(()=>gameHarness({original:true,saved:JSON.stringify({v:2,ctl:{j:{}}})}));
});
test('player name is inserted as literal text in the room',()=>{
  const h=gameHarness({saved:stableSave}),name='<img src=x onerror=alert(1)>';
  h.api.state.save.name=name;h.api.show('room');
  const nodes=[];function visit(node){nodes.push(node);for(const child of node.children||[])visit(child);}visit(h.elements.get('pA'));
  assert.ok(nodes.some(node=>node.textContent===name+' · #10'));
  assert.ok(nodes.every(node=>!node.innerHTML?.includes(name)));
});
test('match result persists and returning home/restarting works',()=>{
  const h=gameHarness({saved:stableSave});h.api.start('bot');h.api.state.G.score=[2,1];h.api.endMatch();
  assert.equal(h.api.state.save.st.p,1);assert.equal(h.api.state.save.st.w,1);assert.equal(h.api.state.save.coins,220);
  h.elements.get('again').onclick();assert.deepEqual(plain(h.api.state.G.score),[0,0]);
  h.elements.get('exit').onclick();assert.equal(h.api.state.G,null);assert.ok(h.elements.get('home').classList.contains('on'));
});
