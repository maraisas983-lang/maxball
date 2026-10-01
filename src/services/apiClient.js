(function(root){
 'use strict';
 let csrf=null;
 async function request(path,method='GET',body){
  if(location.protocol==='file:')throw new Error('Abra o jogo pelo servidor local para acessar sua conta.');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetch('/api'+path,{method,credentials:'same-origin',signal:controller.signal,headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(csrf?{'X-CSRF-Token':csrf}:{})},body:body===undefined?undefined:JSON.stringify(body)});
   const data=await response.json();
   if(!response.ok){const error=new Error(data.error?.message||'Não foi possível concluir.');error.status=response.status;error.code=data.error?.code;throw error;}
   if(data.csrf)csrf=data.csrf;
   return data;
  }catch(error){if(error.name==='AbortError')throw new Error('O servidor demorou para responder. Tente novamente.');throw error;}finally{clearTimeout(timer);}
 }
 root.MaxballAPI=Object.freeze({request,clear(){csrf=null;}});
})(globalThis);
