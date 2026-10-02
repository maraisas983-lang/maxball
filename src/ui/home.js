(function(root){
 const $=selector=>document.querySelector(selector);
 function refresh(){
  const account=root.MaxballPortal.account,local=root.MaxballGame.localProfile(),profile=account?.profile;
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
 root.MaxballHome={refresh};refresh();
})(globalThis);
