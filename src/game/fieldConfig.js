(function(root){
 'use strict';
 const formats=Object.freeze({1:{name:'Pequeno',width:760,height:440,goal:100},2:{name:'Médio',width:1000,height:560,goal:140},3:{name:'Grande',width:1240,height:680,goal:170},4:{name:'Enorme',width:1480,height:800,goal:200,defensiveAreaLimit:2},5:{name:'5 × 5',width:1600,height:860,goal:210}});
 function dimensions(n,fs=0){const f=formats[n];if(!f)throw new Error('Formato inválido');const scale=[1,1.3,1.6][fs]||1,g=f.goal*(1+(scale-1)*.6),W=Math.round(f.width*scale),H=Math.round(f.height*scale);return {W,H,GY0:H/2-g/2,GY1:H/2+g/2};}
 const api={formats,dimensions};if(typeof module!=='undefined')module.exports=api;else root.MaxballFields=api;
})(globalThis);
