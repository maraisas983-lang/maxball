(function(root){
 'use strict';
 const duration=56*86400000,epoch=Date.UTC(2026,9,1),themes=['Noite dos campeões','Arena solar','Estrelas do gramado','Legado do craque'];
 const objectives=[{code:'daily-play',scope:'daily',name:'Complete 3 partidas',target:3,xp:400,metric:'matches'},{code:'daily-win',scope:'daily',name:'Vença 1 partida',target:1,xp:250,metric:'wins'},{code:'weekly-play',scope:'weekly',name:'Complete 15 partidas',target:15,xp:1800,metric:'matches'},{code:'weekly-team',scope:'weekly',name:'Faça 10 gols ou assistências',target:10,xp:1200,metric:'team'}];
 function season(now=Date.now()){const number=Math.max(1,Math.floor((now-epoch)/duration)+1);return {id:'maxpass-'+number,number,name:themes[(number-1)%themes.length],startsAt:epoch+(number-1)*duration,endsAt:epoch+number*duration,gemPrice:600,cashPrice:1990};}
 function levels(){return Array.from({length:50},(_,i)=>600+i*100);}
 function progress(xp,costs=levels()){let level=0,start=0;while(level<costs.length&&xp>=start+costs[level])start+=costs[level++];return {level,xp,totalXp:xp,currentXp:level===costs.length?0:xp-start,requiredXp:costs[level]||0,maxLevel:costs.length};}
 function totalFor(level,costs=levels()){return costs.slice(0,level).reduce((a,b)=>a+b,0);}
 function rewards(s){
  const item=(id,name)=>({type:'ITEM',itemId:id,name}),cosmetic=(kind,n,track)=>({type:kind,id:s.id+'-'+track+'-'+n,name:(kind==='TITLE'?(n===50?'Lenda da temporada':'Craque '+n):'Moldura '+n)+' · '+s.name,color:track==='Plus'?'#ffd375':'#72dfff'});
  const free=['emote-3','ball-1','effect-4','kit-6','celebration-1','emote-8','ball-2','kit-7','effect-5','celebration-2','kit-8','emote-10','kit-9','effect-6','kit-10','ball-3','kit-11','emote-2','kit-12','kit-13'];
  const plus=['kit-2','ball-7','effect-9','celebration-4','emote-9','kit-3','ball-4','effect-8','celebration-3','kit-4','ball-5','kit-5','emote-11','kit-14','ball-6','kit-15','effect-7','kit-16','kit-17','kit-18'];
  let freeIndex=0,plusIndex=0;
  return Array.from({length:50},(_,i)=>{const n=i+1;return {level:n,Free:n%5===0?{type:'GEMS',amount:10,name:'10 gemas'}:n%7===0?cosmetic('TITLE',n,'Free'):n%11===0?cosmetic('FRAME',n,'Free'):n%9===0?{type:'PROFILE_XP',amount:100,name:'100 XP de perfil'}:freeIndex<free.length?item(free[freeIndex++]):cosmetic('FRAME',n,'Free'),Plus:n===50?cosmetic('TITLE',50,'Plus'):n%5===0?{type:'GEMS',amount:30,name:'30 gemas'}:n%7===0?cosmetic('TITLE',n,'Plus'):n%4===0?cosmetic('FRAME',n,'Plus'):n===3?item('ball-'+(8+(s.number-1)%4),'Bola exclusiva · '+s.name):plusIndex<plus.length?item(plus[plusIndex++]):cosmetic('TITLE',n,'Plus')};});
 }
 const api={season,levels,progress,totalFor,rewards,objectives};if(typeof module!=='undefined')module.exports=api;else root.MaxballPassData=api;
})(globalThis);
