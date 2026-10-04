(function(root){
 'use strict';
 const {el,button,card,note,field,select,form,table,metrics}=root.MaxballUI;
 root.MaxballViews.profile=async portal=>{
  const {profile,achievements}=await portal.api('/profile'),matches=await portal.api('/matches');
  const positions=el('div',{class:'position-choices'});for(const code of ['GK','MC','VL','PV','TEC']){const input=el('input',{type:'checkbox',value:code});input.checked=(profile.positions||[]).includes(code);positions.append(el('label',{},[input,el('span',{text:code})]));}
  portal.content.append(card(profile.display_name,note(profile.patent+' · '+profile.trophies+' troféus'),note('Posições de ofício · escolha até quatro'),positions,metrics([['Nível',profile.level],['XP',profile.xp],['Conquistas',achievements.length]]),note('ID da conta: '+portal.account.user.id),
   form([field('Nome de exibição','displayName','text',profile.display_name,{required:'',minlength:3,maxlength:14}),field('Nome na camisa','shirtName','text',profile.shirt_name,{required:'',minlength:3,maxlength:14}),field('Número','shirtNumber','number',profile.shirt_number,{required:'',min:1,max:99}),select('Avatar','avatar',[['ball','Bola'],['star','Estrela'],['bolt','Raio']],profile.avatar)],'Salvar perfil',async values=>{await portal.api('/profile','PATCH',{...values,shirtNumber:+values.shirtNumber,positions:[...positions.querySelectorAll('input:checked')].map(n=>n.value)});await portal.refreshAccount();await portal.open('profile');})),
   card('Partidas oficiais',matches.length?table(['Modo','Placar','Situação','Data'],matches.map(m=>[m.kind==='CAREER'?'Carreira':'Online',JSON.parse(m.score).join(' × '),({COMPLETED:'Concluída',ABANDONED:'Abandonada',RUNNING:'Em andamento'})[m.status],new Date(m.created_at).toLocaleDateString('pt-BR')])):note('Jogue uma partida de carreira ou online para começar.')),
   card('Sessão',button('Renovar sessão',async()=>{await portal.api('/auth/refresh','POST',{});portal.connection.close();portal.connection.connect();portal.status('Sessão renovada.');},'secondary'),button('Sair da conta',()=>portal.logout(),'danger')));
 };
 async function shop(portal,inventoryOnly){
  const [catalog,owned,wallet]=await Promise.all([portal.api('/shop'),portal.api('/inventory'),portal.api('/wallet')]);
  const slots=await portal.api('/emotes');
  const own=new Set(owned.map(i=>i.id)),profile=portal.account.profile;
  portal.content.append(card(inventoryOnly?'Seu inventário':'Loja de gemas',metrics([['Gemas',wallet.balance],['Itens',owned.length]]),note('Cosméticos para expressar seu estilo em partidas de carreira e online.')));
  if(!inventoryOnly){
   const payments=await portal.api('/gems'),packs=el('div',{class:'cosmetic-grid'});
   for(const p of payments.packs){const buy=button('Ir para checkout',async()=>{const checkout=await portal.api('/gems/checkout','POST',{gems:p.gems});location.assign(checkout.url);});buy.disabled=!p.available;packs.append(card(p.gems+' gemas',note(p.priceCents?new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(p.priceCents/100):'Preço aguardando configuração'),buy));}
   portal.content.append(card('Comprar gemas · Cakto',note(payments.enabled?'Use o mesmo e-mail confirmado da sua conta no checkout. As gemas chegam após a confirmação do pagamento.':'As compras serão liberadas após a configuração pelo administrador.'),packs));
   if(payments.history.length)portal.content.append(card('Compras de gemas',table(['Gemas','Valor','Situação','Data'],payments.history.map(p=>[p.gems,(p.amount_cents/100).toFixed(2),({PAID:'Pago',REFUNDED:'Estornado',CHARGEBACK:'Contestado'})[p.status],new Date(p.created_at).toLocaleString('pt-BR')]))));
  }
  const grid=el('div',{class:'cosmetic-grid'});portal.content.append(grid);
  for(const item of inventoryOnly?owned:catalog){
   const canvas=el('canvas',{width:96,height:96,'aria-label':item.name});
   if(item.category==='EMOTE'){canvas.remove();}
   else item.category==='KIT'?root.MaxballGame.skin(canvas,item.asset_index):root.MaxballGame.effect(canvas,item.asset_index);
   const equipped=(item.category==='KIT'?profile.kit:profile.effect)===item.asset_index;
   const tile=card(item.name,item.category==='EMOTE'?el('span',{class:'emote-preview',text:root.MaxballEmotes[item.asset_index].emoji}):canvas,note(item.rarity+' · '+(own.has(item.id)?'Adquirido':item.price+' gemas')));
   if(own.has(item.id)&&item.category==='EMOTE'){const slot=select('Atalho','slot',[0,1,2,3].map(i=>[i,'Slot '+(i+1)]),slots.find(e=>e.id===item.id)?.slot??0);tile.append(slot,button('Equipar emote',async()=>{await portal.api('/inventory/equip','POST',{itemId:item.id,slot:+slot.querySelector('select').value});await portal.open(inventoryOnly?'inventory':'shop');},'secondary'));}
   else if(own.has(item.id))tile.append(equipped?el('span',{class:'equipped',text:'Equipado'}):button('Equipar',async()=>{await portal.api('/inventory/equip','POST',{itemId:item.id});await portal.refreshAccount();await portal.open(inventoryOnly?'inventory':'shop');},'secondary'));
   else{
    // One key per displayed purchase survives a lost response and a retry.
    const requestId=crypto.randomUUID();
    tile.append(button('Comprar',async()=>{await portal.api('/shop/purchase','POST',{itemId:item.id,requestId});await portal.refreshAccount();await portal.open('shop');}));
   }
   grid.append(tile);
  }
  if(!inventoryOnly)portal.content.append(card('Movimentações de gemas',table(['Tipo','Quantidade','Saldo','Data'],wallet.transactions.map(t=>[({REWARD:'Recompensa',PURCHASE:'Compra',ADMIN_GRANT:'Administração'})[t.type]||t.type,t.amount,t.balance_after,new Date(t.created_at).toLocaleString('pt-BR')]))));
 }
 root.MaxballViews.shop=portal=>shop(portal,false);
 root.MaxballViews.inventory=portal=>shop(portal,true);
})(globalThis);
