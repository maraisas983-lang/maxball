(function(root){
 const config=(typeof module!=='undefined'?require('../core/config.js'):root.MaxballConfig).field;
 const geometryCache=new Map();
 function geometry(s){const n=s.G?.cfg?.n||s.cfg?.n||2,key=s.W+':'+s.H+':'+n+':'+s.GY0+':'+s.GY1;let f=geometryCache.get(key);if(!f){const large=n===4;f=Object.freeze({areaDepth:s.W*(large?.14:.105),areaPadding:Math.min(s.H*(large?.095:.055),(s.H-(s.GY1-s.GY0))*.2),centerRadius:Math.min(s.W,s.H)*.16});geometryCache.set(key,f);if(geometryCache.size>24)geometryCache.delete(geometryCache.keys().next().value);}return f;}
 function inArea(p,team,s){const f=geometry(s),depth=team?s.W-p.x:p.x;return depth>=-50&&depth<=f.areaDepth&&p.y>=s.GY0-f.areaPadding&&p.y<=s.GY1+f.areaPadding;}
 function limitDefense(s,previous=new Map()){
  if(s.G.phase!=='play'){s.G.areaOccupancy=[0,0];return;}
  const f=geometry(s),counts=[0,0];
  for(let team=0;team<2;team++){
   const players=s.P.filter(p=>!p.inactive&&p.team===team&&inArea(p,team,s));
   players.sort((a,b)=>Number(inArea(previous.get(b.id)||b,team,s))-Number(inArea(previous.get(a.id)||a,team,s))||String(a.id).localeCompare(String(b.id)));
   counts[team]=Math.min(2,players.length);
   for(const p of players.slice(2)){
    const x=team?s.W-f.areaDepth-.1:f.areaDepth+.1,top=s.GY0-f.areaPadding-.1,bottom=s.GY1+f.areaPadding+.1;
    const edges=[{d:Math.abs(x-p.x),x,y:p.y},{d:Math.abs(top-p.y),x:p.x,y:top},{d:Math.abs(bottom-p.y),x:p.x,y:bottom}].sort((a,b)=>a.d-b.d);
    const edge=edges[0];if(edge.x!==p.x)p.vx=0;if(edge.y!==p.y)p.vy=0;p.x=edge.x;p.y=edge.y;
   }
  }
  s.G.areaOccupancy=counts;
 }
 const api={geometry,inArea,limitDefense};if(typeof module!=='undefined')module.exports=api;else root.MaxballField=api;
})(globalThis);
