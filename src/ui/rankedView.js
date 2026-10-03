(function(root){
 'use strict';
 const {card,note,button,el,field,select,form}=root.MaxballUI;
 root.MaxballViews.ranked=async portal=>{
  portal.connection.connect();
  const current=await portal.api('/ranked');
  const groupPanel=card('Seu grupo'),format=select('Formato da partida','n',[[1,'1 × 1 · Pequeno'],[2,'2 × 2 · Médio'],[3,'3 × 3 · Grande'],[4,'4 × 4 · Enorme']],4);
  let group=current.party?.group,partyFingerprint;
  const action=async(path,body)=>{paintParty(await portal.api('/party/'+path,'POST',body));};
  function paintParty(data){group=data.group;const fingerprint=JSON.stringify(data);if(fingerprint===partyFingerprint)return;partyFingerprint=fingerprint;groupPanel.replaceChildren(el('h3',{text:'Seu grupo'}),note('Seu código de jogador: '+portal.account.user.id));
   if(!group)groupPanel.append(button('Criar grupo',()=>action('create',{})));
   else{
    const leader=group.leader===portal.account.user.id;
    for(const p of group.members)groupPanel.append(el('div',{class:'party-member'},[el('strong',{text:p.name+(p.id===group.leader?' · Líder':'')}),note((p.connected?'Conectado':'Reconectando')+' · '+(p.ready?'Pronto':'Aguardando prontidão')),leader&&p.id!==group.leader?button('Remover',()=>action('remove',{playerId:p.id}),'secondary'):null]));
    if(group.state==='IDLE'){
     const me=group.members.find(p=>p.id===portal.account.user.id);groupPanel.append(button(me.ready?'Não estou pronto':'Estou pronto',()=>action('ready',{ready:!me.ready}),'secondary'));
     if(leader&&group.members.length<4)groupPanel.append(form([field('Código ou usuário do amigo','playerId','text','',{required:'',maxlength:100})],'Convidar',v=>action('invite',v)));
    }
    groupPanel.append(button('Sair do grupo',()=>action('leave',{}),'secondary'));
   }
   for(const i of data.invites||[])groupPanel.append(note('Convite de '+i.leaderName),button('Aceitar convite',()=>action('accept',{inviteId:i.id})));
  }
  paintParty(current.party||{});
  const label=note(''),rating=el('div',{class:'ranked-rating','aria-label':'Seu Elo'}),list=card('Histórico ranqueado');
  label.setAttribute('role','status');
  const panel=card('Ranqueado MAXBALL',note('Escolha o formato. Grupos do mesmo tamanho jogam juntos, com bots nas vagas livres. · 3 minutos'),format,rating,label);
  let queued=current.queued;
  const paint=data=>{queued=data.queued;if(data.party)paintParty(data.party);portal.connection.state=queued?'MATCHMAKING':data.room?'IN_MATCH':'CONNECTED';panel.classList.toggle('searching',queued);format.querySelector('select').disabled=queued;const leader=!group||group.leader===portal.account.user.id;search.disabled=queued||!leader;cancel.disabled=!queued||!leader;rating.textContent='Seu Elo: '+data.rating;label.textContent=data.room?'Adversário encontrado. Entrando em campo…':queued?'Buscando adversário · '+data.wait+' s · diferença de até '+data.range+' pontos':'Pronto para a próxima partida.';if(data.room)portal.play(data.room);};
  const search=button('Buscar partida',async()=>paint(await portal.api('/ranked/join','POST',{n:+format.querySelector('select').value}))),cancel=button('Cancelar busca',async()=>paint(await portal.api('/ranked/cancel','POST',{})),'secondary');panel.append(search,cancel);
  portal.content.append(panel,groupPanel,list);paint(current);
  for(const m of current.history||[])list.append(note((m.score?JSON.parse(m.score).join(' × '):'Em andamento')+' · '+(m.reason||'')+' · Elo '+(m.home_id===portal.account.user.id?m.home_before:m.away_before)+' → '+(m.home_id===portal.account.user.id?m.home_after:m.away_after)));

  let stopped=false;
  const stop=async()=>{if(stopped)return;stopped=true;clearInterval(timer);if(queued&&(!group||group.leader===portal.account.user.id))await portal.api('/ranked/cancel','POST',{}).catch(()=>{});};
  const timer=setInterval(async()=>{if(!portal.content.isConnected||!document.querySelector('#portal').classList.contains('on')){await stop();return;}try{const data=await portal.api('/ranked');if(!stopped)paint(data);}catch(e){clearInterval(timer);portal.error(e);}},2000);
  portal.onLeave(stop);
 };
})(globalThis);
