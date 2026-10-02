(function(root){
 let panel=null,frames=0,last=performance.now(),fps=0,latest=null,poll=null;
 const allowed=()=>['ADMIN','SUPER_ADMIN','OWNER'].includes(root.MaxballPortal?.account?.user.role);
 function loop(now){frames++;if(now-last>=1000){fps=Math.round(frames*1000/(now-last));frames=0;last=now;if(panel){if(!allowed()){panel.remove();panel=null;clearInterval(poll);}else{const c=root.MaxballPortal.connection;panel.textContent='FPS '+fps+' | PING '+c.metrics.ping+' ms | '+c.state+'\nTICK '+(latest?.tickRate||'—')+' Hz | REDE '+(latest?.updateRate||'—')+' Hz | JOGADORES '+(latest?.players??'—')+'\nRecebidos '+c.metrics.received+' | Descartados '+c.metrics.dropped+' | Reconexões '+c.metrics.reconnects+(performance.memory?'\nMemória JS '+Math.round(performance.memory.usedJSHeapSize/1048576)+' MB':'');}}}requestAnimationFrame(loop);}
 document.addEventListener('keydown',async event=>{if(event.code!=='F3'||!allowed())return;event.preventDefault();if(panel){panel.remove();panel=null;clearInterval(poll);return;}panel=document.createElement('pre');panel.className='debug-panel';document.body.append(panel);const refresh=async()=>{try{latest=(await root.MaxballPortal.api('/command')).network;}catch{clearInterval(poll);}};await refresh();poll=setInterval(refresh,5000);});
 requestAnimationFrame(loop);
})(globalThis);
