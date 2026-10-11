(function(root){
 'use strict';
 const {el,button,note,field,form,celebrate}=root.MaxballUI;
 const shell=document.querySelector('#portal'),content=document.querySelector('#portal-content'),nav=document.querySelector('#portal-nav'),statusNode=document.querySelector('#portal-status');
 let authProvider='local';
 let account=null,page='career',generation=0,returnPage='online',knownAwards=new Set(),pendingAwards=[],cleanup=null,roomListener=null;
 const api=root.MaxballAPI.request;
 const portal={
  api,content,get account(){return account;},
  onLeave(callback){cleanup=callback;},
  listenRoom(callback){roomListener=callback;},
  status(message){statusNode.textContent=message;statusNode.classList.remove('error');},
  error(error){if(root.MaxballEntry?.visible)root.MaxballEntry.error(error);statusNode.textContent=error.message||'Não foi possível concluir.';statusNode.classList.add('error');if(error.status===401){account=null;root.MaxballAPI.clear();}},
  async refreshAccount(){account=await api('/auth/me');document.querySelector('#account-label').textContent=account.profile.display_name+' · '+account.wallet.balance+' gemas';root.MaxballHome?.refresh();if(account.room&&portal.connection?.closed)portal.connection.connect();return account;},
  async logout(){await api('/auth/logout','POST',{});portal.connection.close();account=null;root.MaxballAPI.clear();await portal.open('login');},
  async open(next='career'){
   if(cleanup){const stop=cleanup;cleanup=null;await stop();}
   root.MaxballSocial?.close();page=next;const version=++generation;root.MaxballGame.show('portal');content.replaceChildren();portal.status('Carregando…');
   root.MaxballLobby.mount(shell,content,nav,next,key=>portal.open(key));
   if(!account&&!['training','local','play','settings','pass'].includes(next)){try{await portal.refreshAccount();}catch(error){if(error.status!==401)portal.error(error);}}
   if(version!==generation)return;
   if(!account&&!['training','local','play','settings','pass'].includes(next)){
    try{authProvider=(await api('/config')).authProvider;}catch(error){
     portal.error(error);nav.replaceChildren();
     const link=/^(localhost|127\.0\.0\.1)$/.test(location.hostname)?el('a',{class:'action primary',href:'http://127.0.0.1:5173',text:'Abrir MAXBALL com login'}):null;
     content.replaceChildren(cardUnavailable(error,link));return;
    }
    if(root.MaxballEntry){root.MaxballEntry.open();return;}renderLogin();return;
   }
   portal.status('');
   const container=el('div',{class:'portal-grid lobby-body'});content.append(container);
   try{await (root.MaxballViews[next]||root.MaxballViews.career)({...portal,account,content:container});}catch(error){portal.error(error);}
   if(version===generation)shell.scrollTop=0;
   if(pendingAwards.length&&next==='career'){celebrate(pendingAwards);pendingAwards=[];}
  },
  play(room){root.MaxballOfficials?.room(room);returnPage=room.kind==='CAREER'?'career':room.cfg.ranked?'ranked':'online';portal.connection.connect();portal.connection.socket?.readyState===WebSocket.OPEN&&portal.connection.socket.send(JSON.stringify({type:'subscribe'}));portal.status('Conectando à partida…');}
 };
 root.MaxballPortal=portal;
 function cardUnavailable(error,link){return el('article',{class:'login-card'},[el('h2',{text:'Conecte ao MAXBALL'}),note(error.message),link]);}
 function renderLogin(container=content){
  document.querySelector('#account-label').textContent='Sua conta MAXBALL';
  const legal=root.MaxballLegal,check=el('input',{type:'checkbox',name:'acceptTerms',required:''});
  const showLegal=(title,body)=>{const dialog=el('dialog',{class:'legal-dialog'},[el('h2',{text:title}),note('Versão '+legal.termsVersion),el('p',{text:body})]);dialog.append(button('Voltar',()=>{dialog.close();dialog.remove();}));document.body.append(dialog);dialog.addEventListener('cancel',()=>dialog.remove());dialog.showModal();};
  const consent=el('div',{class:'consent'},[el('label',{},[check,el('span',{text:'Li e aceito os Termos de Uso e a Política de Privacidade'})]),button('Termos de Uso',()=>showLegal('Termos de Uso',legal.terms),'secondary'),button('Política de Privacidade',()=>showLegal('Política de Privacidade',legal.privacy),'secondary')]);
  const payload=values=>({username:values.username,password:values.password,acceptTerms:check.checked,termsVersion:legal.termsVersion,privacyVersion:legal.privacyVersion});
  const login=form([field(authProvider==='supabase'?'E-mail':'Usuário','username',authProvider==='supabase'?'email':'text','',{required:'',minlength:3,maxlength:authProvider==='supabase'?254:24,autocomplete:'username'}),field('Senha','password','password','',{required:'',minlength:1,maxlength:128,autocomplete:'current-password'}),consent],'Entrar',async values=>{await api('/auth/login','POST',payload(values));await loggedIn();});
  const register=button('Criar conta com esses dados',async()=>{
   if(!login.reportValidity()||!check.checked)return;
   const values=Object.fromEntries(new FormData(login));if(values.password.length<12){portal.error(new Error('Para criar uma conta, use uma senha de pelo menos 12 caracteres.'));return;}
   const result=await api('/auth/register','POST',payload(values));if(result.confirmationRequired){const message='Confirme seu e-mail pelo link recebido e depois entre na conta.';portal.status(message);if(root.MaxballEntry?.visible)root.MaxballEntry.notice(message);return;}await loggedIn();
  },'secondary');
  const sync=()=>{login.querySelector('[type=submit]').disabled=register.disabled=!check.checked;};check.onchange=sync;sync();
  container.append(el('article',{class:'login-card'},[el('p',{class:'eyebrow',text:'ENTRE PARA O MAXBALL'}),el('h2',{text:page==='support'?'Entre para acessar seus chamados.':'Entre em campo.'}),note('Sua conta guarda carreira, troféus e cosméticos. Treino e Local estão disponíveis sem login.'),login,register,note('Cadastro: senha com pelo menos 12 caracteres.')]));
  if(!statusNode.classList.contains('error'))portal.status('');
 }
 async function loggedIn(){
  await portal.refreshAccount();const profile=await api('/profile');knownAwards=new Set(profile.achievements.map(a=>a.id));
  portal.connection.connect();if(root.MaxballEntry?.visible){root.MaxballEntry.enter();return;}await portal.open(page==='login'?'career':page);
 }
 portal.connection=new root.MaxballOnline.Connection({
  input:()=>root.MaxballGame.input(),onStatus:message=>{root.MaxballSocial?.status(message);document.querySelector('#network-status').textContent=message;},
  onMessage:message=>{
   if(!account)return;root.MaxballSocial?.receive(message);root.MaxballExperience?.receive(message);
   if(message.type==='connected'){
    if(!message.room&&root.MaxballGame.remote){root.MaxballGame.leaveRemote();return;}
    if(!message.room&&roomListener&&page==='online'&&shell.classList.contains('on')){portal.open('online').catch(portal.error);return;}
   }
   if(message.type==='room'){root.MaxballOfficials?.room(message.room);roomListener?.(message.room);}
   if(message.type==='championshipClosed'){portal.open('championships').catch(portal.error);return;}
   if(message.type==='intermission'){root.MaxballGame.resetInputs();root.MaxballOfficials?.room(message.room);root.MaxballExperience?.intermission(message.room);return;}
   if(message.type==='snapshot')root.MaxballGame.snapshot(message.state,account.user.id);
   if(message.type==='result'){root.MaxballResults.show(message);
    Promise.all([portal.refreshAccount(),api('/profile')]).then(([,profile])=>{
     pendingAwards=profile.achievements.filter(a=>!knownAwards.has(a.id));knownAwards=new Set(profile.achievements.map(a=>a.id));
    }).catch(portal.error);
   }
   if(message.type==='matchCancelled'){root.MaxballGame.leaveRemote?.({keepRoom:true});root.MaxballOfficials.room(message.room);portal.open('online').catch(portal.error);return;}
   root.MaxballMatchOverlay?.receive(message);
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
 document.querySelector('#portal-home').onclick=()=>{generation++;if(cleanup){cleanup();cleanup=null;}root.MaxballGame.show('home');};
 // Restore on reopen and keep the provider's access token renewed while open.
 setInterval(()=>{if(account&&!document.hidden)portal.refreshAccount().catch(()=>{});},5*60000);
 root.addEventListener('focus',()=>{if(account)portal.refreshAccount().catch(()=>{});});
 // Restore the session without interfering with the local home screen.
 portal.renderLogin=renderLogin;portal.loadAuth=async()=>{authProvider=(await api('/config')).authProvider;};portal.ready=(root.MaxballAPI.offline||location.protocol==='file:')?Promise.resolve():portal.refreshAccount().then(async()=>{const profile=await api('/profile');knownAwards=new Set(profile.achievements.map(a=>a.id));if(account.room)portal.connection.connect();}).catch(()=>{});
})(globalThis);
