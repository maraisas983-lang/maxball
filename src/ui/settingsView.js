(function(root){
 'use strict';
 const {el,card,note,button,select}=root.MaxballUI;
 root.MaxballViews.settings=portal=>{
  const values=root.MaxballPreferences.get(),box=card('Configurações do jogo',note('Salvas neste navegador. A opção de FPS é um limite; a taxa real depende da tela e do dispositivo.'));
  for(const [key,label] of [['music','Música do lobby'],['sound','Sons e torcida'],['effects','Efeitos visuais']]){const input=el('input',{type:'checkbox'});input.checked=values[key];input.onchange=()=>root.MaxballPreferences.save({[key]:input.checked});box.append(el('label',{class:'settings-toggle'},[input,el('span',{text:label})]));}
  for(const [key,label,options] of [['graphics','Qualidade gráfica',[['low','Baixo'],['medium','Médio'],['high','Alto']]],['fps','Limite de FPS',[[30,'30 FPS'],[60,'60 FPS'],[90,'90 FPS'],[120,'120 FPS']]]]){const input=select(label,key,options,values[key]);input.onchange=()=>root.MaxballPreferences.save({[key]:key==='fps'?+input.querySelector('select').value:input.querySelector('select').value});box.append(input);}
  box.append(button('Personalizar controles',()=>root.MaxballGame.show('ctl')),note('Arraste os botões do celular ou escolha as teclas de chute e passe no PC.'));portal.content.append(box);
 };
 for(const node of document.querySelectorAll('.home-wallet [data-go="ctl"]')){node.removeAttribute('data-go');node.onclick=()=>root.MaxballPortal.open('settings');}
 let context,next=0,index=0;
 const notes=[130.81,164.81,196,261.63,220,196,164.81,146.83];
 function wake(){if(!root.MaxballPreferences.get().music)return;try{context??=new (root.AudioContext||root.webkitAudioContext)();context.resume();}catch{}}
 document.addEventListener('pointerdown',wake,{passive:true});
 setInterval(()=>{if(!context||context.state!=='running'||document.hidden||!root.MaxballPreferences.get().music||document.querySelector('#game.on')||performance.now()<next)return;next=performance.now()+700;const o=context.createOscillator(),g=context.createGain(),t=context.currentTime;o.type='sine';o.frequency.value=notes[index++%notes.length];g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.018,t+.04);g.gain.exponentialRampToValueAtTime(.0001,t+.6);o.connect(g).connect(context.destination);o.start(t);o.stop(t+.65);},100);
 root.addEventListener('maxball-preferences',()=>{document.documentElement.dataset.effects=String(root.MaxballPreferences.get().effects);if(!root.MaxballPreferences.get().music)context?.suspend();else wake();});
})(globalThis);
