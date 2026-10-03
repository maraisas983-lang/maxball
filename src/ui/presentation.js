(function(root){
 let current=null,box=null,label=null,progress=null;
 function update(state,userId){
  const node=document.querySelector('#versus');
  if(state.G.phase!=='starting'){node.hidden=true;current=null;return;}
  node.hidden=!['PREPARE','LINEUP','STADIUM'].includes(state.G.startStage)||state.cfg.career&&state.G.startStage==='LINEUP';
  node.dataset.stage=state.G.startStage||'PREPARE';
  if(current!==state.matchId){
   current=state.matchId;const {el}=root.MaxballUI;node.replaceChildren();
   node.append(el('div',{class:'vs-brand',text:'MAXBALL'}));
   for(let side=0;side<2;side++){
    const fallback=root.MaxballTeams.kits[state.cfg['sk'+side]||side],team=state.cfg.teams?.[side]||{name:state.cfg.labels?.[side]||fallback.n,primaryColor:fallback.c[0],secondaryColor:fallback.c[1]||'#fff',accentColor:fallback.c[2]||'#fff',kitStyle:'HALF'};
    const section=el('section',{class:'vs-team vs-'+side});section.style.setProperty('--vs-color',team.primaryColor);
    const crest=el('canvas',{width:150,height:150});root.MaxballGame.teamCrest(crest,team);section.append(crest,el('h2',{text:team.name}));
    const cards=el('div',{class:'vs-players'});for(const p of state.P.filter(p=>p.team===side))cards.append(el('div',{class:'vs-player'},[el('span',{class:'vs-number',text:p.num}),el('strong',{text:p.displayName||p.name}),el('small',{text:p.id===userId?'VOCÊ':p.ctrl==='ai'?'BOT':'JOGADOR'})]));section.append(cards);node.append(section);
   }
   box=root.MaxballUI.el('div',{class:'vs-count'});label=root.MaxballUI.el('strong');progress=root.MaxballUI.el('progress',{max:root.MaxballConfig.match.introSeconds});box.append(label,progress);node.append(root.MaxballUI.el('div',{class:'vs-sign',text:'VS'}),box);
  }
  const text=state.G.startStage==='LINEUP'?state.cfg.n+' × '+state.cfg.n+' · '+(state.cfg.career?'CARREIRA':state.cfg.ranked?'RANQUEADA':'SALA PERSONALIZADA'):state.cfg.career?'TRANSMISSÃO MAXBALL · BRASILEIRÃO':'PREPARANDO A PARTIDA';if(label.textContent!==text)label.textContent=text;progress.max=state.G.startDuration||root.MaxballConfig.match.introSeconds;progress.value=progress.max-state.G.startRemaining;
 }
 root.MaxballPresentation={update};
})(globalThis);
