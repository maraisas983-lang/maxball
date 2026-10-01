(function(root){
 'use strict';
 const {el,button,note,field,form,celebrate}=root.MaxballUI;
 const shell=document.querySelector('#portal'),content=document.querySelector('#portal-content'),nav=document.querySelector('#portal-nav'),statusNode=document.querySelector('#portal-status');
 const labels={career:'Carreira',online:'Online',shop:'Loja',inventory:'Inventário',profile:'Perfil',gallery:'Galeria',admin:'Admin'};
 let account=null,page='career',generation=0,returnPage='online',knownAwards=new Set(),pendingAwards=[];
 const api=root.MaxballAPI.request;
 const portal={
  api,content,get account(){return account;},
  status(message){statusNode.textContent=message;statusNode.classList.remove('error');},
  error(error){statusNode.textContent=error.message||'Não foi possível concluir.';statusNode.classList.add('error');if(error.status===401){account=null;root.MaxballAPI.clear();}},
  async refreshAccount(){account=await api('/auth/me');document.querySelector('#account-label').textContent=account.profile.display_name+' · '+account.wallet.balance+' gemas';return account;},
  async logout(){await api('/auth/logout','POST',{});portal.connection.close();account=null;root.MaxballAPI.clear();await portal.open('login');},
  async open(next='career'){
   page=next;const version=++generation;root.MaxballGame.show('portal');content.replaceChildren();portal.status('Carregando…');
   if(!account){try{await portal.refreshAccount();}catch(error){if(error.status!==401)portal.error(error);}}
   if(version!==generation)return;
   if(!account){renderLogin();return;}
   nav.replaceChildren();
   for(const [key,label] of Object.entries(labels))if(key!=='admin'||account.user.role!=='PLAYER'){
    const tab=button(label,()=>portal.open(key),'tab'+(page===key?' active':''));tab.setAttribute('aria-current',page===key?'page':'false');nav.append(tab);
   }
   portal.status('');
   const container=el('div',{class:'portal-grid'});content.append(container);
   try{await (root.MaxballViews[next]||root.MaxballViews.career)({...portal,account,content:container});}catch(error){portal.error(error);}
   if(pendingAwards.length&&next==='career'){celebrate(pendingAwards);pendingAwards=[];}
  },
  play(room){returnPage=room.kind==='CAREER'?'career':'online';portal.connection.connect();portal.connection.socket?.readyState===WebSocket.OPEN&&portal.connection.socket.send(JSON.stringify({type:'subscribe'}));portal.status('Conectando à partida…');}
 };
 root.MaxballPortal=portal;
 function renderLogin(){
  nav.replaceChildren();document.querySelector('#account-label').textContent='Sua carreira começa aqui';
  content.replaceChildren(el('article',{class:'login-card'},[el('p',{class:'eyebrow',text:'ENTRE PARA O MAXBALL'}),el('h2',{text:'Entre em campo.'}),note('Sua conta guarda carreira, troféus e cosméticos. Os modos locais continuam disponíveis no menu principal.'),
   form([field('Usuário','username','text','',{required:'',minlength:3,maxlength:24,autocomplete:'username',pattern:'[a-zA-Z0-9_]+'}),field('Senha','password','password','',{required:'',minlength:12,maxlength:128,autocomplete:'current-password'})],'Entrar',async values=>{await api('/auth/login','POST',values);await loggedIn();}),
   button('Criar conta com esses dados',async()=>{
    const node=content.querySelector('form');if(!node.reportValidity())return;
    await api('/auth/register','POST',Object.fromEntries(new FormData(node)));await loggedIn();
   },'secondary'),note('Usuário: 3–24 letras, números ou _. Senha: pelo menos 12 caracteres.') ]));
  if(!statusNode.classList.contains('error'))portal.status('');
 }
 async function loggedIn(){
  await portal.refreshAccount();const profile=await api('/profile');knownAwards=new Set(profile.achievements.map(a=>a.id));
  portal.connection.connect();await portal.open(page==='login'?'career':page);
 }
 portal.connection=new root.MaxballOnline.Connection({
  input:()=>root.MaxballGame.input(),onStatus:message=>{document.querySelector('#network-status').textContent=message;},
  onMessage:message=>{
   if(!account)return;
   if(message.type==='snapshot')root.MaxballGame.snapshot(message.state,account.user.id);
   if(message.type==='result'){
    Promise.all([portal.refreshAccount(),api('/profile')]).then(([,profile])=>{
     pendingAwards=profile.achievements.filter(a=>!knownAwards.has(a.id));knownAwards=new Set(profile.achievements.map(a=>a.id));
    }).catch(portal.error);
   }
   if(message.type==='room'&&shell.classList.contains('on')&&page==='online'){
    const room=message.room;portal.status(room.players.map(p=>p.name).join(' × ')+' · '+(room.status==='waiting'?'Aguardando início':'Partida iniciada'));
   }
  }
 });
 root.MaxballGame.on('REMOTE_EXIT',()=>{
  portal.connection.close();api('/rooms/leave','POST',{}).then(()=>portal.open(returnPage)).catch(portal.error);
 });
 document.addEventListener('click',event=>{
  const target=event.target.closest('[data-account-page]');if(target)portal.open(target.dataset.accountPage).catch(portal.error);
 });
 document.querySelector('#portal-home').onclick=()=>{generation++;root.MaxballGame.show('home');};
 // Restore the session without interfering with the local home screen.
 if(location.protocol!=='file:')portal.refreshAccount().then(async()=>{const profile=await api('/profile');knownAwards=new Set(profile.achievements.map(a=>a.id));if(account.room)portal.connection.connect();}).catch(()=>{});
})(globalThis);
