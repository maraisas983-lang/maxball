(function(root){
 'use strict';
 const defaults={shoot:['KeyF','Space'],pass:['KeyG','KeyE'],shoot2:['Enter'],pass2:['Slash']},actions=Object.keys(defaults),reserved=new Set(['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyR','KeyT','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Period']);
 function valid(code){return typeof code==='string'&&!reserved.has(code)&&/^(Key[A-Z]|Digit[0-9]|Numpad[0-9]|Space|Enter|NumpadEnter|NumpadAdd|NumpadSubtract|NumpadMultiply|NumpadDivide|NumpadDecimal|Slash|Backslash|Semicolon|Quote|BracketLeft|BracketRight|Comma|Minus|Equal|Backquote|Backspace|Delete|Insert|Home|End|PageUp|PageDown)$/.test(code);}
 function fresh(){return Object.fromEntries(actions.map(a=>[a,[...defaults[a]]]));}
 function normalize(source){const result=fresh(),used=new Set();for(const a of actions){if(Array.isArray(source?.[a])&&source[a].length&&source[a].length<=2&&source[a].every(valid))result[a]=[...new Set(source[a])];for(const c of result[a]){if(used.has(c))return fresh();used.add(c);}}return result;}
 function assign(source,action,code){if(!actions.includes(action)||!valid(code))throw new Error('Essa tecla é reservada. Escolha uma letra, número ou outra tecla de ação.');const result=normalize(source);if(actions.some(a=>a!==action&&result[a].includes(code)))throw new Error('Essa tecla já está em outro chute ou passe. Troque a outra ação primeiro.');result[action]=[code];return result;}
 function codes(source,action,local=false){const c=source[action]||defaults[action];return local&&c.length>1?c.slice(0,1):c;}
 function pressed(source,action,keys,local=false){return codes(source,action,local).some(c=>!!keys[c]);}
 function label(code){if(/^Key/.test(code))return code.slice(3);if(/^Digit/.test(code))return code.slice(5);if(/^Numpad\d/.test(code))return 'Num '+code.slice(6);return {Space:'Espaço',Enter:'Enter',Slash:'/',Backslash:'\\',Semicolon:';',Quote:'Aspas',BracketLeft:'[',BracketRight:']',Comma:',',Minus:'−',Equal:'=',Backquote:'`',NumpadEnter:'Num Enter',NumpadAdd:'Num +',NumpadSubtract:'Num −',NumpadMultiply:'Num *',NumpadDivide:'Num /',NumpadDecimal:'Num .'}[code]||code;}
 const api={fresh,normalize,assign,codes,pressed,label};if(typeof module!=='undefined')module.exports=api;else root.MaxballKeyboard=api;
})(globalThis);
