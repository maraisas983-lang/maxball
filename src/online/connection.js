(function(root){
 'use strict';
 class Connection {
  constructor({onMessage,onStatus,input}){this.onMessage=onMessage;this.onStatus=onStatus;this.input=input;this.closed=true;this.attempt=0;this.sequence=0;this.decoder=new root.MaxballProtocol.Decoder();this.state='DISCONNECTED';this.lastPrediction=null;this.release=null;this.metrics={ping:0,received:0,dropped:0,reconnects:0};}
  connect(){
   this.closed=false;clearTimeout(this.retry);if(this.socket&&[WebSocket.OPEN,WebSocket.CONNECTING].includes(this.socket.readyState))return;
   this.state=this.attempt?'RECONNECTING':'CONNECTING';const socket=new WebSocket(location.origin.replace(/^http/,'ws')+'/ws');this.socket=socket;
   socket.onopen=()=>{
    if(this.socket!==socket)return;this.state='CONNECTED';this.attempt=0;this.sequence=0;this.decoder.state=null;this.lastPrediction=null;this.release=null;this.onStatus('Conectado');socket.send(JSON.stringify({type:'subscribe'}));
    clearInterval(this.pinger);this.pinger=setInterval(()=>{if(socket.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type:'ping',sentAt:performance.now()}));},2000);
    let lastInput='',lastSent=0;clearInterval(this.sender);this.sender=setInterval(()=>{const input=this.input();if(!input||socket.readyState!==WebSocket.OPEN||socket.bufferedAmount>=16384)return;const key=JSON.stringify(input),now=performance.now();if(key===lastInput&&now-lastSent<150)return;lastInput=key;lastSent=now;socket.send(JSON.stringify({type:'input',seq:++this.sequence,...input}));},1000/30);
   };
   socket.onmessage=event=>{if(this.socket!==socket||this.closed)return;try{const raw=JSON.parse(event.data);if(raw.type==='pong'){this.metrics.ping=Math.round(performance.now()-raw.sentAt);return;}const message=this.decoder.read(raw);this.metrics.received++;if(!message){this.metrics.dropped++;return;}if(message.type==='snapshot'){this.lastFrameAt=performance.now();this.state=message.state.G.phase==='end'?'CONNECTED':'IN_MATCH';}this.onMessage(message);}catch{this.onStatus('Falha ao receber a partida. Reconectando…');socket.close();}};
   socket.onerror=()=>this.onStatus('Conexão interrompida');
   socket.onclose=event=>{
    if(this.socket!==socket)return;clearInterval(this.sender);clearInterval(this.pinger);this.state='DISCONNECTED';
    if(this.closed)return;
    if(event.code===1008||event.code===4000){this.closed=true;this.onStatus('Sessão encerrada. Entre novamente.');return;}
    this.state='RECONNECTING';this.metrics.reconnects++;this.onStatus('Reconectando…');this.retry=setTimeout(()=>this.connect(),Math.min(5000,500*2**this.attempt++));
   };
  }
  predict(userId){
   const state=this.decoder.state,input=this.input()||{x:0,y:0},now=performance.now();if(!state)return null;
   const previous=this.lastPrediction,neutral=Math.hypot(input.x,input.y)<.01;
   if(previous?.matchId!==state.matchId){this.lastPrediction=null;this.release=null;}
   const p=root.MaxballPrediction.predict(state,userId,input,(now-(this.lastFrameAt||now)+this.metrics.ping*.5)/1000);if(!p)return null;
   if(neutral&&state.G.phase==='play'){
    if(previous?.moving&&previous.matchId===state.matchId)this.release={x:previous.p.x,y:previous.p.y,sequence:this.sequence+1,until:now+200};
    if(this.release&&(state.acks?.[userId]??-1)<this.release.sequence&&now<this.release.until){p.x=this.release.x;p.y=this.release.y;}else this.release=null;
    p.vx=p.vy=0;
   }else this.release=null;
   this.lastPrediction={matchId:state.matchId,moving:!neutral,p};return p;
  }
  close(){this.closed=true;this.state='DISCONNECTED';clearTimeout(this.retry);clearInterval(this.sender);clearInterval(this.pinger);this.socket?.close();}
 }
 root.MaxballOnline={Connection};
})(globalThis);
