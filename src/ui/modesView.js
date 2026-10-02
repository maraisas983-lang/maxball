(function(root){
 const {el,card,note,button,select,form}=root.MaxballUI;
 root.MaxballViews.play=async portal=>{
  const grid=el('div',{class:'mode-grid'});
  for(const [key,title,description] of [['ranked','Ranqueada','Encontre um adversário e dispute Elo.'],['online','Sala personalizada','Convide amigos, monte equipes e escolha as regras.'],['career','Carreira 5v5','Evolua com seu clube, temporada após temporada.'],['training','Treino','Escolha campo, bola, dificuldade e bots.'],['local','Local','Dois jogadores no mesmo teclado ou você contra bots.'],['quick','Partida rápida','Um duelo casual online sem disputar Elo.'],['support','Suporte','Abra chamados e converse com a equipe.']]){
   const entry=card(title,note(description),button('Abrir '+title,()=>portal.open(key)));
   entry.classList.add('mode-door');entry.dataset.mode=key;
   entry.prepend(el('span',{class:'mode-mark','aria-hidden':'true',text:root.MaxballLobby.identities[key][4]}));grid.append(entry);
  }
  portal.content.append(grid);
  if(portal.account&&['ADMIN','SUPER_ADMIN','OWNER','MODERATOR','SUPPORT'].includes(portal.account.user.role))portal.content.append(button('Command Center',()=>portal.open('command'),'secondary'));
 };
 root.MaxballViews.quick=portal=>portal.content.append(card('Pronto para um duelo?',note('Você será encaminhado para uma sala casual. Quando o adversário chegar, a partida poderá começar.'),button('Buscar adversário',async()=>{const room=await portal.api('/matchmaking','POST',{});portal.play(room);await portal.open('online');})));
 function setup(portal,training){
  const preview=el('div',{class:'field-preview','aria-label':'Prévia do campo'}),label=note('Campo normal'),teams=root.MaxballTeams.teams,teamOptions=teams.map(t=>[t.id,t.name]);
  const fields=[select('Formato','n',[1,2,3,4,5].map(n=>[n,n+' × '+n]),training?2:4),select('Campo','fs',[[0,'Normal'],[1,'Grande'],[2,'Enorme']],0),select('Dificuldade dos bots','diff',[[0,'Iniciante'],[1,'Normal'],[2,'Experiente']],1),select('Bola','ball',[[0,'Pequena'],[1,'Média'],[2,'Grande']],1),select('Tempo','time',[[60,'1 minuto'],[180,'3 minutos'],[300,'5 minutos']],180),select(training?'Bots':'Jogadores humanos','players',training?[[0,'Treino livre, sem bots'],[1,'Com bots']]:[[1,'Um jogador'],[2,'Dois jogadores']],training?1:2),select('Mandante','homeTeamId',teamOptions,teams[0].id),select('Visitante','awayTeamId',teamOptions,teams[1].id)];
  const config=form(fields,'Entrar em campo',v=>{const home=teams.find(t=>t.id===v.homeTeamId),away=teams.find(t=>t.id===v.awayTeamId),cfg={n:+v.n,fs:+v.fs,diff:+v.diff,ball:+v.ball,time:+v.time,teams:[home,root.MaxballTeams.contrast(home,away)],labels:[home.name,away.name],trainingBots:training&&+v.players===1,intro:!training};root.MaxballGame.startLocal(training?(+v.players?'bot':'train'):(+v.players===2?'local':'bot'),cfg);});
  config.querySelector('[name=fs]').onchange=e=>{const n=+e.target.value;preview.style.height=(140+n*35)+'px';label.textContent=['Campo normal','Campo grande','Campo enorme'][n];};
  portal.content.append(card(training?'Centro de treino':'Jogar local',note(training?'Pratique sem depender de conexão. Com bots, a sessão usa o tempo escolhido; treino livre não tem cronômetro.':'J1: WASD, F chute, G passe. J2: setas, Enter chute, / passe.'),preview,label,config));
 }
 root.MaxballViews.training=portal=>setup(portal,true);root.MaxballViews.local=portal=>setup(portal,false);
})(globalThis);
