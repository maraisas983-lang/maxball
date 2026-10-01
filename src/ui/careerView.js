(function(root){
 'use strict';
 const {el,button,card,note,field,select,form,table,metrics,celebrate}=root.MaxballUI;
 root.MaxballViews.career=async portal=>{
  const data=await portal.api('/career'),clubs=new Map(data.clubs.map(c=>[c.id,c]));
  const clubName=id=>clubs.get(id)?.name||id;
  if(!data.career){
   portal.content.append(card('Sua história começa aqui',note('Escolha seu nome, sua camisa e o primeiro clube. Dispute temporadas e construa sua trajetória até a Bola de Ouro.'),
    form([field('Nome na camisa','name','text',portal.account.profile.shirt_name,{required:'',minlength:3,maxlength:14}),field('Número','shirtNumber','number',portal.account.profile.shirt_number,{min:1,max:99,required:''}),select('Clube inicial','clubId',data.clubs.filter(c=>c.prestige<=2).map(c=>[c.id,c.name+' · '+c.prestige+' ★']))],'Criar carreira',async values=>{await portal.api('/career','POST',{...values,shirtNumber:+values.shirtNumber});await portal.refreshAccount();await portal.open('career');})));
   return;
  }
  const {career,current}=data,next=current.schedule.find(f=>f.status==='PENDING');
  const hero=el('article',{class:'career-hero'},[el('p',{class:'eyebrow',text:'TEMPORADA '+career.season}),el('h2',{text:clubName(career.club_id)}),note(portal.account.profile.shirt_name+' · #'+portal.account.profile.shirt_number),metrics([['Gols',current.stats.goals],['Assistências',current.stats.assists],['Nota média',current.stats.averageRating],['Reputação',career.reputation.toFixed(1)]])]);
  portal.content.append(hero);
  if(next)portal.content.append(card('Próxima partida',el('p',{class:'fixture-title',text:clubName(career.club_id)+' × '+clubName(next.opponent)}),note(next.stage+' · '+({league:'Liga MAX',cup:'Copa MAX',continental:'Continental',world:'Mundial'})[next.competition]),button('Entrar em campo',async()=>{const room=await portal.api('/career/play','POST',{});portal.play(room);})));
  else portal.content.append(card('Temporada concluída',note('Confira suas conquistas e as propostas antes de iniciar a próxima temporada.'),button('Ver cerimônia',()=>celebrate(data.trophies.filter(t=>t.season===career.season))),button('Iniciar temporada '+(career.season+1),async()=>{await portal.api('/career/season','POST',{});await portal.open('career');},'secondary')));
  portal.content.append(card('Objetivo da temporada',note(career.reputation<40?'Evolua sua reputação, conquiste títulos e atraia clubes de maior prestígio.':'Dispute as maiores competições e combine gols, assistências e notas altas na busca da Bola de Ouro.')),
   card('Classificação · Liga MAX',table(['Clube','J','P','SG'],current.table.map(t=>[clubName(t.clubId),t.played,t.points,t.gf-t.ga]))),
   card('Calendário',table(['Competição / fase','Adversário','Resultado','Nota'],current.schedule.map(f=>[f.stage,clubName(f.opponent),f.score?.join(' × ')||(f.status==='ELIMINATED'?'Eliminado':'A jogar'),f.rating||'—']))));
  const offers=card('Propostas de transferência');
  const pending=data.offers.filter(o=>o.status==='PENDING');
  if(!pending.length)offers.append(note('Seu desempenho ao longo da temporada pode atrair novos clubes.'));
  for(const offer of pending)offers.append(el('div',{class:'offer'},[el('strong',{text:clubName(offer.to_club)}),note(offer.reason+' Válida até '+new Date(offer.expires_at).toLocaleDateString('pt-BR')),button('Aceitar',async()=>{await portal.api('/career/offers/'+offer.id,'POST',{accept:true});await portal.open('career');}),button('Recusar',async()=>{await portal.api('/career/offers/'+offer.id,'POST',{accept:false});await portal.open('career');},'secondary')]));
  portal.content.append(offers,card('Histórico de temporadas',table(['Temporada','Clube','J','G','A','Nota','Títulos'],data.history.map(s=>[s.season,clubName(s.club_id),s.stats.matches,s.stats.goals,s.stats.assists,s.stats.averageRating,s.stats.titles]))),card('Histórico de transferências',data.transfers.length?table(['Temporada','Origem','Destino'],data.transfers.map(t=>[t.season,clubName(t.from_club),clubName(t.to_club)])):note('Toda grande carreira tem um primeiro clube.')));
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
