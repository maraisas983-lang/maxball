(function(root){
 'use strict';
 const {el,button,card,note,field,select,form}=root.MaxballUI;
 root.MaxballViews.online=async portal=>{
  const data=await portal.api('/rooms');
  portal.connection.connect();
  if(data.current){
   const room=data.current;
   portal.content.append(card(room.name,note(room.players.map(p=>p.name+' #'+p.num+' · time '+(p.team+1)+(p.connected?' ●':' ○')).join(' / ')),note(room.cfg.n+'v'+room.cfg.n+' · '+room.cfg.time/60+' min'),note('Código da sala: '+room.id),
    room.status==='waiting'&&room.owner===portal.account.user.id?button('Iniciar partida',async()=>{await portal.api('/rooms/'+room.id+'/start','POST',{});portal.connection.socket?.send(JSON.stringify({type:'subscribe'}));}):note(room.status==='waiting'?'Aguardando o anfitrião…':'Partida em andamento'),
    button('Sair da sala',async()=>{await portal.api('/rooms/leave','POST',{});portal.connection.close();await portal.open('online');},'secondary')));
   return;
  }
  portal.content.append(card('Encontre seu próximo adversário',note('Entre em uma sala ou encontre uma partida rápida. Controles: WASD/setas, F para chutar e G para passar.'),button('Partida rápida',async()=>{const room=await portal.api('/matchmaking','POST',{});portal.play(room);await portal.open('online');})),
   card('Criar sala',form([field('Nome','name','text','Sala MAXBALL',{required:'',minlength:3,maxlength:40}),select('Jogadores por time','n',[[1,'1v1'],[2,'2v2'],[3,'3v3'],[4,'4v4']],2),select('Duração','time',[[60,'1 minuto'],[180,'3 minutos'],[300,'5 minutos']],180),select('Campo','fs',[[0,'Normal'],[1,'Grande'],[2,'Enorme']],0),select('Desempate','gold',[[0,'Permitir empate'],[1,'Gol de ouro']],0)],'Criar sala',async values=>{const room=await portal.api('/rooms','POST',{...values,n:+values.n,time:+values.time,fs:+values.fs,gold:+values.gold});portal.play(room);await portal.open('online');})));
  const list=card('Salas disponíveis',button('Atualizar',()=>portal.open('online'),'secondary'));
  if(!data.rooms.length)list.append(note('Nenhuma sala aberta. Crie a primeira.'));
  for(const room of data.rooms)list.append(el('div',{class:'room-row'},[el('span',{text:room.name+' · '+room.players.length+'/'+room.cfg.n*2}),button('Entrar',async()=>{await portal.api('/rooms/'+room.id+'/join','POST',{});await portal.open('online');},'secondary')]));
  portal.content.append(list);
 };
})(globalThis);
