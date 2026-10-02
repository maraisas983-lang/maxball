(function(root){
 const deadzone=(typeof module!=='undefined'?require('../core/config.js'):root.MaxballConfig).input.deadzone;
 function bindJoystick(node,knob,value,host=root){
  let active=null;
  function move(e){if(e.pointerId!==active)return;const r=node.getBoundingClientRect(),radius=r.width*.32,dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,length=Math.hypot(dx,dy),amount=Math.min(1,length/radius),scaled=amount<deadzone?0:(amount-deadzone)/(1-deadzone);value.x=length?dx/length*scaled:0;value.y=length?dy/length*scaled:0;knob.style.transform=`translate(${value.x*radius}px,${value.y*radius}px)`;}
  const reset=()=>{active=null;value.x=value.y=0;knob.style.transform='';};
  node.onpointerdown=e=>{if(active!==null)return;e.preventDefault?.();active=e.pointerId;try{node.setPointerCapture(active)}catch{}move(e);};
  host.addEventListener('pointermove',move);
  for(const type of ['pointerup','pointercancel'])host.addEventListener(type,e=>{if(e.pointerId===active)reset();});
  node.addEventListener('lostpointercapture',e=>{if(e.pointerId===active)reset();});
  return {reset};
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
