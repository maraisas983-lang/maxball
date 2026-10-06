(function(root){
 const {el,select,note}=root.MaxballUI,options=[['fixed','Fixo · responde na metade esquerda'],['floating','Móvel · começa onde você toca'],['follow','Segue o dedo'],['off','Desligado · usar teclado']];
 function panel(){const node=el('div',{class:'touch-settings'}),choice=select('Tipo de analógico','joystickMode',options,root.MaxballPreferences.get().joystick);choice.onchange=()=>root.MaxballPreferences.save({joystick:choice.querySelector('select').value});node.append(choice,note('No modo fixo, toques na metade esquerda usam o centro dessa área como referência. Soltar o dedo interrompe o movimento.'));return node;}
 document.querySelector('#gpan').insertBefore(panel(),document.querySelector('#zok'));document.querySelector('#ctl').append(panel());
 root.addEventListener('maxball-preferences',()=>document.querySelectorAll('[name=joystickMode]').forEach(choice=>choice.value=root.MaxballPreferences.get().joystick));
 const previous=root.MaxballViews.settings;root.MaxballViews.settings=portal=>{previous(portal);portal.content.append(panel());};
})(globalThis);
