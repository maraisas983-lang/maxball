const {createApp}=require('../server/app.cjs');
const {once}=require('node:events');
const WebSocket=require('ws'),{Decoder}=require('../src/online/protocol.js');
const assert=require('node:assert/strict');
const {setTimeout:delay}=require('node:timers/promises');
(async()=>{
 const origin='http://stress.test',app=createApp({databasePath:':memory:',origin,logger:{warn(){},error:console.error}}),clients=[];let timer;
 app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const url='ws://127.0.0.1:'+app.server.address().port+'/ws';
 async function connect(client){const ws=new WebSocket(url,{origin,headers:{Cookie:'maxball_session='+client.session.token}});client.ws=ws;client.seq=0;client.decoder=new Decoder();client.decodeErrors??=0;ws.on('message',raw=>{const message=JSON.parse(raw);if(['snapshot','delta','frame'].includes(message.type)){try{const result=client.decoder.read(message);if(!result||!result.state.P.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)))client.decodeErrors++;}catch{client.decodeErrors++;}}client[message.type]=(client[message.type]||0)+1;if(message.type==='delta')client.frame=(client.frame||0)+1;if(message.type==='connected')ws.send(JSON.stringify({type:'subscribe'}));});await once(ws,'open');}
 try{
  for(let i=0;i<16;i++){const client={session:await app.auth.register({username:'stress_'+i,password:'stress-password-123'})};clients.push(client);await connect(client);}
  for(let i=0;i<16;i+=2){const a=clients[i].session.user,b=clients[i+1].session.user,room=await app.rooms.create(a,{name:'Stress '+i,n:5});await app.rooms.join(b,room.id);app.rooms.start(a,room.id);const live=app.rooms.rooms.get(room.id).match;live.G.phase='play';live.G.startRemaining=0;live.kickoff();}
  timer=setInterval(()=>{for(const c of clients)if(c.ws.readyState===1)c.ws.send(JSON.stringify({type:'input',seq:++c.seq,x:Math.sin(c.seq*.1),y:0,shoot:c.seq%20===0,pass:false}));},1000/30);
  await delay(7000);
  for(const c of clients.slice(0,4)){c.ws.terminate();await once(c.ws,'close');await connect(c);}
  await delay(2000);for(const c of clients){assert.ok(c.snapshot>=1);assert.ok(c.frame>20);assert.equal(c.ws.readyState,1);assert.equal(c.decodeErrors,0);}
  const metrics=app.rooms.metrics();assert.equal(metrics.connections,16);assert.equal(metrics.rooms,8);assert.equal(metrics.players,80);assert.ok(metrics.ticks>300);
  for(const c of clients.slice(0,2))app.rooms.leave(c.session.user.id);
  for(const c of clients.slice(0,2))app.rooms.rankedJoin(c.session.user);app.rooms.pairRanked();const ranked=app.rooms.current(clients[0].session.user.id);assert.equal(ranked.cfg.ranked,true);assert.equal(app.rooms.current(clients[1].session.user.id).id,ranked.id);
  app.rooms.leave(clients[0].session.user.id);assert.ok(app.rooms.ranked.history(clients[0].session.user.id)[0].finished_at);
  console.log(JSON.stringify({connections:16,rooms:8,players:80,reconnected:4,matchmaking:'paired two humans and persisted forfeit',metrics},null,2));
 }finally{clearInterval(timer);for(const c of clients)c.ws.terminate();await app.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
