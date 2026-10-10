(function(root){
 'use strict';
 const {el,card,note,button,select}=root.MaxballUI;
 root.MaxballViews.settings=portal=>{
  const values=root.MaxballPreferences.get(),box=card('Configurações do jogo',note('Salvas neste navegador. A opção de FPS é um limite; a taxa real depende da tela e do dispositivo.'));
  for(const [key,label] of [['music','Música de fundo'],['sound','Sons e torcida'],['effects','Efeitos visuais']]){const input=el('input',{type:'checkbox'});input.checked=values[key];input.onchange=()=>root.MaxballPreferences.save({[key]:input.checked});box.append(el('label',{class:'settings-toggle'},[input,el('span',{text:label})]));}
  for(const [key,label,options] of [['graphics','Qualidade gráfica',[['auto','Automático · adapta ao aparelho'],['low','Baixo'],['medium','Médio'],['high','Alto']]],['fps','Limite de FPS',[[30,'30 FPS'],[60,'60 FPS'],[90,'90 FPS'],[120,'120 FPS']]]]){const input=select(label,key,options,values[key]);input.onchange=()=>root.MaxballPreferences.save({[key]:key==='fps'?+input.querySelector('select').value:input.querySelector('select').value});box.append(input);}
  box.append(note('O modo automático avalia a fluidez durante a partida e ajusta apenas a resolução e os efeitos. Física, controles e velocidade permanecem iguais.'),button('Medições de desempenho',()=>root.MaxballDiagnostics.toggle(),'secondary'),button('Personalizar controles',()=>root.MaxballGame.show('ctl')),note('Arraste os botões do celular ou escolha as teclas de chute e passe no PC.'));portal.content.append(box);
 };
 for(const node of document.querySelectorAll('.home-wallet [data-go="ctl"]')){node.removeAttribute('data-go');node.onclick=()=>root.MaxballPortal.open('settings');}
 root.addEventListener('maxball-preferences',()=>{document.documentElement.dataset.effects=String(root.MaxballPreferences.get().effects);});
})(globalThis);
