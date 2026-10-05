(function(root){
 'use strict';
 let key='',rows=[],status;
 function update(state,userId){const node=document.querySelector('#penalty-hud'),s=state.G.penalties;node.hidden=state.G.phase!=='penalties';if(node.hidden||!s)return;
  const history=s.history||[[],[]],round=Math.max(5,...s.taken,s.taken[s.turn]+(s.result===null?1:0)),first=Math.max(0,round-5),next=[state.matchId,s.attempt,s.result,Math.ceil(s.time),s.score.join(','),history.map(a=>a.join(',')).join('|'),userId].join(':');if(next===key)return;key=next;
  const {el}=root.MaxballUI;node.replaceChildren();node.append(el('strong',{class:'penalty-title',text:round>5?'PÊNALTIS · ALTERNADAS':'DISPUTA DE PÊNALTIS'}));rows=[];
  for(let team=0;team<2;team++){const row=el('div',{class:'penalty-team'}),name=state.G.cfg.teams?.[team]?.name||state.G.cfg.labels?.[team]||(team?'Visitante':'Mandante');row.append(el('span',{class:'penalty-team-name',text:name}),el('b',{text:String(s.score[team])}));const dots=el('div',{class:'penalty-dots'});
   for(let i=first;i<first+5;i++){const result=history[team][i],active=s.turn===team&&s.taken[team]===i&&s.result===null;dots.append(el('span',{class:'penalty-dot '+(result===true?'scored':result===false?'missed':active?'current':'pending'),text:result===true?'✓':result===false?'×':String(i+1),'aria-label':'Cobrança '+(i+1)+': '+(result===true?'gol':result===false?'perdida':active?'cobrando':'aguardando')}));}row.append(dots);rows.push(row);node.append(row);}
  const shooter=state.P.find(p=>p.id===s.shooter),role=userId===s.shooter?'Você cobra: mova e chute':userId===s.keeper?'Você defende: cima / baixo':'Acompanhe a cobrança',result=s.result==='GOAL'?'GOL':s.result==='MISS'?'DEFESA / FORA':Math.ceil(Math.max(0,root.MaxballConfig.match.penaltySeconds-s.time))+'s';status=el('small',{class:'penalty-status',text:(shooter?.displayName||shooter?.name||'')+' · '+result+' · '+role});node.append(status);
 }
 root.MaxballPenaltyScoreboard={update};
})(globalThis);
