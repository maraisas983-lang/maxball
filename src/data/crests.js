(function(root){
 'use strict';
 const teams=typeof module!=='undefined'?require('./teams.js'):root.MaxballTeams;
 const shapes=[
 [['M',18,7],['L',82,7],['L',91,24],['L',84,70],['Q',74,88,50,96],['Q',26,88,16,70],['L',9,24],['Z']],
 [['M',50,5],['C',76,5,94,22,94,47],['C',94,72,76,94,50,96],['C',24,94,6,72,6,47],['C',6,22,24,5,50,5],['Z']],
 [['M',50,4],['L',91,23],['L',87,72],['L',50,96],['L',13,72],['L',9,23],['Z']],
 [['M',12,10],['Q',50,0,88,10],['L',88,58],['Q',85,79,50,96],['Q',15,79,12,58],['Z']],
 [['M',50,5],['L',94,17],['L',86,67],['L',50,96],['L',14,67],['L',6,17],['Z']],
 [['M',24,6],['L',76,6],['Q',94,6,94,26],['L',94,66],['L',50,96],['L',6,66],['L',6,26],['Q',6,6,24,6],['Z']]
 ];
 const symbols={
  wings:[['M',20,35],['L',46,45],['L',50,31],['L',54,45],['L',80,35],['L',68,55],['L',54,61],['L',50,75],['L',46,61],['L',32,55],['Z']],
  leaf:[['M',29,68],['Q',21,34,69,29],['Q',82,65,37,72],['L',62,42],['L',47,58],['Z']],
  peaks:[['M',23,65],['L',39,35],['L',51,55],['L',66,28],['L',81,65],['L',66,58],['L',52,72],['L',39,58],['Z']],
  bolt:[['M',58,27],['L',31,53],['L',47,55],['L',39,77],['L',72,47],['L',56,45],['Z']],
  wave:[['M',21,46],['Q',35,34,49,45],['Q',64,58,79,43],['L',79,54],['Q',64,69,49,56],['Q',35,45,21,57],['Z'],['M',21,64],['Q',36,54,50,65],['Q',65,77,79,61],['L',79,69],['Q',65,85,50,74],['Q',36,63,21,72],['Z']],
  compass:[['M',50,25],['L',57,45],['L',76,51],['L',57,58],['L',50,79],['L',43,58],['L',24,51],['L',43,45],['Z'],['M',50,43],['L',42,51],['L',50,59],['L',58,51],['Z']],
  flame:[['M',49,77],['C',23,68,31,50,43,43],['L',47,25],['Q',69,42,60,52],['Q',82,66,59,76],['L',55,62],['L',47,69],['Z']],
  tower:[['M',28,74],['L',28,38],['L',38,38],['L',38,30],['L',47,30],['L',47,38],['L',54,38],['L',54,30],['L',63,30],['L',63,38],['L',73,38],['L',73,74],['L',59,74],['L',59,55],['Q',50,43,42,55],['L',42,74],['Z']],
  diamond:[['M',50,25],['L',79,47],['L',50,78],['L',21,47],['Z'],['M',50,37],['L',36,48],['L',50,64],['L',64,48],['Z']],
  sunrise:[['M',22,58],['Q',50,5,78,58],['L',68,58],['Q',50,26,32,58],['Z'],['M',23,65],['L',77,65],['L',77,72],['L',23,72],['Z']],
  arrow:[['M',22,45],['L',48,45],['L',48,30],['L',78,54],['L',48,78],['L',48,62],['L',22,62],['Z']],
  crown:[['M',25,40],['L',37,51],['L',50,31],['L',63,51],['L',76,40],['L',70,70],['L',30,70],['Z']],
  orbit:[['M',23,61],['Q',37,27,75,34],['L',69,42],['Q',44,37,32,64],['Z'],['M',25,69],['Q',67,79,79,43],['L',69,43],['Q',61,66,30,61],['Z']]
 };
 // Original MAXBALL emblems: familiar palettes, new silhouettes and central marks.
 const brazil=[
 [0,'wings','bands'],[1,'leaf','ring'],[4,'peaks','split'],[2,'tower','diagonal'],[3,'wave','stripes'],
 [5,'leaf','thirds'],[4,'compass','sash'],[0,'compass','plain'],[1,'orbit','ring'],[3,'peaks','stripes'],
 [2,'wave','thirds'],[5,'flame','ring'],[1,'sunrise','bands'],[4,'wings','split'],[2,'arrow','bands'],
 [5,'sunrise','split'],[0,'leaf','bands'],[2,'bolt','diagonal'],[4,'tower','ring'],[3,'wave','plain']
 ];
 const mamoIcons=['diamond','crown','arrow','bolt','flame','sunrise','compass','tower','wings','flame','wings','diamond','tower','leaf','wings','bolt','tower','crown','diamond','peaks','leaf'];
 function design(team){const original=teams.teams.find(t=>t.id===team.id);if(!original)return null;const index=Number(team.id.split('-')[1]),cfg=team.id.startsWith('br-')?brazil[index]:[index%6,mamoIcons[index],['plain','split','bands','diagonal','ring'][index%5]];if(!cfg)return null;return {team:original,shape:shapes[cfg[0]],symbol:symbols[cfg[1]],pattern:cfg[2]};}
 function elements(team){const d=design(team);if(!d)return null;const t=d.team,a=t.primaryColor,b=t.secondaryColor,c=t.accentColor;const list=[{kind:'path',ops:d.shape,fill:a,stroke:'#101b2f',width:4}];
  if(d.pattern==='bands')for(const y of [25,48,71])list.push({kind:'rect',x:8,y,w:84,h:10,fill:b});
  else if(d.pattern==='stripes')for(const x of [24,45,66])list.push({kind:'rect',x,y:8,w:10,h:86,fill:b});
  else if(d.pattern==='split')list.push({kind:'path',ops:[['M',50,2],['L',98,2],['L',98,98],['L',50,98],['Z']],fill:b});
  else if(d.pattern==='thirds'){list.push({kind:'rect',x:35,y:5,w:17,h:90,fill:b},{kind:'rect',x:52,y:5,w:17,h:90,fill:c});}
  else if(d.pattern==='sash'||d.pattern==='diagonal')list.push({kind:'path',ops:[['M',8,61],['L',77,8],['L',93,23],['L',23,89],['Z']],fill:b});
  if(d.pattern==='ring')list.push({kind:'circle',x:50,y:48,r:32,fill:'none',stroke:b,width:5});
  list.push({kind:'path',ops:d.shape,fill:'none',stroke:c,width:2,inset:true},{kind:'circle',x:50,y:53,r:29,fill:a,stroke:'#101b2f',width:2},{kind:'path',ops:d.symbol,fill:b,stroke:'#101b2f',width:1.5,rule:'evenodd'},{kind:'rect',x:43,y:83,w:14,h:3,fill:c});
  return {shape:d.shape,elements:list,title:'Emblema MAXBALL · '+t.name};
 }
 const pathText=ops=>ops.map(op=>op.join(' ')).join(' ');
 function trace(g,ops){g.beginPath();for(const [cmd,...v] of ops){if(cmd==='M')g.moveTo(...v);else if(cmd==='L')g.lineTo(...v);else if(cmd==='Q')g.quadraticCurveTo(...v);else if(cmd==='C')g.bezierCurveTo(...v);else if(cmd==='Z')g.closePath();}}
 function draw(g,team,width,height=width){const d=elements(team);if(!d)return false;g.clearRect(0,0,width,height);g.save();const scale=Math.min(width,height)/100;g.translate((width-scale*100)/2,(height-scale*100)/2);g.scale(scale,scale);trace(g,d.shape);g.clip();for(const e of d.elements){g.save();if(e.inset){g.translate(50,50);g.scale(.88,.88);g.translate(-50,-50);}if(e.kind==='path')trace(g,e.ops);else if(e.kind==='circle'){g.beginPath();g.arc(e.x,e.y,e.r,0,Math.PI*2);}else{g.beginPath();g.rect(e.x,e.y,e.w,e.h);}if(e.fill!=='none'){g.fillStyle=e.fill;g.fill(e.rule||'nonzero');}if(e.stroke){g.strokeStyle=e.stroke;g.lineWidth=e.width;g.lineJoin='round';g.stroke();}g.restore();}g.restore();return true;}
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
 function svg(team){const d=elements(team);if(!d)throw Error('Equipe sem emblema.');const render=e=>{const style='fill="'+e.fill+'"'+(e.stroke?' stroke="'+e.stroke+'" stroke-width="'+e.width+'" stroke-linejoin="round"':'')+(e.rule?' fill-rule="'+e.rule+'"':'')+(e.inset?' transform="translate(50 50) scale(.88) translate(-50 -50)"':'');return e.kind==='path'?'<path d="'+pathText(e.ops)+'" '+style+'/>':e.kind==='circle'?'<circle cx="'+e.x+'" cy="'+e.y+'" r="'+e.r+'" '+style+'/>':'<rect x="'+e.x+'" y="'+e.y+'" width="'+e.w+'" height="'+e.h+'" '+style+'/>';};return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img"><title>'+escape(d.title)+'</title><defs><clipPath id="badge"><path d="'+pathText(d.shape)+'"/></clipPath></defs><g clip-path="url(#badge)">'+d.elements.map(render).join('')+'</g></svg>\n';}
 const api={draw,svg,has:team=>!!design(team)};if(typeof module!=='undefined')module.exports=api;else root.MaxballCrests=api;
})(globalThis);
