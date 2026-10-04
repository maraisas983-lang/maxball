(function(root){
 const {el,note,metrics,table}=root.MaxballUI;
 function show(result){
  let box=document.querySelector('#result-details');if(!box){box=el('div',{id:'result-details'});document.querySelector('#rs').after(box);}
  box.dataset.matchId=result.matchId;box.replaceChildren();
  if(result.reason==='GOLDEN_GOAL')box.append(note('Vitória decidida pelo gol de ouro no segundo tempo.'));
  if(result.stats?.grade!==undefined)box.append(el('h3',{text:'Sua nota: '+result.stats.grade.toFixed(1)}));
  if(result.mvp)box.append(el('article',{class:'mvp-result'},[el('h3',{text:'MVP · '+result.mvp.name+' · '+result.mvp.grade.toFixed(1)}),note(result.mvp.goals+' gols · '+result.mvp.assists+' assistências · '+result.mvp.saves+' defesas · '+result.mvp.interceptions+' interceptações')]));
  if(result.stats)box.append(metrics([['Gols',result.stats.goals],['Assistências',result.stats.assists],['Chutes',result.stats.shots],['Passes',result.stats.passes]]));
  if(result.rankedProgress){const p=result.rankedProgress;box.append(el('h3',{text:root.MaxballRanks.rank(p.trophies_after).name+' · '+p.trophies_after+' troféus'}),note('Troféus: '+p.trophies_before+' → '+p.trophies_after+' · +'+p.gems+' gemas'+(p.mvp?' · Bônus MVP':'')));}
  if(result.rating){const r=result.rating,next=(Math.floor(r.after/200)+1)*200;box.append(el('h3',{text:'Elo '+r.before+' → '+r.after+' ('+(r.delta>=0?'+':'')+r.delta+')'}),note('Próxima faixa: '+next+' pontos'),el('progress',{max:200,value:r.after%200}));}
  if(result.career)box.append(note('Carreira · temporada '+result.career.season+' · reputação '+result.career.reputation.toFixed(1)),note('Próximo objetivo: '+(result.career.reputation<40?'evoluir a reputação e conquistar títulos.':'buscar notas altas e a Bola de Ouro.')));
  if(result.progress)box.append(note('Nível '+result.progress.level+' · '+result.progress.xp+' XP'));
  if(result.players)box.append(el('details',{},[el('summary',{text:'Estatísticas da partida'}),table(['Jogador','Nota','Gols','Assistências','Defesas','Recuperações','Interceptações'],result.players.map(p=>[p.name,p.grade?.toFixed(1)||'—',p.goals,p.assists,p.saves,p.recoveries,p.interceptions]))]));
 }
 root.MaxballResults={show,clear(){document.querySelector('#result-details')?.remove();}};
})(globalThis);
