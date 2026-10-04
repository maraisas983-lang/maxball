(function(root){
 'use strict';
 const field=typeof module!=='undefined'?require('./field.js'):root.MaxballField;
 const weights=Object.freeze({goals:.65,assists:.5,shotsOnTarget:.1,saves:.3,keyPasses:.2,interceptions:.2,recoveries:.1,tackles:.12,chancesCreated:.2,successfulPasses:.04,turnovers:-.12,errors:-.45,fouls:-.15,goalsConceded:-.12});
 const caps=Object.freeze({goals:4,assists:4,shotsOnTarget:8,saves:8,keyPasses:6,interceptions:8,recoveries:8,tackles:8,chancesCreated:6,successfulPasses:12,turnovers:8,errors:4,fouls:6,goalsConceded:6});
 const empty=()=>Object.fromEntries(['goals','assists','shots','passes','inputs',...Object.keys(weights)].map(k=>[k,0]));
 function grade(stats,won,draw){let value=6+(won?.4:draw?.1:-.25);for(const [key,weight] of Object.entries(weights))value+=Math.min(caps[key],Math.max(0,stats[key]||0))*weight;return Math.round(Math.max(1,Math.min(10,value))*10)/10;}
 function finalize(players,stats,winner){const results=players.map(p=>({id:p.id,name:p.displayName||p.name,team:p.team,...stats[p.id],grade:grade(stats[p.id]||{},winner===p.team,winner==null)}));results.sort((a,b)=>b.grade-a.grade||String(a.id).localeCompare(String(b.id)));for(const p of results)stats[p.id].grade=p.grade;return {players:results,mvp:results[0]||null};}
 function touch(state,p,stats){const ball=state.ball,now=state.G.elapsed||state.G.el||0,old=stats[ball.lastPlayer],row=stats[p.id];if(!row||ball.lastPlayer===p.id)return;
  if(old&&ball.last!==p.team&&now-(p.recoveryAt??-10)>.7){row.recoveries++;row.tackles++;if(ball.lastAction==='p')row.interceptions++;old.turnovers++;p.recoveryAt=now;
   if(ball.lastAction==='s'&&ball.shotOnTarget&&now-(ball.kickAt||0)<3){row.saves++;}
  }
  if(ball.passCandidate&&ball.passCandidate.id!==p.id){const pass=ball.passCandidate;if(pass.team===p.team&&now-pass.time<5){const source=stats[pass.id];source.successfulPasses++;if(field.side(state,p.team)?p.x<state.W*.3:p.x>state.W*.7){source.keyPasses++;source.chancesCreated++;}}delete ball.passCandidate;}
 }
 function kick(state,p,type,stats){const b=state.ball,row=stats[p.id],now=state.G.elapsed||state.G.el||0;row[type==='s'?'shots':'passes']++;b.lastAction=type;b.kickAt=now;delete b.passCandidate;
  if(type==='p')b.passCandidate={id:p.id,team:p.team,time:now};
  else{const goalX=field.side(state,p.team)?0:state.W,t=(goalX-b.x)/(b.vx||.001),y=b.y+b.vy*t;b.shotOnTarget=t>0&&y>state.GY0&&y<state.GY1;if(b.shotOnTarget)row.shotsOnTarget++;}
 }
 const api={weights,caps,empty,grade,finalize,touch,kick};if(typeof module!=='undefined')module.exports=api;else root.MaxballPerformance=api;
})(globalThis);
