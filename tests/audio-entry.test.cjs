const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {Match}=require('../server/online/match.cjs');
test('teams cross the touchline through the tunnel before spreading across the pitch',()=>{
 for(const cfg of [{},{career:true},{final:true}]){
  const m=new Match({id:'entry-route',cfg:{...cfg,n:5,presentation:true}});let entered=false;
  while(m.G.phase==='starting'){
   m.update(1/60);if(m.G.startStage!=='ENTRY')continue;entered=true;
   for(const p of m.P){if(p.y>m.H)assert.ok(Math.abs(p.x-m.W/2)<=31,'outside players remain within tunnel width');if(Math.abs(p.x-m.W/2)>31)assert.ok(p.y<m.H-20,'spread only after crossing into field');}
  }assert.ok(entered);
 }
});
test('audio shares a context, separates music/effects, and suspends for native background',()=>{
 const listeners={},docListeners={},scheduled=new Map();let created=0,starts=0,id=0,ctx;
 const param=()=>({value:0,setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;},exponentialRampToValueAtTime(v){this.value=v;},setTargetAtTime(v){this.value=v;}});
 const node=()=>({gain:param(),frequency:param(),Q:param(),connect(){return this;},disconnect(){},start(){starts++;},stop(){}});
 class AudioContext{constructor(){created++;ctx=this;this.state='suspended';this.currentTime=1;this.sampleRate=8000;this.destination={};}resume(){this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}createGain(){return node();}createOscillator(){return node();}createBiquadFilter(){return node();}createBufferSource(){return node();}createBuffer(){return {getChannelData:()=>new Float32Array(3200)};}}
 const prefs={music:true,sound:true},document={hidden:false,querySelector:()=>null,addEventListener:(type,fn)=>docListeners[type]=fn};
 const env={AudioContext,document,MaxballPreferences:{get:()=>prefs},addEventListener:(type,fn)=>listeners[type]=fn,setInterval:fn=>{scheduled.set(++id,fn);return id;},clearInterval:id=>scheduled.delete(id)};
 vm.runInNewContext(fs.readFileSync('src/audio/soundtrack.js','utf8'),env);assert.equal(created,0);
 docListeners.pointerdown();docListeners.pointerdown();assert.equal(created,1);assert.equal(scheduled.size,1);
 [...scheduled.values()][0]();assert.ok(starts>0);const before=starts;
 prefs.music=false;listeners['maxball-preferences']();ctx.currentTime+=1;[...scheduled.values()][0]();assert.equal(starts,before);
 for(const effect of ['kick','net','click'])env.MaxballAudio.effect(effect);assert.ok(starts>before);
 const beforeReplay=starts;env.MaxballAudio.setReplay(true);ctx.currentTime+=1;env.MaxballAudio.effect('net');env.MaxballAudio.effect('kick');assert.equal(starts,beforeReplay);env.MaxballAudio.effect('click');assert.ok(starts>beforeReplay);env.MaxballAudio.setReplay(false);ctx.currentTime+=1;env.MaxballAudio.effect('net');assert.ok(starts>beforeReplay+1);
 prefs.sound=false;listeners['maxball-preferences']();const muted=starts;ctx.currentTime+=1;env.MaxballAudio.effect('kick');assert.equal(starts,muted);
 listeners['maxball:native-pause']();assert.equal(ctx.state,'suspended');assert.equal(scheduled.size,0);
 listeners['maxball:native-resume']();assert.equal(ctx.state,'running');assert.equal(scheduled.size,1);
 document.hidden=true;docListeners.visibilitychange();assert.equal(ctx.state,'suspended');assert.equal(scheduled.size,0);
});
