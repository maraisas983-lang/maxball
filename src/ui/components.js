(function(root){
 'use strict';
 function el(tag,attrs={},children=[]){
  const node=document.createElement(tag);
  for(const [key,value] of Object.entries(attrs)){
   if(key==='text')node.textContent=value;else if(key==='class')node.className=value;
   else if(key.startsWith('on'))node.addEventListener(key.slice(2),value);
   else if(value!==undefined&&value!==null)node.setAttribute(key,String(value));
  }
  node.append(...children.filter(Boolean));return node;
 }
 function button(label,action,kind='primary'){
  const node=el('button',{type:'button',class:'action '+kind,text:label});
  node.onclick=async()=>{node.disabled=true;try{await action();}catch(error){root.MaxballPortal.error(error);}finally{node.disabled=false;}};
  return node;
 }
 const card=(title,...children)=>el('article',{class:'sport-card'},[el('h3',{text:title}),...children]);
 const note=text=>el('p',{class:'muted',text});
 function field(label,key,type='text',value='',attrs={}){return el('label',{class:'field',text:label},[el('input',{name:key,type,value,...attrs})]);}
 function select(label,key,options,value){return el('label',{class:'field',text:label},[el('select',{name:key},options.map(([id,name])=>el('option',{value:id,...(String(id)===String(value)?{selected:''}:{}),text:name})))]);}
 function form(fields,label,submit){
  const node=el('form',{class:'sport-form'},fields),send=el('button',{class:'action primary',type:'submit',text:label});node.append(send);
  node.onsubmit=async event=>{event.preventDefault();if(!node.reportValidity())return;send.disabled=true;try{await submit(Object.fromEntries(new FormData(node)));}catch(error){root.MaxballPortal.error(error);}finally{send.disabled=false;}};
  return node;
 }
 function table(headers,rows){return el('div',{class:'table-scroll'},[el('table',{},[el('thead',{},[el('tr',{},headers.map(text=>el('th',{scope:'col',text})))]),el('tbody',{},rows.map(row=>el('tr',{},row.map(text=>el('td',{text})))) )])]);}
 function metrics(entries){return el('div',{class:'metrics'},entries.map(([label,value])=>el('div',{},[el('strong',{text:value}),el('span',{text:label})])));}
 function celebrate(awards){
  if(!awards.length)return;
  const modal=el('dialog',{class:'celebration','aria-label':'Conquistas da temporada'});
  let index=0;
  function render(){
   const award=awards[index],gold=award.code==='BALLON_DOR';
   modal.replaceChildren(el('div',{class:'trophy-mark',text:gold?'⚽':'🏆'}),el('p',{class:'eyebrow',text:gold?'O TOPO DO FUTEBOL MAXBALL':'UMA CONQUISTA PARA A HISTÓRIA'}),el('h2',{text:award.name}),note(`Temporada ${award.season||''} · ${root.MaxballPortal.account?.profile.shirt_name||''}`),button(index<awards.length-1?'Próximo':'Continuar',()=>{if(++index<awards.length)render();else{modal.close();modal.remove();}}));
  }
  document.body.append(modal);render();modal.addEventListener('cancel',()=>modal.remove());modal.showModal();root.MaxballGame.celebrateSound();
 }
 root.MaxballUI={el,button,card,note,field,select,form,table,metrics,celebrate};
 root.MaxballViews={};
})(globalThis);
