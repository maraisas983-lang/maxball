(function(root){
 const emotes=[['Aplausos','👏',0],['Fogo','🔥',40],['Boa jogada','👍',30],['Risada','😂',50],['Coração','❤️',60],['Troféu','🏆',100],['Surpresa','😮',40],['Fair play','🤝',30]].map(([name,emoji,price],i)=>({id:'emote-'+i,name,emoji,price,asset_index:i}));
 if(typeof module!=='undefined')module.exports=emotes;else root.MaxballEmotes=emotes;
})(globalThis);
