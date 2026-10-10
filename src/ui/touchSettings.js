(function(root){
 'use strict';
 const {el,select,note}=root.MaxballUI;
 const options=[['fixed','Fixo'],['floating','Móvel: começa no toque'],['follow','Segue o dedo'],['off','Desligado: usar teclado']];
 function panel(sizes=true){
  const node=el('div',{class:'touch-settings'}),choice=select('Tipo de analógico','joystickMode',options,root.MaxballPreferences.get().joystick);
  choice.onchange=()=>root.MaxballPreferences.save({joystick:choice.querySelector('select').value});node.append(choice);
  if(sizes){const group=el('div',{class:'control-sizes'});
   for(const [key,name] of [['j','Analógico'],['s','Chute'],['p','Passe']]){
    const value=Math.round(root.MaxballGame.controlSettings()[key].s*100),output=el('output',{text:value+'%'}),input=el('input',{type:'range',min:60,max:200,value,'aria-label':'Tamanho do '+name.toLowerCase()});input.dataset.controlSize=key;
    input.oninput=()=>{root.MaxballGame.setControlSize(key,Number(input.value)/100);output.textContent=input.value+'%';};
    group.append(el('label',{},[el('span',{text:name}),output,input]));
   }node.append(group,note('Cada tamanho é independente. Para mudar a posição, abra Personalizar controles.'));
  }
  return node;
 }
 document.querySelector('#gpan').insertBefore(panel(),document.querySelector('#zok'));
 document.querySelector('#cpan').append(panel(false));
 const refresh=()=>document.querySelectorAll('[data-control-size]').forEach(input=>{input.value=Math.round(root.MaxballGame.controlSettings()[input.dataset.controlSize].s*100);input.previousElementSibling.textContent=input.value+'%';});
 root.addEventListener('maxball-controls',refresh);
 root.addEventListener('maxball-preferences',()=>document.querySelectorAll('[name=joystickMode]').forEach(choice=>choice.value=root.MaxballPreferences.get().joystick));
 const previous=root.MaxballViews.settings;root.MaxballViews.settings=portal=>{previous(portal);portal.content.append(panel());};
})(globalThis);
