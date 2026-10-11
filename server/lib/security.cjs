const {fail,AppError}=require('./validation.cjs');
const {isIP}=require('node:net');

// Enable only behind the deployment's trusted ingress. Use the last address
// appended by that ingress, never a client-supplied prefix of the header.
function clientAddress(req,trustProxy=false){
 const peer=req.socket.remoteAddress||'unknown';
 if(!trustProxy)return peer;
 const forwarded=req.headers['x-forwarded-for'];
 if(typeof forwarded!=='string'||forwarded.length>2048)return peer;
 const candidate=forwarded.split(',').at(-1).trim();
 return isIP(candidate)?candidate:peer;
}

const defaults=Object.freeze({maxRooms:100,maxConnections:1000,wsAccountHandshakes:30,wsIpHandshakes:1200,wsMessages:90,apiPerAccount:300,roomOperations:30});
const environment=Object.freeze({maxRooms:'MAX_ROOMS',maxConnections:'MAX_CONNECTIONS',wsAccountHandshakes:'WS_ACCOUNT_HANDSHAKES',wsIpHandshakes:'WS_IP_HANDSHAKES',wsMessages:'WS_MESSAGES_PER_SECOND',apiPerAccount:'API_ACCOUNT_PER_MINUTE',roomOperations:'ROOM_OPERATIONS_PER_MINUTE'});
function securityConfig(overrides={}){
 const result={...defaults,...overrides};
 for(const [key,value] of Object.entries(result))if(!Object.hasOwn(defaults,key)||!Number.isSafeInteger(value)||value<1||value>1000000)throw new Error('Invalid security limit: '+key);
 return Object.freeze(result);
}
function securityFromEnv(env){return securityConfig(Object.fromEntries(Object.entries(environment).filter(([,key])=>env[key]!==undefined&&env[key]!=='').map(([name,key])=>[name,Number(env[key])])));}

// One process owns SQLite and the simulation. Do not use this limiter across replicas.
function createLimiter({now=Date.now,capacity=10000}={}){
 const buckets=new Map();let nextSweep=0;
 return function limit(key,max,windowMs){
  const time=now();
  if(time>=nextSweep){for(const [k,v] of buckets)if(v.until<=time)buckets.delete(k);nextSweep=time+10000;}
  let bucket=buckets.get(key);
  if(!bucket||bucket.until<=time){
   if(!bucket&&buckets.size>=capacity)fail('BUSY','Servidor ocupado. Tente novamente.',503);
   bucket={until:time+windowMs,count:0};buckets.set(key,bucket);
  }
  if(bucket.count>=max){const seconds=Math.max(1,Math.ceil((bucket.until-time)/1000)),error=new AppError(429,'RATE_LIMIT',`Limite de tentativas atingido. Tente novamente em ${Math.ceil(seconds/60)} minuto(s).`);error.retryAfter=seconds;throw error;}
  bucket.count++;
 };
}

// Only controlled codes and counts: no URLs, credentials, payloads or exception text.
function createSecurityReporter(logger){
 const counts=new Map();
 const write=(event,code,count)=>logger.warn(JSON.stringify({level:'SECURITY',event,code,count}));
 function record(code){
  const key=/^[A-Z_]{1,40}$/.test(code)?code:'INTERNAL';
  if(!counts.has(key)&&counts.size>=64)return;
  const count=counts.get(key)||0;counts.set(key,count+1);
  if(!count)write('security_event',key,1);
 }
 function flush(){for(const [code,count] of counts)if(count>1)write('security_summary',code,count-1);counts.clear();}
 const timer=setInterval(flush,60000);timer.unref();
 return {record,flush,close(){clearInterval(timer);flush();}};
}
module.exports={securityConfig,securityFromEnv,createLimiter,createSecurityReporter,clientAddress};
