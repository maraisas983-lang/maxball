(function(root){
 'use strict';
 const {el,button,note}=root.MaxballUI,portal=root.MaxballPortal;
 const entry=el('section',{id:'entry',class:'scr entry-screen','aria-label':'Carregamento e conta MAXBALL'}),brand=el('div',{class:'entry-brand'}),logo=document.querySelector('.home-brand svg').cloneNode(true),body=el('div',{class:'entry-body'}),progress=el('progress',{max:100,value:0}),status=el('p',{role:'status',class:'entry-status',text:'Preparando o MAXBALL…'}),auth=el('div',{class:'entry-auth'});
 brand.append(logo,el('h1',{text:'MAXBALL'}),note('SEU CLUBE. SEU CAMPO. SUA HISTÓRIA.'));const percent=el('strong',{class:'loading-percent',text:'0%'});body.append(brand,progress,percent,status,auth);entry.append(body);document.body.prepend(entry);let loading=true;
 function paint(){auth.replaceChildren();if(portal.account){auth.append(el('h2',{text:'Bem-vindo, '+portal.account.profile.display_name}),button('Entrar no lobby',enter));}else{portal.renderLogin(auth);}auth.append(button('Treinar sem conta',()=>root.MaxballPortal.open('training'),'secondary'));}
 function enter(){auth.replaceChildren();root.MaxballGame.show('home');root.MaxballHome.refresh();}
 function open(){root.MaxballGame.show('entry');if(!loading)paint();}
 root.MaxballEntry={open,enter,get visible(){return entry.classList.contains('on');},notice(message){status.textContent=message;status.classList.remove('error');},error(error){status.textContent=error.message;status.classList.add('error');}};
 open();document.body.classList.add('maxball-ready');document.querySelector('#boot-screen')?.remove();
 let completed=0;const tasks=[portal.ready,portal.loadAuth(),document.fonts?.ready||Promise.resolve()].map(task=>Promise.resolve(task).finally(()=>{progress.value=Math.round(++completed/3*100);percent.textContent=progress.value+'%';}));Promise.allSettled(tasks).then(results=>{loading=false;progress.value=100;if(results[1].status==='rejected'){root.MaxballEntry.error(results[1].reason);auth.replaceChildren(button('Tentar novamente',()=>location.reload()),button('Treinar sem conta',()=>portal.open('training'),'secondary'));return;}status.textContent='Pronto para entrar em campo';if(portal.account)enter();else paint();});
})(globalThis);
