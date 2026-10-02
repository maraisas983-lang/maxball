(function(root){
 'use strict';
 const {el,button,card,note,field,select,form}=root.MaxballUI;
 const ruleLabels={offside:'Impedimento',extraTime:'Prorrogação',penalties:'Pênaltis em caso de empate',penaltiesAfterExtraTime:'Pênaltis após prorrogação'};
 function rulesForm(room,host,change){
  const box=el('div',{class:'room-rules'}),inputs={};
  for(const [key,label] of Object.entries(ruleLabels)){
   const input=el('input',{type:'checkbox','aria-label':label});input.checked=!!room.settings[key];input.disabled=!host;inputs[key]=input;
   box.append(el('label',{},[input,el('span',{text:label})]));input.onchange=()=>{const values=Object.fromEntries(Object.entries(inputs).map(([k,n])=>[k,n.checked]));if(!values.extraTime||!values.penalties)values.penaltiesAfterExtraTime=false;change(values);};
  }
  inputs.penaltiesAfterExtraTime.disabled=!host||!room.settings.extraTime||!room.settings.penalties;
  return box;
 }
 root.MaxballViews.online=async portal=>{
  const data=await portal.api('/rooms');portal.connection.connect();
  if(data.current){
   const catalog=await portal.api('/teams');let clearDrag=()=>{};
   async function patch(body){const room=await portal.api('/rooms/'+data.current.id,'PATCH',body);render(room);}
   function selector(room,side){
    const drawer=el('div',{class:'team-drawer'}),category=select('Categoria','category',[['BRASILEIRÃO','Brasileirão'],['MAMOBALL','Mamoball'],['MEUS CLUBES','Meus clubes']],room.cfg.teams[side].category),options=el('div',{class:'team-options'});
    const paint=()=>{options.replaceChildren();for(const t of catalog.filter(t=>t.category===category.querySelector('select').value)){const c=button(t.name,()=>patch({[side?'awayTeamId':'homeTeamId']:t.id}),'team-option');const preview=el('canvas',{width:54,height:54});root.MaxballGame.teamSkin(preview,t);c.prepend(preview);options.append(c);}if(!options.children.length)options.append(note('Crie um clube na aba Clubes para selecioná-lo aqui.'));};
    category.onchange=paint;drawer.append(category,options);paint();return drawer;
   }
   function render(room){
    clearDrag();const host=room.owner===portal.account.user.id,waiting=room.status==='waiting';
    const lobby=el('article',{class:'room-lobby'}),header=el('header',{class:'room-heading'},[el('div',{},[el('p',{class:'eyebrow',text:room.hasPassword?'SALA PROTEGIDA':'SALA PERSONALIZADA'}),el('h2',{text:room.name}),note(room.cfg.n+' × '+room.cfg.n+' · '+room.cfg.time/60+' minutos')]),button('Sair da sala',async()=>{await portal.api('/rooms/leave','POST',{});portal.connection.close();await portal.open('online');},'secondary')]);
    lobby.append(header);const columns=el('div',{class:'lobby-teams'});
    for(const [zone,label,players,team] of [['HOME','MANDANTE',room.homePlayers,room.homeTeam],['AWAY','VISITANTE',room.awayPlayers,room.awayTeam],['SPECTATORS','ESPECTADORES',room.spectators,null]]){
     const side=zone==='AWAY'?1:0,section=el('section',{class:'lobby-zone '+(zone==='SPECTATORS'?'spectator-zone':''),'data-drop-zone':zone});
     if(team)section.style.setProperty('--team-color',team.primaryColor);
     const top=el('div',{class:'team-heading'},[el('small',{text:label}),el('h3',{text:team?.name||'Assistindo à partida'})]);
     if(team){const preview=el('canvas',{width:80,height:80});root.MaxballGame.teamSkin(preview,team);top.prepend(preview);if(host&&waiting)top.append(button('Trocar equipe',()=>{const old=section.querySelector('.team-drawer');if(old)old.remove();else section.append(selector(room,side));},'secondary'));}
     section.append(top);
     for(const p of players){
      const item=el('div',{class:'lobby-player',...(host&&waiting?{'data-drag-player':p.id}:{})},[el('div',{class:'shirt-token',text:p.num}),el('div',{},[el('strong',{text:p.name}),el('small',{text:(p.id===room.owner?'ANFITRIÃO · ':'')+(p.connected?'Conectado':'Reconectando…')})])]);
      if(host&&waiting){const move=select('Mover jogador','destination',[['HOME','Mandante'],['AWAY','Visitante'],['SPECTATORS','Espectador']],zone);move.onchange=()=>patch({playerId:p.id,destination:move.querySelector('select').value}).catch(portal.error);item.append(move);}
      section.append(item);
     }
     if(team)for(let i=players.length;i<room.cfg.n;i++)section.append(el('div',{class:'lobby-player bot-slot',text:'BOT · vaga disponível'}));
     if(!team&&!players.length)section.append(note('Arraste um jogador para cá para assistir.'));
     columns.append(section);
    }
    lobby.append(columns,rulesForm(room,host&&waiting,settings=>patch({settings}).catch(portal.error)),note('Código da sala: '+room.id));
    if(waiting)lobby.append(host?button('GO · Iniciar partida',async()=>{const started=await portal.api('/rooms/'+room.id+'/start','POST',{});portal.play(started);}):note('Aguardando o anfitrião iniciar.'));
    else lobby.append(button('Voltar ao campo',()=>portal.play(room)));
    portal.content.replaceChildren(lobby);clearDrag=root.MaxballRoomDrag.bind(lobby,(playerId,destination)=>patch({playerId,destination}));
   }
   portal.listenRoom(room=>{if(room.id===data.current.id)render(room);});portal.onLeave(()=>{clearDrag();portal.listenRoom(null);});render(data.current);return;
  }
  portal.content.append(card('Sala personalizada',note('Monte as equipes, escolha regras e jogue com seus amigos.'),form([field('Nome da sala','name','text','Sala MAXBALL',{required:'',minlength:3,maxlength:40}),field('Senha (opcional)','password','password','',{maxlength:64,autocomplete:'new-password'}),select('Jogadores por time','n',[[1,'1 × 1'],[2,'2 × 2'],[3,'3 × 3'],[4,'4 × 4']],4),select('Duração','time',[[60,'1 minuto'],[180,'3 minutos'],[300,'5 minutos']],180),select('Campo','fs',[[0,'Normal'],[1,'Grande'],[2,'Enorme']],0)],'Criar sala',async values=>{await portal.api('/rooms','POST',{...values,n:+values.n,time:+values.time,fs:+values.fs});await portal.open('online');})),card('Partida rápida',note('Encontre outro jogador para uma partida sem Elo.'),button('Buscar adversário',async()=>{const room=await portal.api('/matchmaking','POST',{});portal.play(room);await portal.open('online');})));
  const list=card('Salas disponíveis',button('Atualizar',()=>portal.open('online'),'secondary'));
  for(const room of data.rooms){const password=room.hasPassword?field('Senha da sala','password','password','',{maxlength:64}):null;const enter=async spectator=>{await portal.api('/rooms/'+room.id+'/join','POST',{password:password?.querySelector('input').value||'',spectator});await portal.open('online');};list.append(el('div',{class:'room-entry'},[el('strong',{text:room.name+(room.hasPassword?' · Protegida':'')}),note(room.players.length+'/'+room.cfg.n*2+' jogadores · '+room.roomStatus),password,room.status==='waiting'?button('Entrar',()=>enter(false),'secondary'):null,button('Assistir',()=>enter(true),'secondary')]));}
  if(!data.rooms.length)list.append(note('Nenhuma sala aberta. Crie a primeira.'));portal.content.append(list);
 };
})(globalThis);
