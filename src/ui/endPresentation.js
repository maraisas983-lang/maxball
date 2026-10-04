(function(root){
 'use strict';
 const {el,button}=root.MaxballUI;let scene=null,frame=0;
 const result=document.querySelector('#res'),resultCard=el('div',{class:'result-card'});while(result.firstChild)resultCard.append(result.firstChild);result.append(resultCard);
 function close(){cancelAnimationFrame(frame);scene?.remove();scene=null;}
 function cup(g,x,y,size){g.save();g.translate(x,y);g.scale(size/100,size/100);g.fillStyle='#ffdb71';g.strokeStyle='#ffeeb3';g.lineWidth=6;g.beginPath();g.moveTo(-26,-35);g.lineTo(26,-35);g.quadraticCurveTo(28,0,0,14);g.quadraticCurveTo(-28,0,-26,-35);g.fill();g.stroke();for(const side of [-1,1]){g.beginPath();g.moveTo(side*28,-28);g.bezierCurveTo(side*58,-40,side*52,5,side*14,5);g.stroke();}g.fillRect(-5,12,10,20);g.fillRect(-25,30,50,9);g.fillStyle='#b68324';g.fillRect(-32,39,64,10);g.restore();}
 function play(s,done){
  close();const final=!!s.G.cfg.final,winner=s.G.winner??(s.G.score[0]===s.G.score[1]?null:s.G.score[0]>s.G.score[1]?0:1),team=s.G.cfg.teams?.[winner],title=winner==null?'Uma disputa até o fim':team?.name||s.G.cfg.labels?.[winner]||'Equipe campeã';
  scene=el('section',{class:'end-cinema'+(final?' grand-final':''),'aria-label':'Cerimônia de encerramento'});const headline=el('h2',{text:final?'A NOITE É DOS CAMPEÕES':'FIM DE PARTIDA'}),caption=el('p',{text:s.G.score.join(' × ')}),canvas=el('canvas',{width:900,height:450}),skip=button('Ver resultado',finish,'secondary');scene.append(el('small',{text:final?'FINAL MAXBALL':'MAXBALL · APITO FINAL'}),headline,caption,canvas,skip);document.querySelector('#game').append(scene);
  const start=performance.now(),duration=final?11000:3500,g=canvas.getContext('2d'),players=s.P.filter(p=>winner==null||p.team===winner),confetti=Array.from({length:80},(_,i)=>({x:(i*137)%900,y:(i*53)%500,speed:35+i%40,phase:i}));
  const sprites=new Map();for(const p of players){if(sprites.has(p.team))continue;const c=el('canvas',{width:64,height:64}),t=s.G.cfg.teams?.[p.team];if(t)root.MaxballGame.teamSkin(c,t);else root.MaxballGame.skin(c,s.G.cfg['sk'+p.team]??p.team);sprites.set(p.team,c);}
  function finish(){close();if(document.querySelector('#game').classList.contains('on'))done();}
  function draw(now){if(!scene)return;if(!document.querySelector('#game').classList.contains('on')){close();return;}const seconds=(now-start)/1000,celebrate=seconds>2,raise=Math.max(0,Math.min(1,(seconds-4)/2)),effects=root.MaxballPreferences?.get().effects!==false;headline.textContent=celebrate?title:final?'O APITO QUE FAZ HISTÓRIA':'APITO FINAL';caption.textContent=final&&seconds>4?'CAMPEÕES · TAÇA MAXBALL':s.G.score.join(' × ');
   g.clearRect(0,0,900,450);const glow=g.createRadialGradient(450,160,10,450,160,370);glow.addColorStop(0,'#3c527b');glow.addColorStop(1,'#0b1630');g.fillStyle=glow;g.fillRect(0,0,900,450);g.fillStyle='#213252';g.fillRect(210,337,480,70);g.fillStyle='#c8ff2e';g.fillRect(210,337,480,5);
   players.forEach((p,i)=>{const x=450+(i-(players.length-1)/2)*83,y=314-(effects&&celebrate?Math.abs(Math.sin(seconds*5+i))*8:0);g.save();g.translate(x,y);g.drawImage(sprites.get(p.team),-32,-32,64,64);g.fillStyle='#fff';g.font='bold 16px Rubik';g.textAlign='center';g.fillText(String(p.num),0,5);g.font='12px Rubik';g.fillText(p.displayName||p.name,0,48);g.restore();});
   if(final&&winner!=null)cup(g,450,285-raise*120,115);if(final&&effects&&celebrate)for(const p of confetti){g.fillStyle=['#c8ff2e','#ffdb71','#fff','#22d6ff'][p.phase%4];g.fillRect(p.x+Math.sin(seconds+p.phase)*22,(p.y+seconds*p.speed)%450,4,9);}
   if(now-start>=duration){finish();return;}frame=requestAnimationFrame(draw);
  }frame=requestAnimationFrame(draw);return true;
 }
 root.MaxballEndPresentation={play,close,cup};
})(globalThis);
