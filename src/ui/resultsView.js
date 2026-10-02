(function(root){
 const {el,note,metrics,table}=root.MaxballUI;
 function show(result){
  let box=document.querySelector('#result-details');if(!box){box=el('div',{id:'result-details'});document.querySelector('#rs').after(box);}
  box.dataset.matchId=result.matchId;box.replaceChildren();
  if(result.stats)box.append(metrics([['Gols',result.stats.goals],['Assistências',result.stats.assists],['Chutes',result.stats.shots],['Passes',result.stats.passes]]));
  if(result.rating){const r=result.rating,next=(Math.floor(r.after/200)+1)*200;box.append(el('h3',{text:'Elo '+r.before+' → '+r.after+' ('+(r.delta>=0?'+':'')+r.delta+')'}),note('Próxima faixa: '+next+' pontos'),el('progress',{max:200,value:r.after%200}));}
  if(result.career)box.append(note('Carreira · temporada '+result.career.season+' · reputação '+result.career.reputation.toFixed(1)),note('Próximo objetivo: '+(result.career.reputation<40?'evoluir a reputação e conquistar títulos.':'buscar notas altas e a Bola de Ouro.')));
  if(result.progress)box.append(note('Nível '+result.progress.level+' · '+result.progress.xp+' XP'));
  if(result.players)box.append(el('details',{},[el('summary',{text:'Estatísticas da partida'}),table(['Jogador','Gols','Assistências','Chutes','Passes'],result.players.map(p=>[p.name,p.goals,p.assists,p.shots,p.passes]))]));
 }
 root.MaxballResults={show,clear(){document.querySelector('#result-details')?.remove();}};
})(globalThis);
