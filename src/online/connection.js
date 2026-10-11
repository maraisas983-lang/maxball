(function(root){
 'use strict';
 function wireBytes(text){let bytes=0;for(let i=0;i<text.length;i++){const c=text.charCodeAt(i);if(c<128)bytes++;else if(c<2048)bytes+=2;else if(c>=55296&&c<=56319&&text.charCodeAt(i+1)>=56320&&text.charCodeAt(i+1)<=57343){bytes+=4;i++;}else bytes+=3;}return bytes;}
 class Connection {
  constructor({onMessage,onStatus,input}){this.onMessage=onMessage;this.onStatus=onStatus;this.input=input;this.closed=true;this.attempt=0;this.sequence=0;this.decoder=new root.MaxballProtocol.Decoder();this.state='DISCONNECTED';this.lastPrediction=null;this.commands=[];this.observedInput=null;this.correction={x:0,y:0};this.lastInput=null;this.lastSent=0;this.lastResync=0;this.metrics={ping:0,jitter:0,received:0,dropped:0,reconnects:0,bytesReceived:0,bytesSent:0,startedAt:performance.now()};}
  connect(){
   this.closed=false;clearTimeout(this.retry);if(this.socket&&[WebSocket.OPEN,WebSocket.CONNECTING].includes(this.socket.readyState))return;
   this.state=this.attempt?'RECONNECTING':'CONNECTING';const socket=new WebSocket(location.origin.replace(/^http/,'ws')+'/ws');this.socket=socket;
   socket.onopen=()=>{
    if(this.socket!==socket)return;this.state='CONNECTED';this.attempt=0;this.sequence=0;this.decoder.state=null;this.lastPrediction=null;this.commands=[];this.observedInput=null;this.correction={x:0,y:0};this.lastInput=null;this.lastSent=0;this.metrics.startedAt=performance.now();this.metrics.bytesReceived=this.metrics.bytesSent=0;this.onStatus('Conectado');socket.send(JSON.stringify({type:'subscribe'}));
    socket.send(JSON.stringify({type:'ping',sentAt:performance.now()}));clearInterval(this.pinger);this.pinger=setInterval(()=>{if(socket.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type:'ping',sentAt:performance.now()}));},2000);
    clearInterval(this.sender);this.sender=setInterval(()=>this.flushInput(),1000/60);
   };
   socket.onmessage=event=>{if(this.socket!==socket||this.closed)return;try{const at=performance.now();this.metrics.bytesReceived+=typeof event.data==='string'?wireBytes(event.data):0;const raw=JSON.parse(event.data);if(raw.type==='pong'){const ping=Math.round(performance.now()-raw.sentAt);this.metrics.jitter=this.metrics.jitter*.85+Math.abs(ping-this.metrics.ping)*.15;this.metrics.ping=ping;return;}const message=this.decoder.read(raw);this.metrics.received++;if(!message){this.metrics.dropped++;if(raw.type==='delta'&&performance.now()-this.lastResync>500){this.lastResync=performance.now();socket.send(JSON.stringify({type:'subscribe'}));}return;}if(message.type==='snapshot'){if(this.lastMatchId!==message.state.matchId){this.lastMatchId=message.state.matchId;this.commands=[];this.lastInput=null;this.observedInput=null;this.lastPrediction=null;this.correction={x:0,y:0};}this.lastFrameAt=performance.now();this.state=message.state.G.phase==='end'?'CONNECTED':'IN_MATCH';}this.onMessage(message);root.MaxballPerf?.meter.add('network',performance.now()-at);}catch{this.onStatus('Falha ao receber a partida. Reconectando…');socket.close();}};
   socket.onerror=()=>this.onStatus('Conexão interrompida');
   socket.onclose=event=>{
    if(this.socket!==socket)return;clearInterval(this.sender);clearInterval(this.pinger);this.state='DISCONNECTED';
    if(this.closed)return;
    if(event.code===1008||event.code===4000){this.closed=true;this.onStatus('Sessão encerrada. Entre novamente.');return;}
    this.state='RECONNECTING';this.metrics.reconnects++;this.onStatus('Reconectando…');this.retry=setTimeout(()=>this.connect(),Math.min(5000,500*2**this.attempt++));
   };
  }
  async ready(){
   this.connect();const socket=this.socket;if(socket.readyState===WebSocket.OPEN)return;
   await new Promise((resolve,reject)=>{const clean=()=>{clearTimeout(timer);socket.removeEventListener('open',opened);socket.removeEventListener('close',failed);};const opened=()=>{clean();resolve();},failed=()=>{clean();reject(Error('Não foi possível conectar ao jogo. Tente novamente.'));};const timer=setTimeout(failed,10000);socket.addEventListener('open',opened,{once:true});socket.addEventListener('close',failed,{once:true});});
  }
  observe(input,now){if(!this.observedInput||Object.keys(input).some(k=>input[k]!==this.observedInput[k]))this.observedInput={...input,at:now};}
  flushInput(){const socket=this.socket,input=this.input(),now=performance.now();if(!input||socket?.readyState!==WebSocket.OPEN||socket.bufferedAmount>=4096)return;const last=this.lastInput,changed=!last||Object.keys(input).some(key=>input[key]!==last[key]);if(!changed&&now-this.lastSent<150||changed&&now-this.lastSent<1000/60)return;this.observe(input,now);const seq=++this.sequence;this.commands.push({...input,seq,at:changed?Math.max(this.lastSent,this.observedInput.at):now});while(this.commands.length>256)this.commands.shift();const payload=JSON.stringify({type:'input',seq,...input});socket.send(payload);this.metrics.bytesSent+=wireBytes(payload);this.lastInput={...input};this.lastSent=now;}
  predict(userId){
   const state=this.decoder.state,input=this.input()||{x:0,y:0},now=performance.now();if(!state)return null;
   let previous=this.lastPrediction;if(previous?.matchId!==state.matchId){previous=null;this.lastPrediction=null;this.correction={x:0,y:0};}
   this.observe(input,now);const commands=this.commands.slice(),last=commands.at(-1);
   if(!last||last.x!==input.x||last.y!==input.y)commands.push({...input,seq:this.sequence+1,at:this.observedInput.at});
   const predictionStarted=performance.now();const target=root.MaxballPrediction.pending(state,userId,commands,now);if(!target)return null;
   const dt=previous?Math.max(0,Math.min(.1,(now-previous.at)/1000)):0,offset=this.correction;
   offset.x*=Math.exp(-18*dt);offset.y*=Math.exp(-18*dt);
   const discontinuity=previous&&(state.G.phase!==previous.phase||state.G.ko!==previous.ko||state.G.sidesSwapped!==previous.swapped||state.G.pauseState!==previous.pause||Math.hypot(target.x-previous.p.x,target.y-previous.p.y)>120);
   if(discontinuity||!previous)offset.x=offset.y=0;
   else if(previous.tick!==state.tick){
    const advanced=root.MaxballPrediction.predict({...state,P:state.P.map(p=>p.id===userId?previous.p:p)},userId,input,dt);
    offset.x=advanced.x-target.x;offset.y=advanced.y-target.y;const length=Math.hypot(offset.x,offset.y),limit=12;if(length>limit){offset.x*=limit/length;offset.y*=limit/length;}
    this.metrics.correction=Math.hypot(offset.x,offset.y);
   }
   const p={...target,x:target.x+offset.x,y:target.y+offset.y};this.metrics.predictionMs=performance.now()-predictionStarted;
   this.metrics.snapshotAge=now-(this.lastFrameAt??now);this.metrics.pendingInputs=commands.filter(c=>c.seq>(state.inputState?.[userId]?.seq??-1)).length;
   this.lastPrediction={matchId:state.matchId,tick:state.tick,phase:state.G.phase,ko:state.G.ko,swapped:state.G.sidesSwapped,pause:state.G.pauseState,p,at:now};
   const ack=state.inputState?.[userId]?.seq;if(ack!==undefined)while(this.commands.length>1&&this.commands[1].seq<=ack)this.commands.shift();return p;
  }
  close(){this.closed=true;this.state='DISCONNECTED';clearTimeout(this.retry);clearInterval(this.sender);clearInterval(this.pinger);this.socket?.close();this.decoder.state=null;this.decoder.roster.clear();this.lastPrediction=null;this.commands=[];this.observedInput=null;this.correction={x:0,y:0};}
 }
 root.MaxballOnline={Connection};
})(globalThis);
