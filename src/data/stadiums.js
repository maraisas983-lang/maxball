(function(root){
 const stadiums=[
  {id:'max-arena',name:'Arena MAXBALL',grass:['#267844','#236e3e'],stands:'#19253c',seats:['#c8ff2e','#22d6ff'],surround:'#111a2e'},
  {id:'forest',name:'Parque Verde',grass:['#3a8541','#347839'],stands:'#153b2d',seats:['#e5f0d1','#58a972'],surround:'#163324'},
  {id:'coastal',name:'Arena do Litoral',grass:['#2a8b69','#247d60'],stands:'#173b57',seats:['#40c6df','#f9df9d'],surround:'#285065'},
  {id:'night',name:'Estádio Luz da Noite',grass:['#24674c','#205e44'],stands:'#181c3c',seats:['#a78cff','#54def4'],surround:'#101328'},
  {id:'sunset',name:'Arena Pôr do Sol',grass:['#638044','#57753d'],stands:'#4c2931',seats:['#ffac62','#ef6374'],surround:'#392b3c'}
 ];
 const api={stadiums,get:id=>stadiums.find(s=>s.id===id)||stadiums[0],valid:id=>stadiums.some(s=>s.id===id)};if(typeof module!=='undefined')module.exports=api;else root.MaxballStadiums=api;
})(globalThis);
