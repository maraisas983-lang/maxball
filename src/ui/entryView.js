(function(root){
 'use strict';
 const {el,button,note}=root.MaxballUI,portal=root.MaxballPortal;
 const entry=el('section',{id:'entry',class:'scr entry-screen','aria-label':'Carregamento e conta MAXBALL'}),brand=el('div',{class:'entry-brand'}),logo=document.querySelector('.home-brand svg').cloneNode(true),body=el('div',{class:'entry-body'}),progress=el('progress',{max:100,value:70}),status=el('p',{role:'status',class:'entry-status',text:'Preparando o MAXBALL…'}),auth=el('div',{class:'entry-auth'});
 brand.append(logo,el('h1',{text:'MAXBALL'}),note('SEU CLUBE. SEU CAMPO. SUA HISTÓRIA.'));body.append(brand,progress,status,auth);entry.append(body);document.body.prepend(entry);let loading=true;
 function paint(){auth.replaceChildren();if(portal.account){auth.append(el('h2',{text:'Bem-vindo, '+portal.account.profile.display_name}),button('Entrar no lobby',enter));}else{portal.renderLogin(auth);}auth.append(button('Treinar sem conta',()=>root.MaxballPortal.open('training'),'secondary'));}
 function enter(){auth.replaceChildren();root.MaxballGame.show('home');root.MaxballHome.refresh();}
 function open(){root.MaxballGame.show('entry');if(!loading)paint();}
 root.MaxballEntry={open,enter,get visible(){return entry.classList.contains('on');},error(error){status.textContent=error.message;status.classList.add('error');}};
 open();document.body.classList.add('maxball-ready');document.querySelector('#boot-screen')?.remove();
 Promise.allSettled([portal.ready,portal.loadAuth(),document.fonts?.ready||Promise.resolve()]).then(results=>{loading=false;progress.value=100;if(results[1].status==='rejected'){root.MaxballEntry.error(results[1].reason);auth.replaceChildren(button('Tentar novamente',()=>location.reload()),button('Treinar sem conta',()=>portal.open('training'),'secondary'));return;}status.textContent='Pronto para entrar em campo';paint();});
})(globalThis);
