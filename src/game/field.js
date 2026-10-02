(function(root){
 const config=(typeof module!=='undefined'?require('../core/config.js'):root.MaxballConfig).field;
 function geometry(s){const scale=Math.max(1,Math.min(s.W/1000,s.H/560));return {areaDepth:config.areaDepth*scale,areaPadding:config.areaPadding*scale,centerRadius:config.centerRadius*scale};}
 function inArea(p,team,s){const f=geometry(s),depth=team?s.W-p.x:p.x;return depth>=-50&&depth<=f.areaDepth&&p.y>=s.GY0-f.areaPadding&&p.y<=s.GY1+f.areaPadding;}
 const api={geometry,inArea};if(typeof module!=='undefined')module.exports=api;else root.MaxballField=api;
})(globalThis);
