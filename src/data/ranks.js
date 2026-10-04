(function(root){
 const thresholds=[0,100,250,500,850,1300,1900,2700];
 const ranks=['MiniBall','Ballista','MaxPlayer','MaxCraque','MaxElite','BallMaster','MaxLenda','MaxImortal'].map((name,i)=>({name,min:thresholds[i]}));
 const api={ranks,rank:rating=>ranks.filter(r=>rating>=r.min).at(-1)||ranks[0]};if(typeof module!=='undefined')module.exports=api;else root.MaxballRanks=api;
})(globalThis);
