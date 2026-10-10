(function(root){
 'use strict';
 if(!/MAXBALL-Android\//.test(root.navigator?.userAgent||''))return;
 document.documentElement.classList.add('maxball-android');
 document.addEventListener('visibilitychange',()=>{if(document.hidden)root.MaxballGame?.resetInputs();});
 root.addEventListener('maxball:native-resume',()=>{
  root.MaxballGame?.resetInputs();
  const portal=root.MaxballPortal;if(portal?.account&&location.protocol==='https:')portal.refreshAccount().catch(()=>{});
 });
 // A returned Cakto payment may have completed while the external browser was open.
 root.addEventListener('focus',()=>{if(root.MaxballPortal?.account&&location.protocol==='https:')root.MaxballPortal.refreshAccount().catch(()=>{});});
})(globalThis);
