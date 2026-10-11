(function(root){
 'use strict';
 const {el,button,card,note,field,select,form}=root.MaxballUI;
 function durationFields(total=360,halftime=true){
  const duration=total/(halftime?2:1),options=[[60,'1 minuto'],[180,'3 minutos'],[300,'5 minutos'],[600,'10 minutos']];
  if(!options.some(([value])=>value===duration))options.push([duration,Number.isInteger(duration/60)?duration/60+' minutos':duration+' segundos']);
  return [select('Duração de cada tempo','time',options,duration),select('Intervalo','halftime',[['true','Ligado — dois tempos'],['false','Desligado — tempo único']],String(halftime)),note('Com intervalo: dois tempos com a duração escolhida. Sem intervalo: um tempo único.')];
 }
 const ruleLabels={offside:'Impedimento',extraTime:'Prorrogação',penalties:'Disputa de pênaltis em caso de empate',penaltiesAfterExtraTime:'Pênaltis após prorrogação'};
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
   const catalog=await portal.api('/teams');let clearDrag=()=>{},lastFingerprint='',lastConfig='';
   async function patch(body){const room=await portal.api('/rooms/'+data.current.id,'PATCH',body);render(room);}
   function selector(room,side){
    const drawer=el('div',{class:'team-drawer'}),category=select('Categoria','category',[['BRASILEIRÃO','Brasileirão'],['MAMOBALL','Mamoball'],['MEUS CLUBES','Meus clubes']],room.cfg.teams[side].category),options=el('div',{class:'team-options'});
    const paint=()=>{options.replaceChildren();for(const t of catalog.filter(t=>t.category===category.querySelector('select').value)){const c=button(t.name,()=>patch({[side?'awayTeamId':'homeTeamId']:t.id}),'team-option');const preview=el('canvas',{width:54,height:54});root.MaxballGame.teamSkin(preview,t);c.prepend(preview);options.append(c);}if(!options.children.length)options.append(note('Crie um clube na aba Clubes para selecioná-lo aqui.'));};
    category.onchange=paint;drawer.append(category,options);paint();return drawer;
   }
   function render(room){
    const fingerprint=JSON.stringify(room);if(fingerprint===lastFingerprint)return;lastFingerprint=fingerprint;const cfg=JSON.stringify(room.cfg),oldForm=portal.content.querySelector('.room-settings form'),draft=oldForm&&cfg===lastConfig?Object.fromEntries(new FormData(oldForm)):null,focused=oldForm?.contains(document.activeElement)?document.activeElement.name:null;lastConfig=cfg;
    clearDrag();const host=room.owner===portal.account.user.id,manager=(host||room.referee?.id===portal.account.user.id)&&!room.cfg.championship,waiting=room.status==='waiting';
    const lobby=el('article',{class:'room-lobby'}),header=el('header',{class:'room-heading'},[el('div',{},[el('p',{class:'eyebrow',text:room.cfg.final?'GRANDE FINAL':room.cfg.friendly?'AMISTOSO ENTRE CLUBES':room.hasPassword?'SALA PROTEGIDA':'SALA PERSONALIZADA'}),el('h2',{text:room.name}),note(room.cfg.n+' × '+room.cfg.n+' · '+(room.cfg.halftime?'2 tempos de '+room.cfg.time/120+' minutos':room.cfg.time/60+' minutos (tempo único)'))]),button('Sair da sala',async()=>{await portal.api('/rooms/leave','POST',{});portal.connection.close();await portal.open('online');},'secondary')]);
    header.append(button('Chat da sala',()=>root.MaxballSocial.open(portal.content),'secondary'));if(room.coaches?.some(p=>p.id===portal.account.user.id))header.append(button('Chat dos técnicos',()=>root.MaxballSocial.openCoach(portal.content),'secondary'));lobby.append(header);const body=el('div',{class:'room-body'}),configPanel=el('aside',{class:'room-settings'});const columns=el('div',{class:'lobby-teams'});
    for(const [zone,label,players,team] of [['HOME','MANDANTE',room.homePlayers,room.homeTeam],['AWAY','VISITANTE',room.awayPlayers,room.awayTeam],['SPECTATORS','ESPECTADORES',room.spectators,null],['HOME_COACH','TÉCNICO MANDANTE',(room.coaches||[]).filter(p=>p.team===0),null],['AWAY_COACH','TÉCNICO VISITANTE',(room.coaches||[]).filter(p=>p.team===1),null],['REFEREE','ARBITRAGEM',room.referee?[room.referee]:[],null]]){
     const side=zone==='AWAY'?1:0,section=el('section',{class:'lobby-zone '+(zone==='SPECTATORS'?'spectator-zone':!team?'official-zone':''),'data-drop-zone':zone});
     if(team)section.style.setProperty('--team-color',team.primaryColor);
     const top=el('div',{class:'team-heading'},[el('small',{text:label}),el('h3',{text:team?.name||(zone==='SPECTATORS'?'Assistindo à partida':zone==='REFEREE'?'Controle da partida':'Área técnica')})]);
     if(team){const preview=el('canvas',{width:80,height:80});root.MaxballGame.teamCrest(preview,team);top.prepend(preview);if(manager&&waiting&&!room.cfg.friendly)top.append(button('Trocar equipe',()=>{const old=section.querySelector('.team-drawer');if(old)old.remove();else section.append(selector(room,side));},'secondary'));}
     section.append(top);
     for(const p of players){
      const item=el('div',{class:'lobby-player',...(manager&&waiting&&(host||p.id!==room.referee?.id)?{'data-drag-player':p.id}:{})},[el('div',{class:'shirt-token',text:p.num}),el('div',{},[el('strong',{text:p.name}),el('small',{class:'player-club',text:p.clubName||'Sem clube'}),el('span',{class:'position-tag',text:p.position||'PV'}),el('small',{text:(p.id===room.owner?'ANFITRIÃO · ':'')+(p.connected?'Conectado':'Reconectando…')})])]);
      if(manager&&waiting&&(host||p.id!==room.referee?.id)){const move=select('Mover jogador','destination',[['HOME','Mandante'],['AWAY','Visitante'],['SPECTATORS','Espectador'],['HOME_COACH','Técnico mandante'],['AWAY_COACH','Técnico visitante'],...(host?[['REFEREE','Árbitro']]:[])],zone);move.onchange=()=>patch({playerId:p.id,destination:move.querySelector('select').value}).catch(portal.error);item.append(move);}
      item.append(button('Perfil',()=>root.MaxballCollectionUI.inspect(p.id),'profile-button'));section.append(item);
     }
     if(team)for(let i=players.length;i<room.cfg.n;i++)section.append(el('div',{class:'lobby-player bot-slot',text:'BOT · vaga disponível'}));
     if(!team&&!players.length)section.append(note(zone==='SPECTATORS'?'Arraste um jogador para cá para assistir.':'O anfitrião pode designar alguém para este posto.'));
     columns.append(section);
    }
    if(manager&&waiting&&!room.cfg.friendly)configPanel.append(form([select('Formato','n',[1,2,3,4,5].map(n=>[n,n+' × '+n]),room.cfg.n),select('Estádio','stadium',root.MaxballStadiums.stadiums.map(s=>[s.id,s.name]),room.cfg.stadium||'max-arena'),select('Dificuldade dos bots','diff',[[0,'Iniciante'],[1,'Normal'],[2,'Experiente']],room.cfg.diff),...durationFields(room.cfg.time,!!room.cfg.halftime),field('Limite de gols (0 = sem limite)','goalLimit','number',room.cfg.goalLimit||0,{min:0,max:20})],'Salvar configuração',v=>patch({...v,n:+v.n,fs:0,diff:+v.diff,ball:1,time:+v.time*(v.halftime==='true'?2:1),goalLimit:+v.goalLimit,halftime:v.halftime==='true'})));
    configPanel.append(el('details',{},[el('summary',{text:'Regras da partida'}),rulesForm(room,manager&&waiting&&!room.cfg.friendly,settings=>patch({settings}).catch(portal.error))]),note('O árbitro organiza jogadores, regras e configurações antes da partida. O anfitrião atribui esse posto. Durante a partida, a pausa continua disponível à arbitragem.'));if(room.cfg.friendly)configPanel.append(note('Regras confirmadas: 4 × 4, dois tempos de 10 minutos, intervalo na sala e gol de ouro no segundo tempo.'));root.MaxballRoomExtras?.configure(configPanel,room,portal);body.append(columns,configPanel);lobby.append(body,note('Código da sala: '+room.id));
    if(waiting)lobby.append(button('Ir ao vestiário',()=>root.MaxballExperience.openLocker(room),'secondary'));
    if(room.status==='halftime'&&room.cfg.intermissionLobby)lobby.append(card('Intervalo · '+room.score.join(' × '),note('Até 5 minutos no vestiário, com chat da sala e substituições. O segundo tempo mantém o placar.'),button('Entrar no vestiário',()=>root.MaxballExperience.openLocker(room),'secondary'),(room.referee?.id||room.owner)===portal.account.user.id?button('Iniciar segundo tempo',async()=>{const started=await portal.api('/rooms/'+room.id+'/start','POST',{});portal.play(started);}):note('O árbitro pode antecipar a retomada; após 5 minutos ela é automática.')));
    if(waiting&&room.cfg.championship)lobby.append(note('Confronto oficial: a partida começa automaticamente no horário acordado quando os dois elencos estão presentes.'));
    else if(waiting)lobby.append((host||room.cfg.friendly&&manager)?button('GO · Iniciar partida',async()=>{const started=await portal.api('/rooms/'+room.id+'/start','POST',{});portal.play(started);}):note('Aguardando o anfitrião iniciar.'));
    else if(room.status!=='halftime')lobby.append(button('Voltar ao campo',()=>portal.play(room)));
    portal.content.replaceChildren(lobby);if(draft)for(const [name,value] of Object.entries(draft)){const input=lobby.querySelector('[name='+name+']');if(input)input.value=value;}if(focused)lobby.querySelector('[name='+focused+']')?.focus();clearDrag=root.MaxballRoomDrag.bind(lobby,(playerId,destination)=>patch({playerId,destination}));
   }
   portal.listenRoom(room=>{if(room.id===data.current.id)render(room);});portal.onLeave(()=>{clearDrag();portal.listenRoom(null);});render(data.current);return;
  }
  portal.content.append(card('Sala personalizada',note('Monte as equipes, escolha regras e jogue com seus amigos.'),form([field('Nome da sala','name','text','Sala MAXBALL',{required:'',minlength:3,maxlength:40}),field('Senha (opcional)','password','password','',{maxlength:64,autocomplete:'new-password'}),select('Jogadores por time','n',[[1,'1 × 1'],[2,'2 × 2'],[3,'3 × 3'],[4,'4 × 4'],[5,'5 × 5']],4),select('Estádio','stadium',root.MaxballStadiums.stadiums.map(s=>[s.id,s.name]),'max-arena'),...durationFields()],'Criar sala',async values=>{await portal.api('/rooms','POST',{...values,n:+values.n,time:+values.time*(values.halftime==='true'?2:1),halftime:values.halftime==='true',fs:0});await portal.open('online');})),card('Partida rápida',note('Encontre outro jogador para uma partida sem Elo.'),button('Buscar adversário',async()=>{const room=await portal.api('/matchmaking','POST',{});portal.play(room);await portal.open('online');})));
  const search=field('Procurar sala por nome ou código','roomSearch','search',''),list=card('Salas disponíveis',search,button('Atualizar',()=>portal.open('online'),'secondary'));
  for(const room of data.rooms){const password=room.hasPassword?field('Senha da sala','password','password','',{maxlength:64}):null;const enter=async spectator=>{await portal.api('/rooms/'+room.id+'/join','POST',{password:password?.querySelector('input').value||'',spectator});await portal.open('online');};list.append(el('div',{class:'room-entry','data-room-search':(room.name+' '+room.id).toLocaleLowerCase()},[el('strong',{text:room.name+(room.hasPassword?' · Protegida':'')}),note(room.players.length+'/'+room.cfg.n*2+' jogadores · '+room.roomStatus),password,room.status==='waiting'?button('Entrar',()=>enter(false),'secondary'):null,button('Assistir',()=>enter(true),'secondary')]));}
  search.oninput=()=>{const q=search.querySelector('input').value.toLocaleLowerCase().trim();for(const row of list.querySelectorAll('.room-entry'))row.hidden=!row.dataset.roomSearch.includes(q);};if(!data.rooms.length)list.append(note('Nenhuma sala aberta. Crie a primeira.'));portal.content.append(list);
 };
})(globalThis);
