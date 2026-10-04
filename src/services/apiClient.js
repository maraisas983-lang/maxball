(function(root){
 'use strict';
 let csrf=null,verified=false;
 const expectedVersion=root.MaxballAPIContract?.version;
 function versionError(){
  const local=/^(localhost|127\.0\.0\.1)$/.test(location.hostname||'');
  const error=new Error(local?'O servidor MAXBALL está desatualizado. Encerre o servidor antigo, execute npm.cmd run dev na pasta do projeto e recarregue esta página.':'A interface e o servidor MAXBALL estão em versões diferentes. Atualize o deploy do serviço e recarregue a página.');
  error.code='SERVER_VERSION_MISMATCH';return error;
 }
 async function request(path,method='GET',body){
  if(location.protocol==='file:')throw new Error('Abra o jogo pelo servidor local para acessar sua conta.');
  // Verify before mutations so an old backend never accepts a new UI's writes.
  if(expectedVersion&&!verified&&!['GET','HEAD'].includes(method))await request('/config');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetch('/api'+path,{method,credentials:'same-origin',signal:controller.signal,headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(csrf?{'X-CSRF-Token':csrf}:{})},body:body===undefined?undefined:JSON.stringify(body)});
   if(!response.headers.get('content-type')?.includes('application/json')){
    const error=new Error('Este endereço está exibindo apenas os arquivos do jogo. Abra o servidor MAXBALL para entrar na sua conta.');error.code='BACKEND_UNAVAILABLE';error.status=response.status;throw error;
   }
   let data;
   try{data=await response.json();}catch{
    const error=new Error('O servidor retornou uma resposta vazia ou inválida. Abra o MAXBALL pelo endereço do servidor completo.');error.code='BACKEND_UNAVAILABLE';error.status=response.status;throw error;
   }
   if(expectedVersion){
    if(response.headers.get('x-maxball-api-version')!==expectedVersion)throw versionError();
    verified=true;
   }
   if(!response.ok){const error=new Error(data.error?.message||'Não foi possível concluir.');error.status=response.status;error.code=data.error?.code;throw error;}
   if(data.csrf)csrf=data.csrf;
   return data;
  }catch(error){if(error.name==='AbortError')throw new Error('O servidor demorou para responder. Tente novamente.');if(error instanceof TypeError)throw new Error('Não foi possível conectar ao servidor MAXBALL. Confira se ele está iniciado.');throw error;}finally{clearTimeout(timer);}
 }
 root.MaxballAPI=Object.freeze({request,clear(){csrf=null;verified=false;}});
})(globalThis);
