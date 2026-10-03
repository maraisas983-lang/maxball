(function(root){
 'use strict';
 const {el,button,card,note,field,select,form,table,metrics,celebrate}=root.MaxballUI;
 root.MaxballViews.career=async portal=>{
  const data=await portal.api('/career'),clubs=new Map(data.clubs.map(c=>[c.id,c]));
  if(portal.newCareer)data.career=null;
  const clubName=id=>clubs.get(id)?.name||id;
  if(!data.career){
   const category=select('Competição','category',[['BRASILEIRÃO','Brasileirão Série A 2026'],['MAMOBALL','Mamoball']], 'BRASILEIRÃO'),clubSelect=select('Clube inicial','clubId',data.clubs.filter(c=>c.category==='BRASILEIRÃO').map(c=>[c.id,c.name]));category.onchange=()=>{const selectNode=clubSelect.querySelector('select');selectNode.replaceChildren(...data.clubs.filter(c=>c.category===category.querySelector('select').value).map(c=>el('option',{value:c.id,text:c.name})));};
   portal.content.append(card('Sua história começa aqui',note('Escolha seu nome, sua camisa e o primeiro clube. Dispute temporadas e construa sua trajetória até a Bola de Ouro.'),
    form([field('Nome do save','saveName','text','Nova carreira',{required:'',maxlength:40}),field('Nome na camisa','name','text',portal.account.profile.shirt_name,{required:'',minlength:3,maxlength:14}),field('Número','shirtNumber','number',portal.account.profile.shirt_number,{min:1,max:99,required:''}),category,clubSelect],'Criar carreira',async values=>{await portal.api('/career','POST',{name:values.name,saveName:values.saveName,clubId:values.clubId,shirtNumber:+values.shirtNumber});await portal.refreshAccount();await portal.open('career');})),button('Ver meus saves',()=>portal.open('careerSaves'),'secondary'));
   return;
  }
  const {career,current}=data,next=current.schedule.find(f=>f.status==='PENDING');
  portal.content.append(button('Trocar carreira / saves',()=>portal.open('careerSaves'),'secondary'));
  const crest=el('canvas',{width:100,height:100});root.MaxballGame.teamCrest(crest,root.MaxballTeams.fromClub(clubs.get(career.club_id)));
  const hero=el('article',{class:'career-hero'},[el('p',{class:'eyebrow',text:career.save_name+' · TEMPORADA '+career.season}),el('h2',{text:clubName(career.club_id)}),note(career.player_name+' · #'+career.shirt_number),metrics([['Gols',current.stats.goals],['Assistências',current.stats.assists],['Nota média',current.stats.averageRating],['Reputação',career.reputation.toFixed(1)],['Dinheiro do clube',career.money]])]);
  hero.prepend(crest);portal.content.append(hero);
  portal.content.append(card('Elenco do save',note(data.ratingMethodology),data.rosterInfo?note('Jogadores selecionados para 5v5 · referência: '+(data.rosterInfo.referenceDate||data.rosterInfo.verifiedAt)):note('Elenco fictício de adaptação MAXBALL'),table(['Jogador','Posição','Nota de jogo'],career.roster.map(p=>[p.name,p.role,p.rating])),el('details',{},[el('summary',{text:'Atributos de jogo'}),table(['Jogador','Velocidade','Aceleração','Chute','Passe','Defesa'],career.roster.map(p=>[p.name,p.attributes?.speed??70,p.attributes?.acceleration??70,p.attributes?.shooting??70,p.attributes?.passing??70,p.attributes?.defense??70]))])));
  if(next)portal.content.append(card('Próxima partida',el('p',{class:'fixture-title',text:clubName(career.club_id)+' × '+clubName(next.opponent)}),note(next.stage+' · '+({league:'Liga MAX',cup:'Copa MAX',continental:'Continental',world:'Mundial'})[next.competition]),button('Entrar em campo',async()=>{const room=await portal.api('/career/play','POST',{});portal.play(room);})));
  else portal.content.append(card('Temporada concluída',note('Confira suas conquistas e as propostas antes de iniciar a próxima temporada.'),button('Ver cerimônia',()=>celebrate(data.trophies.filter(t=>t.season===career.season))),button('Iniciar temporada '+(career.season+1),async()=>{await portal.api('/career/season','POST',{});await portal.open('career');},'secondary')));
  portal.content.append(card('Objetivo da temporada',note(career.reputation<40?'Evolua sua reputação, conquiste títulos e atraia clubes de maior prestígio.':'Dispute as maiores competições e combine gols, assistências e notas altas na busca da Bola de Ouro.')),
   card('Classificação · Liga MAX',table(['Clube','J','P','SG'],current.table.map(t=>[clubName(t.clubId),t.played,t.points,t.gf-t.ga]))),
   card('Calendário',table(['Competição / fase','Adversário','Resultado','Nota'],current.schedule.map(f=>[f.stage,f.status==='BYE'?'Folga':clubName(f.opponent),(f.score?f.score.join(' × ')+(f.penalties?' (pên. '+f.penalties.join(' × ')+')':''):'')||(f.status==='ELIMINATED'?'Eliminado':'A jogar'),f.rating||'—']))));
  const offers=card('Propostas de transferência');
  const pending=data.offers.filter(o=>o.status==='PENDING');
  if(!pending.length)offers.append(note('Seu desempenho ao longo da temporada pode atrair novos clubes.'));
  for(const offer of pending)offers.append(el('div',{class:'offer'},[el('strong',{text:clubName(offer.to_club)}),note(offer.reason+' Válida até '+new Date(offer.expires_at).toLocaleDateString('pt-BR')),button('Aceitar',async()=>{await portal.api('/career/offers/'+offer.id,'POST',{accept:true});await portal.open('career');}),button('Recusar',async()=>{await portal.api('/career/offers/'+offer.id,'POST',{accept:false});await portal.open('career');},'secondary')]));
  portal.content.append(offers,card('Histórico de temporadas',table(['Temporada','Clube','J','G','A','Nota','Títulos'],data.history.map(s=>[s.season,clubName(s.club_id),s.stats.matches,s.stats.goals,s.stats.assists,s.stats.averageRating,s.stats.titles]))),card('Histórico de transferências',data.transfers.length?table(['Temporada','Origem','Destino'],data.transfers.map(t=>[t.season,clubName(t.from_club),clubName(t.to_club)])):note('Toda grande carreira tem um primeiro clube.')));
 };
 root.MaxballViews.newCareer=portal=>root.MaxballViews.career({...portal,newCareer:true});
 root.MaxballViews.careerSaves=async portal=>{
  const {saves}=await portal.api('/career/saves');
  portal.content.append(card('Suas carreiras',note('Cada save guarda seu clube, jogador, temporada, dinheiro e histórico.'),button('Nova carreira',()=>portal.open('newCareer'))));
  for(const s of saves){const box=card(s.save_name,note(s.player_name+' · Temporada '+s.season+' · '+s.stats.matches+' partidas'),note('Último acesso: '+new Date(s.last_access).toLocaleString('pt-BR')),button('Carregar carreira',async()=>{await portal.api('/career/saves/'+s.id+'/select','POST',{});await portal.open('career');}),form([field('Nome do save','name','text',s.save_name,{required:'',maxlength:40})],'Renomear',async v=>{await portal.api('/career/saves/'+s.id,'PATCH',v);await portal.open('careerSaves');}),button('Excluir carreira',()=>{const dialog=el('dialog',{class:'legal-dialog'},[el('h2',{text:'Excluir '+s.save_name+'?'}),note('O progresso e as conquistas deste save serão excluídos.'),button('Confirmar exclusão',async()=>{await portal.api('/career/saves/'+s.id,'DELETE',{confirm:true});dialog.close();dialog.remove();await portal.open('careerSaves');},'danger'),button('Cancelar',()=>{dialog.close();dialog.remove();},'secondary')]);document.body.append(dialog);dialog.showModal();},'danger'));portal.content.append(box);}
 };
 root.MaxballViews.gallery=async portal=>{
  const {achievements}=await portal.api('/profile');
  portal.content.append(card('Galeria de conquistas',note('Troféus, prêmios e marcos da sua carreira ficam guardados aqui.')));
  if(!achievements.length)portal.content.append(note('Entre em campo para conquistar seu primeiro marco.'));
  for(const trophy of achievements){
   const details=JSON.parse(trophy.details);
   portal.content.append(card((trophy.code==='BALLON_DOR'?'⚽ ':trophy.kind==='TROPHY'?'🏆 ':'★ ')+trophy.name,note(trophy.season?'Temporada '+trophy.season:'Conquista da conta'),note(new Date(trophy.created_at).toLocaleDateString('pt-BR')),button('Ver conquista',()=>celebrate([trophy]),'secondary'),el('details',{},[el('summary',{text:'Detalhes'}),el('pre',{text:JSON.stringify(details,null,2)})])));
  }
 };
})(globalThis);
