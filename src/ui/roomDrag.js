(function(root){
 function bind(container,onMove){
  let drag=null,frame=null;
  const clear=()=>{if(frame!==null)cancelAnimationFrame(frame);frame=null;if(!drag)return;drag.ghost.remove();drag.source.classList.remove('drag-source');container.querySelectorAll('.drop-active').forEach(n=>n.classList.remove('drop-active'));drag=null;};
  function scroll(){if(!drag)return;const surface=container.closest('.scr'),r=surface?.getBoundingClientRect();if(r){const direction=drag.y<r.top+45?-1:drag.y>r.bottom-45?1:0;surface.scrollTop+=direction*9;}frame=requestAnimationFrame(scroll);}
  container.addEventListener('pointerdown',e=>{const card=e.target.closest('[data-drag-player]');if(!card||e.target.closest('button,select,input'))return;e.preventDefault();clear();const ghost=card.cloneNode(true);ghost.classList.add('drag-ghost');ghost.style.width=card.getBoundingClientRect().width+'px';document.body.append(ghost);drag={id:e.pointerId,player:card.dataset.dragPlayer,source:card,ghost};card.classList.add('drag-source');try{container.setPointerCapture(e.pointerId)}catch{}move(e);});
  function move(e){if(!drag||drag.id!==e.pointerId)return;drag.y=e.clientY;if(frame===null)frame=requestAnimationFrame(scroll);drag.ghost.style.left=e.clientX+'px';drag.ghost.style.top=e.clientY+'px';container.querySelectorAll('.drop-active').forEach(n=>n.classList.remove('drop-active'));const zone=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-drop-zone]');if(zone&&container.contains(zone))zone.classList.add('drop-active');}
  container.addEventListener('pointermove',move);
  container.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const zone=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-drop-zone]'),player=drag.player;clear();if(zone&&container.contains(zone))Promise.resolve(onMove(player,zone.dataset.dropZone)).catch(root.MaxballPortal.error);});
  container.addEventListener('pointercancel',clear);container.addEventListener('lostpointercapture',clear);
  return clear;
 }
 root.MaxballRoomDrag={bind};
})(globalThis);
