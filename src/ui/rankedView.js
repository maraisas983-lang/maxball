(function(root){
 'use strict';
 const {card,note,button,el}=root.MaxballUI;
 root.MaxballViews.ranked=async portal=>{
  portal.connection.connect();
  const current=await portal.api('/ranked');
  const label=note(''),rating=note(''),list=card('Histórico ranqueado');
  const panel=card('Ranqueado MAXBALL',note('4 × 4 · um jogador e três companheiros por equipe · 3 minutos'),rating,label);
  let queued=current.queued;
  const paint=data=>{queued=data.queued;rating.textContent='Seu Elo: '+data.rating;label.textContent=data.room?'Adversário encontrado. Entrando em campo…':queued?'Buscando adversário · '+data.wait+' s · diferença de até '+data.range+' pontos':'Pronto para a próxima partida.';if(data.room)portal.play(data.room);};
  panel.append(button('Buscar partida',async()=>paint(await portal.api('/ranked/join','POST',{}))),button('Cancelar busca',async()=>paint(await portal.api('/ranked/cancel','POST',{})),'secondary'));
  portal.content.append(panel,list);paint(current);
  for(const m of current.history||[])list.append(note((m.score?JSON.parse(m.score).join(' × '):'Em andamento')+' · '+(m.reason||'')+' · Elo '+(m.home_id===portal.account.user.id?m.home_after:m.away_after)));
  if(!current.room&&!queued)paint(await portal.api('/ranked/join','POST',{}));
  let stopped=false;
  const stop=async()=>{if(stopped)return;stopped=true;clearInterval(timer);if(queued)await portal.api('/ranked/cancel','POST',{}).catch(()=>{});};
  const timer=setInterval(async()=>{if(!portal.content.isConnected||!document.querySelector('#portal').classList.contains('on')){await stop();return;}try{const data=await portal.api('/ranked');if(!stopped)paint(data);}catch(e){clearInterval(timer);portal.error(e);}},2000);
  portal.onLeave(stop);
 };
})(globalThis);
