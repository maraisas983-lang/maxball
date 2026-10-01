class AppError extends Error {
  constructor(status, code, message) { super(message); this.status=status; this.code=code; }
}
const fail=(code,message,status=400)=>{throw new AppError(status,code,message)};
function object(value, allowed) {
  if (!value || typeof value!=='object' || Array.isArray(value)) fail('INVALID_BODY','Dados inválidos.');
  if (allowed && Object.keys(value).some(k=>!allowed.includes(k))) fail('INVALID_FIELD','Campo não permitido.');
  return value;
}
function text(value,label,min=1,max=80,pattern) {
  if(typeof value!=='string') fail('INVALID_INPUT',label+' inválido.');
  const result=value.trim();
  if(result.length<min||result.length>max||(pattern&&!pattern.test(result)))fail('INVALID_INPUT',label+' inválido.');
  return result;
}
function integer(value,label,min,max) {
  if(!Number.isSafeInteger(value)||value<min||value>max)fail('INVALID_INPUT',label+' inválido.');
  return value;
}
const name=value=>text(value,'Nome',3,14,/^[\p{L}\p{N} _.-]+$/u);
const uuid=value=>text(value,'ID',36,36,/^[a-f0-9-]{36}$/i);
module.exports={AppError,fail,object,text,integer,name,uuid};
