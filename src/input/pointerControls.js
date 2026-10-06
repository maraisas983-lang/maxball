(function(root){
 const deadzone=(typeof module!=='undefined'?require('../core/config.js'):root.MaxballConfig).input.deadzone;
 function bindJoystick(node,knob,value,host=root){
  let active=null,origin=null,radius=1,original=null;const mode=()=>root.MaxballPreferences?.get().joystick||'fixed';
  function move(e){if(e.pointerId!==active)return;let dx=e.clientX-origin.x,dy=e.clientY-origin.y,length=Math.hypot(dx,dy);if(mode()==='follow'&&length>radius){origin.x+=dx/length*(length-radius);origin.y+=dy/length*(length-radius);node.style.left=origin.x+'px';node.style.top=origin.y+'px';dx=e.clientX-origin.x;dy=e.clientY-origin.y;length=radius;}const amount=Math.min(1,length/radius),scaled=amount<deadzone?0:(amount-deadzone)/(1-deadzone);value.x=length?dx/length*scaled:0;value.y=length?dy/length*scaled:0;knob.style.transform='translate('+value.x*radius+'px,'+value.y*radius+'px)';}
  const reset=()=>{active=null;value.x=value.y=0;knob.style.transform='';if(original){node.style.left=original.left;node.style.top=original.top;original=null;}};
  function begin(e,area=false){if(active!==null||mode()==='off')return;e.preventDefault?.();const r=node.getBoundingClientRect();radius=r.width*.32;origin={x:r.left+r.width/2,y:r.top+r.height/2};if(mode()==='floating'||mode()==='follow'){original={left:node.style.left,top:node.style.top};origin={x:e.clientX,y:e.clientY};node.style.left=origin.x+'px';node.style.top=origin.y+'px';}else if(area)origin={x:root.innerWidth*.25,y:root.innerHeight*.5};active=e.pointerId;try{node.setPointerCapture(active)}catch{}move(e);}
  node.onpointerdown=e=>begin(e);host.addEventListener('pointermove',move);
  if(node.id==='joy')host.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'||e.clientX>=root.innerWidth/2||!e.target?.closest?.('#game.on')||e.target.closest('button,input,select,dialog,#gpan.on,#versus:not([hidden])'))return;begin(e,true);});
  for(const type of ['pointerup','pointercancel'])host.addEventListener(type,e=>{if(e.pointerId===active)reset();});node.addEventListener('lostpointercapture',e=>{if(e.pointerId===active)reset();});
  const configure=()=>{reset();node.style.visibility=mode()==='off'?'hidden':'';};host.addEventListener('maxball-preferences',configure);configure();return {reset};
 }

 function bindAction(node,set,press=()=>{},host=root){
  const ids=new Set();
  node.onpointerdown=e=>{e.preventDefault?.();if(!ids.size)press();ids.add(e.pointerId);try{node.setPointerCapture(e.pointerId)}catch{}set(true);};
  const release=e=>{ids.delete(e.pointerId);set(ids.size>0);};
  for(const type of ['pointerup','pointercancel'])host.addEventListener(type,release);
  node.addEventListener('lostpointercapture',release);
  return {reset(){ids.clear();set(false);}};
 }
 const api={bindJoystick,bindAction};if(typeof module!=='undefined')module.exports=api;else root.MaxballPointers=api;
})(globalThis);
