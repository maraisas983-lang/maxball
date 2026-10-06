(function(root){
 'use strict';
 const defaults={music:true,sound:true,graphics:'high',fps:60,effects:true,joystick:'fixed'},key='maxball.preferences.v1';
 function normalize(v={}){return {joystick:['fixed','floating','follow','off'].includes(v.joystick)?v.joystick:'fixed',music:typeof v.music==='boolean'?v.music:true,sound:typeof v.sound==='boolean'?v.sound:true,graphics:['low','medium','high'].includes(v.graphics)?v.graphics:'high',fps:[30,60,90,120].includes(v.fps)?v.fps:60,effects:typeof v.effects==='boolean'?v.effects:true};}
 let value;try{value=normalize(JSON.parse(root.localStorage.getItem(key)||'{}'));}catch{value={...defaults};}
 value=Object.freeze(value);
 const api={get:()=>value,normalize,save(next){value=Object.freeze(normalize({...value,...next}));try{root.localStorage.setItem(key,JSON.stringify(value));}catch{}root.dispatchEvent?.(new Event('maxball-preferences'));return value;},pixelRatio:()=>Math.min(value.graphics==='low'?.75:value.graphics==='medium'?1.5:2,root.devicePixelRatio||1)};
 if(typeof module!=='undefined')module.exports=api;else root.MaxballPreferences=api;
})(globalThis);
