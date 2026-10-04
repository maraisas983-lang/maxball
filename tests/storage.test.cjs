const test = require('node:test');
const assert = require('node:assert/strict');
const { storageApi, memoryStorage, plain } = require('./helpers.cjs');
const api = storageApi();
const options = storage => ({ getStorage: () => storage, kitCount: 22, effectCount: 4, random: () => .25 });

test('new profile persists completely without free gems', () => {
  const storage = memoryStorage();
  const first = api.createLocalSaveRepository(options(storage)).load();
  assert.equal(first.coins, 0);
  const second = api.createLocalSaveRepository(options(storage)).load();
  assert.deepEqual(plain(second), plain(first));
  assert.ok(second.fid); assert.ok(second.name); assert.equal(second.st.p, 0);
});
test('v2 preserves balance, ownership, profile, room and controls', () => {
  const value = { v: 2, coins: 317, k: [0,1,8,12], f: [0,2], kit: 8, fx: 2, num: 99, name: 'POGGI', fid: 'MAX-AB12', st: {p: 8,w: 3,g: 15}, fr: ['Ana'], ctl: {j:{x:.2,y:.8,s:1.4},s:{x:.85,y:.7,s:1.2},p:{x:.7,y:.8,s:.9},op:.7}, zoom: 120, ns: true, room:{n:4,time:60,gold:1,diff:2,fs:2,side:1,sk0:8,sk1:12,ball:2} };
  const raw = JSON.stringify(value), storage = memoryStorage(raw);
  const result = api.createLocalSaveRepository(options(storage)).load();
  for (const key of Object.keys(value)) assert.deepEqual(plain(result[key]), value[key], key);
  assert.equal(storage.getItem('maxball.backup'), raw);
});
test('old version migration preserves paid cosmetics and original backup', () => {
  const raw = JSON.stringify({v:1,coins:30,k:[0,1,6],kit:6,f:[0,3],fx:3});
  const storage = memoryStorage(raw);
  const result = api.createLocalSaveRepository(options(storage)).load();
  assert.equal(result.coins,30); assert.equal(result.kit,6); assert.equal(result.fx,3);
  api.createLocalSaveRepository(options(storage)).load();
  assert.equal(JSON.parse(storage.getItem('maxball')).coins,30);
  assert.equal(storage.getItem('maxball.backup'),raw);
});
test('invalid nested fields recover without indexing outside catalogs', () => {
  const result = api.normalizeSave({v:2,coins:-2,k:null,f:[99,'2'],kit:999,fx:99,num:100,ctl:{j:{x:Infinity,s:0}},st:{p:'8',g:-1},room:{n:100,fs:-1,sk0:999,time:7},name:'<img onerror=x>',fr:[null,4,'Ana']},22,4,()=>.25);
  assert.equal(result.coins,0); assert.deepEqual(plain(result.k),[0,1]); assert.equal(result.kit,0);
  assert.equal(result.ctl.j.x,.13); assert.equal(result.room.n,2); assert.equal(result.room.sk0,0);
  assert.equal(result.st.p,0); assert.equal(result.num,10); assert.equal(result.name,'Jogador3250');
  assert.deepEqual(plain(result.fr),['Ana']);
});
for (const raw of ['{invalid', 'null', '[]', 'true']) test('corrupted save is backed up: '+raw, () => {
  const storage=memoryStorage(raw), issues=[];
  const result=api.createLocalSaveRepository({...options(storage),onError:code=>issues.push(code)}).load();
  assert.equal(result.v,2); assert.equal(storage.getItem('maxball.backup'),raw); assert.ok(issues.includes('invalid'));
});
test('future version is never overwritten or rewarded as a migration', () => {
  const raw=JSON.stringify({v:3,coins:81,k:[0,1,4]}), storage=memoryStorage(raw),issues=[];
  const repository=api.createLocalSaveRepository({...options(storage),onError:code=>issues.push(code)});
  const result=repository.load(); assert.equal(result.coins,81);
  result.coins=0; assert.equal(repository.save(result),false); assert.equal(storage.getItem('maxball'),raw);
  assert.deepEqual(issues,['future']);
});
test('denied storage falls back to session memory with an explicit error', () => {
  const issues=[], repository=api.createLocalSaveRepository({...options(null),getStorage(){throw new Error('Denied')},onError:code=>issues.push(code)});
  assert.equal(repository.load().v,2); assert.equal(repository.save({}),false); assert.deepEqual(issues,['read']);
});
test('failed backup blocks overwrite of the existing save', () => {
  const raw='{"v":1,"coins":32}',storage=memoryStorage(raw),issues=[];
  storage.setItem=()=>{throw new Error('Quota')};
  const repository=api.createLocalSaveRepository({...options(storage),onError:code=>issues.push(code)});
  repository.load(); assert.equal(repository.save({}),false); assert.equal(storage.getItem('maxball'),raw); assert.deepEqual(issues,['backup']);
});
test('failed writes report failure and keep the last saved data', () => {
  const storage=memoryStorage(),issues=[];
  const repository=api.createLocalSaveRepository({...options(storage),onError:code=>issues.push(code)}),state=repository.load();
  const previous=storage.getItem('maxball'); storage.setItem=()=>{throw new Error('Quota')}; state.coins=0;
  assert.equal(repository.save(state),false); assert.equal(storage.getItem('maxball'),previous); assert.deepEqual(issues,['write']);
});
test('defaults are independent and unsafe prototype properties do not propagate', () => {
  const source=JSON.parse('{"__proto__":{"polluted":true},"constructor":{},"v":2}');
  const a=api.normalizeSave(source,22,4),b=api.normalizeSave({},22,4);
  a.ctl.j.x=.5; assert.equal(b.ctl.j.x,.13); assert.equal(a.polluted,undefined); assert.equal(Object.hasOwn(a,'constructor'),false);
});
