(function(root){
 'use strict';
 const balls=[['Clássica','#ffffff','#182332'],['Solar','#ffdc5e','#c06c16'],['Ártica','#b8f5ff','#2075c4'],['Lava','#ff875c','#872137'],['Galáxia','#c9adff','#4a267e'],['Esmeralda','#a4ffcb','#147c58'],['Rosa neon','#ffbee9','#bb318b'],['Ouro MAX','#fff3a2','#a6750d']].map(([name,light,dark],i)=>({id:'ball-'+i,name,light,dark,category:'BALL',asset_index:i,rarity:i>5?'EPIC':'RARE'}));
 const celebrations=[['Salto da vitória','↑'],['Giro do craque','↻'],['Coração da torcida','♥'],['Estrela da partida','★'],['Onda MAX','≈']].map(([name,symbol],i)=>({id:'celebration-'+i,name,symbol,category:'CELEBRATION',asset_index:i,rarity:i>2?'EPIC':'RARE'}));
 const trails=[['Gelo','#79e5ff'],['Rosa elétrico','#ff66bd'],['Esmeralda','#42ee9c'],['Ouro','#ffd56b'],['Violeta','#be8aff'],['Arco-íris','#ffffff']].map(([name,color],i)=>({id:'effect-'+(i+4),name,color,category:'EFFECT',asset_index:i+4,rarity:i>3?'EPIC':'RARE'}));
 const api={balls,celebrations,trails,season:'MAXBALL-1',tiers:20,matchesPerTier:2};if(typeof module!=='undefined')module.exports=api;else root.MaxballCollections=api;
})(globalThis);
