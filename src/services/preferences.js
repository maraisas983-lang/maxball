(function(root){
 'use strict';
 const defaults={music:true,sound:true,graphics:'auto',fps:60,effects:true,joystick:'fixed'},key='maxball.preferences.v1';
 function normalize(v={}){return {joystick:['fixed','floating','follow','off'].includes(v.joystick)?v.joystick:'fixed',music:typeof v.music==='boolean'?v.music:true,sound:typeof v.sound==='boolean'?v.sound:true,graphics:['auto','low','medium','high'].includes(v.graphics)?v.graphics:'auto',fps:[30,60,90,120].includes(v.fps)?v.fps:60,effects:typeof v.effects==='boolean'?v.effects:true};}
 let value;try{value=normalize(JSON.parse(root.localStorage.getItem(key)||'{}'));}catch{value={...defaults};}
 value=Object.freeze(value);
 const levels=['low','medium','high'],memory=root.navigator?.deviceMemory,cores=root.navigator?.hardwareConcurrency;
 const mobile=!!root.matchMedia?.('(pointer:coarse)').matches||/Android|iPhone|iPad/i.test(root.navigator?.userAgent||'');
 let level=memory<=2||cores<=2?0:mobile||memory<=4||cores<=4?1:2,lastChange=-12000,windowStart=0,samples=0,slow=0,total=0,refresh=1000/60;
 const quality=()=>value.graphics==='auto'?levels[level]:value.graphics;
 function observe(now,rafMs,cpuMs){if(value.graphics!=='auto')return;if(rafMs>0&&rafMs<40)refresh=Math.min(refresh,rafMs);if(!windowStart){windowStart=now;return;}const budget=Math.max(refresh,1000/value.fps);samples++;total+=cpuMs;if(rafMs>budget*1.45||cpuMs>budget*.85)slow++;if(now-windowStart<(mobile?2000:4000))return;
  if(samples>=(mobile?10:60)&&now-lastChange>=(mobile?6000:12000)){let next=level;if(slow/samples>.18&&level>0)next--;else if(slow/samples<.02&&total/samples<budget*.4&&level<2&&now-lastChange>=30000)next++;if(next!==level){level=next;lastChange=now;root.dispatchEvent?.(new Event('maxball-quality'));}}windowStart=now;samples=slow=total=0;
 }
 const api={get:()=>value,normalize,quality,observe,limits:()=>({low:160,medium:320,high:640}[quality()]),idle(){windowStart=0;samples=slow=total=0;},save(next){value=Object.freeze(normalize({...value,...next}));try{root.localStorage.setItem(key,JSON.stringify(value));}catch{}root.dispatchEvent?.(new Event('maxball-preferences'));return value;},pixelRatio:()=>Math.min(mobile&&value.graphics==='auto'?1.5:2,quality()==='low'?1:quality()==='medium'?1.5:2,root.devicePixelRatio||1)};
 if(typeof module!=='undefined')module.exports=api;else root.MaxballPreferences=api;
})(globalThis);
