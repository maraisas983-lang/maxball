(function(root){
 const $=selector=>document.querySelector(selector);
 function refresh(){
  const account=root.MaxballPortal.account,local=root.MaxballGame.localProfile(),profile=account?.profile;
  let patent=$('#home-patent');if(!patent){patent=document.createElement('small');patent.id='home-patent';$('#home-name').after(patent);}patent.textContent=(profile?.patent||'MiniBall')+' · '+(profile?.trophies||0)+' troféus';
  $('#home-name').textContent=profile?.display_name||local.name;$('#home-shirt-name').textContent=profile?.shirt_name||local.name;
  $('#home-level').textContent=profile?.level||1;$('#home-xp').value=(profile?.xp||0)%250;$('#home-xp-label').textContent=profile?profile.xp%250+' / 250':'Offline';$('#home-balance').textContent=account?.wallet.balance??local.coins;
  const canvas=$('#home-avatar');canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);root.MaxballGame.skin(canvas,profile?.kit??local.kit);
  const g=canvas.getContext('2d');g.font='700 64px Rubik';g.textAlign='center';g.textBaseline='middle';g.lineWidth=7;g.strokeStyle='#10254a';g.strokeText(profile?.shirt_number||local.num,120,126);g.fillStyle='#fff';g.fillText(profile?.shirt_number||local.num,120,126);
 }
 async function cycle(direction){
  const account=root.MaxballPortal.account;
  if(!account){root.MaxballGame.cycleKit(direction);refresh();return;}
  const items=await root.MaxballAPI.request('/inventory'),kits=items.filter(i=>i.category==='KIT'),index=kits.findIndex(i=>i.asset_index===account.profile.kit),item=kits[(index+direction+kits.length)%kits.length];
  if(item){await root.MaxballAPI.request('/inventory/equip','POST',{itemId:item.id});await root.MaxballPortal.refreshAccount();}refresh();
 }
 for(const [id,direction] of [['#home-prev',-1],['#home-next',1]])$(id).onclick=async()=>{try{await cycle(direction);}catch(error){root.MaxballGame.toast(error.message);}};
 const chatLink=document.querySelector('[data-account-page=chat]');if(!chatLink){const chatButton=document.querySelector('#home-chat');if(chatButton)chatButton.onclick=()=>root.MaxballPortal.open('chat');}
 const features=root.MaxballUI.el('nav',{class:'home-features','aria-label':'Passe, campeonatos e criação de skins'});
 for(const [page,icon,title,description,tag] of [
  ['pass','★','MaxPass','50 níveis de recompensas. Conquiste seu estilo em campo.','RECOMPENSAS'],
  ['championships','🏆','Campeonatos','Inscreva seu clube e dispute as rodadas.','COMPETIÇÃO'],
  ['skins','✦','Criar skins','Monte seu uniforme, cores e identidade.','SEU ESTILO']
 ]){const link=root.MaxballUI.el('button',{type:'button',class:'home-feature','data-feature':page,'data-account-page':page},[
   root.MaxballUI.el('span',{class:'feature-icon','aria-hidden':'true',text:icon}),
   root.MaxballUI.el('span',{class:'feature-copy'},[root.MaxballUI.el('small',{text:tag}),root.MaxballUI.el('strong',{text:title}),root.MaxballUI.el('span',{text:description})]),
   root.MaxballUI.el('span',{class:'feature-arrow','aria-hidden':'true',text:'›'})
  ]);features.append(link);}
 document.querySelector('#home').append(features);root.MaxballHome={refresh};refresh();
 async function announcement(){
  if(document.hidden||!$('#home').classList.contains('on')||root.MaxballAPI.offline||location.protocol==='file:')return;
  try{const config=await root.MaxballAPI.request('/config'),welcome=document.querySelector('.home-footer>span');if(welcome)welcome.textContent=config.announcement||'Bem-vindo ao MAXBALL!';}catch{}
 }
 announcement();setInterval(announcement,30000);
})(globalThis);
