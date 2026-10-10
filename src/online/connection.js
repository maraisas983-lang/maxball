(function(root){
 'use strict';
 function wireBytes(text){let bytes=0;for(let i=0;i<text.length;i++){const c=text.charCodeAt(i);if(c<128)bytes++;else if(c<2048)bytes+=2;else if(c>=55296&&c<=56319&&text.charCodeAt(i+1)>=56320&&text.charCodeAt(i+1)<=57343){bytes+=4;i++;}else bytes+=3;}return bytes;}
 class Connection {
  constructor({onMessage,onStatus,input}){this.onMessage=onMessage;this.onStatus=onStatus;this.input=input;this.closed=true;this.attempt=0;this.sequence=0;this.decoder=new root.MaxballProtocol.Decoder();this.state='DISCONNECTED';this.lastPrediction=null;this.release=null;this.inputHistory=[];this.lastInput=null;this.lastSent=0;this.lastResync=0;this.metrics={ping:0,jitter:0,received:0,dropped:0,reconnects:0,bytesReceived:0,bytesSent:0,startedAt:performance.now()};}
  connect(){
   this.closed=false;clearTimeout(this.retry);if(this.socket&&[WebSocket.OPEN,WebSocket.CONNECTING].includes(this.socket.readyState))return;
   this.state=this.attempt?'RECONNECTING':'CONNECTING';const socket=new WebSocket(location.origin.replace(/^http/,'ws')+'/ws');this.socket=socket;
   socket.onopen=()=>{
    if(this.socket!==socket)return;this.state='CONNECTED';this.attempt=0;this.sequence=0;this.decoder.state=null;this.lastPrediction=null;this.release=null;this.inputHistory=[];this.lastInput=null;this.lastSent=0;this.metrics.startedAt=performance.now();this.metrics.bytesReceived=this.metrics.bytesSent=0;this.onStatus('Conectado');socket.send(JSON.stringify({type:'subscribe'}));
    clearInterval(this.pinger);this.pinger=setInterval(()=>{if(socket.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type:'ping',sentAt:performance.now()}));},2000);
    clearInterval(this.sender);this.sender=setInterval(()=>this.flushInput(),1000/30);
   };
   socket.onmessage=event=>{if(this.socket!==socket||this.closed)return;try{const at=performance.now();this.metrics.bytesReceived+=typeof event.data==='string'?wireBytes(event.data):0;const raw=JSON.parse(event.data);if(raw.type==='pong'){const ping=Math.round(performance.now()-raw.sentAt);this.metrics.jitter=this.metrics.jitter*.85+Math.abs(ping-this.metrics.ping)*.15;this.metrics.ping=ping;return;}const message=this.decoder.read(raw);this.metrics.received++;if(!message){this.metrics.dropped++;if(raw.type==='delta'&&performance.now()-this.lastResync>500){this.lastResync=performance.now();socket.send(JSON.stringify({type:'subscribe'}));}return;}if(message.type==='snapshot'){this.lastFrameAt=performance.now();this.state=message.state.G.phase==='end'?'CONNECTED':'IN_MATCH';}this.onMessage(message);root.MaxballPerf?.meter.add('network',performance.now()-at);}catch{this.onStatus('Falha ao receber a partida. Reconectando…');socket.close();}};
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
  flushInput(){const socket=this.socket,input=this.input(),now=performance.now();if(!input||socket?.readyState!==WebSocket.OPEN||socket.bufferedAmount>=16384)return;const last=this.lastInput,changed=!last||Object.keys(input).some(key=>input[key]!==last[key]),urgent=!!last&&(input.shootSeq!==last.shootSeq||input.passSeq!==last.passSeq||input.shoot&&!last.shoot||input.pass&&!last.pass);if(!changed&&now-this.lastSent<150||changed&&now-this.lastSent<(urgent?1000/60:1000/30))return;const payload=JSON.stringify({type:'input',seq:++this.sequence,...input});socket.send(payload);this.metrics.bytesSent+=wireBytes(payload);this.lastInput={...input};this.lastSent=now;}
  predict(userId){
   const state=this.decoder.state,input=this.input()||{x:0,y:0},now=performance.now();if(!state)return null;
   const previous=this.lastPrediction,neutral=Math.hypot(input.x,input.y)<.01;
   if(previous?.matchId!==state.matchId){this.lastPrediction=null;this.release=null;this.inputHistory=[];}
   const horizon=Math.max(0,Math.min(.12,(now-(this.lastFrameAt??now)+this.metrics.ping*.5)/1000)),history=this.inputHistory,last=history.at(-1);if(!last)history.push({at:now-horizon*1000,x:input.x,y:input.y});else if(last.x!==input.x||last.y!==input.y)history.push({at:now,x:input.x,y:input.y});while(history.length>64||history.length>2&&history[1].at<now-250)history.shift();
   const p=neutral?root.MaxballPrediction.predict(state,userId,input,0):root.MaxballPrediction.predictTimeline?root.MaxballPrediction.predictTimeline(state,userId,history,now-horizon*1000,now):root.MaxballPrediction.predict(state,userId,input,horizon);if(!p)return null;
   if(neutral&&state.G.phase==='play'){
    if(previous?.moving&&previous.matchId===state.matchId)this.release={x:previous.p.x,y:previous.p.y,sequence:this.sequence+1,until:now+200};
    if(this.release&&(state.acks?.[userId]??-1)<this.release.sequence&&now<this.release.until){p.x=this.release.x;p.y=this.release.y;}else this.release=null;
    p.vx=p.vy=0;
   }else this.release=null;
   this.lastPrediction={matchId:state.matchId,moving:!neutral,p};return p;
  }
  close(){this.closed=true;this.state='DISCONNECTED';clearTimeout(this.retry);clearInterval(this.sender);clearInterval(this.pinger);this.socket?.close();this.decoder.state=null;this.decoder.roster.clear();this.lastPrediction=null;this.release=null;this.inputHistory=[];}
 }
 root.MaxballOnline={Connection};
})(globalThis);
