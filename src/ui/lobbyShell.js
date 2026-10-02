(function(root){
 'use strict';
 const {el,button}=root.MaxballUI;
 const identities={
  play:['Jogar','SEU PRÓXIMO DESTINO','Escolha onde entrar em campo.','Cada modo tem seu próprio espaço, regras e preparação.','M'],
  ranked:['Ranqueada','ARENA COMPETITIVA','Entre para disputar seu lugar.','4 × 4 · três minutos · partidas que valem Elo.','★'],
  career:['Carreira','VESTIÁRIO DO CLUBE','Sua história começa no clube.','Prepare a próxima rodada, acompanhe a temporada e conquiste seu espaço.','10'],
  training:['Treino','CENTRO DE TREINAMENTO','Encontre seu ritmo.','Teste passes, chutes e formações em um campo preparado por você.','◎'],
  local:['Local','ENCONTRO NO SOFÁ','Divida o teclado. Dispute o campo.','Monte o confronto para dois jogadores ou desafie os bots.','1 / 2'],
  online:['Salas personalizadas','PONTO DE ENCONTRO','Seu grupo. Suas regras.','Crie uma sala, escolha os times e convide seus amigos.','+'],
  quick:['Partida rápida','CAMPO CASUAL','Encontre alguém para jogar.','Um duelo online casual para entrar em campo sem disputar Elo.','VS'],
  support:['Suporte','CENTRAL DE ATENDIMENTO','Como podemos ajudar?','Abra um chamado ou acompanhe suas conversas com a equipe MAXBALL.','?'],
  clubs:['Clubes','SEDE DO CLUBE','Jogue com a sua comunidade.','Gerencie seu clube e encontre seu time.','C'],
  shop:['Loja','ESTILO EM CAMPO','Escolha sua identidade.','Explore os cosméticos disponíveis para o seu jogador.','◇'],
  inventory:['Inventário','SEU ARMÁRIO','Prepare seu visual.','Equipe os itens da sua coleção.','◇'],
  profile:['Perfil','CARTÃO DO JOGADOR','Sua identidade MAXBALL.','Personalize seu jogador e acompanhe suas conquistas.','M'],
  gallery:['Galeria','SALA DE TROFÉUS','Guarde suas conquistas.','Veja a sua coleção de momentos e troféus.','★'],
  login:['Conta','BEM-VINDO AO MAXBALL','Entre para jogar.','Sua conta conecta você à comunidade MAXBALL.','M']
 };
 root.MaxballLobby={identities,mount(shell,content,nav,page,open){
  const command=page==='command'||page==='admin';
  shell.classList.toggle('command-mode',page==='command');
  shell.classList.toggle('mode-lobby',!command);
  shell.dataset.lobby=page;
  nav.replaceChildren();
  shell.scrollTop=0;
  if(command){shell.querySelector('.portal-brand').replaceChildren(el('span',{text:'MAXBALL'}),el('small',{text:'Command Center'}));return;}
  const [name,tag,title,description,mark]=identities[page]||identities.login;
  shell.querySelector('.portal-brand').replaceChildren(el('span',{text:'MAXBALL'}),el('small',{text:name}));
  nav.setAttribute('aria-label','Navegação de '+name);
  nav.append(button(page==='play'?'Voltar ao menu':'← Escolher modo',()=>page==='play'?document.querySelector('#portal-home').click():open('play'),'secondary'));
  nav.append(el('span',{class:'lobby-location',text:name,'aria-current':'page'}));
  content.append(el('section',{class:'lobby-cover','aria-label':'Lobby de '+name},[
   el('div',{class:'lobby-copy'},[el('p',{class:'eyebrow',text:tag}),el('h1',{text:title}),el('p',{class:'lobby-description',text:description})]),
   el('div',{class:'lobby-emblem','aria-hidden':'true'},[el('span',{text:mark}),el('small',{text:name})])
  ]));
 }};
})(globalThis);
