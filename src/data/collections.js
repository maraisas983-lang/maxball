(function(root){
 'use strict';
 const balls=[['Clássica','#ffffff','#182332'],['Solar','#ffdc5e','#c06c16'],['Ártica','#b8f5ff','#2075c4'],['Lava','#ff875c','#872137'],['Galáxia','#c9adff','#4a267e'],['Esmeralda','#a4ffcb','#147c58'],['Rosa neon','#ffbee9','#bb318b'],['Ouro MAX','#fff3a2','#a6750d'],['Noite dos campeões','#dcd8ff','#38265a'],['Arena solar','#ffecb8','#9e4b18'],['Estrelas do gramado','#bcffed','#126f68'],['Legado do craque','#ffc4dd','#842945']].map(([name,light,dark],i)=>({id:'ball-'+i,name,light,dark,category:'BALL',asset_index:i,rarity:i>5?'EPIC':'RARE'}));
 const celebrations=[['Salto da vitória','↑'],['Giro do craque','↻'],['Coração da torcida','♥'],['Estrela da partida','★'],['Onda MAX','≈']].map(([name,symbol],i)=>({id:'celebration-'+i,name,symbol,category:'CELEBRATION',asset_index:i,rarity:i>2?'EPIC':'RARE'}));
 const trails=[['Gelo','#79e5ff'],['Rosa elétrico','#ff66bd'],['Esmeralda','#42ee9c'],['Ouro','#ffd56b'],['Violeta','#be8aff'],['Arco-íris','#ffffff']].map(([name,color],i)=>({id:'effect-'+(i+4),name,color,category:'EFFECT',asset_index:i+4,rarity:i>3?'EPIC':'RARE'}));
 trails.find(t=>t.id==='effect-9').rarity='MAX';
 const special=[
  ['Treino clássico','COMMON','#ffffff','#444444','classic',60],
  ['Jabulani','EPIC','#ffffff','#222222','jabulani',900],
  ['Trionda','LEGENDARY','#ffffff','#1868b0','trionda',2400],
  ['Aurora','RARE','#b7ffe7','#087f8c','classic',250],
  ['Nebulosa','EPIC','#e6d3ff','#732ca8','classic',900],
  ['Dragão rubro','LEGENDARY','#ffe7b8','#ad2638','classic',2400],
  ['Eclipse MAX','MAX','#212535','#e1b957','classic',8000],
  ['Prisma MAX','MAX','#e4ffff','#bd47b2','trionda',8000],
  ['Bola de olho','MAX','#fff9f4','#38a68b','eye',50000]
 ];
 special.forEach(([name,rarity,light,dark,style,price],i)=>balls.push({id:'ball-'+(i+12),name,rarity,light,dark,style,price,category:'BALL',asset_index:i+12,weight:style==='eye'?1:1000,packOnly:style==='eye'}));
 const rarities={COMMON:'Comum',RARE:'Raro',EPIC:'Épico',LEGENDARY:'Lendário',MAX:'MAX'};
 const packs=Object.entries(rarities).map(([rarity,name],i)=>({id:'pack-'+rarity.toLowerCase(),rarity,name:'Pacote '+name,price:[30,75,180,450,1200][i]}));
 const api={balls,celebrations,trails,packs,rarities,season:'MAXBALL-1',tiers:20,matchesPerTier:2};if(typeof module!=='undefined')module.exports=api;else root.MaxballCollections=api;
})(globalThis);
