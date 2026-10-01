(function(root){
 'use strict';
 class Connection {
  constructor({onMessage,onStatus,input}){this.onMessage=onMessage;this.onStatus=onStatus;this.input=input;this.closed=true;this.attempt=0;this.sequence=0;}
  connect(){
   this.closed=false;clearTimeout(this.retry);if(this.socket&&[WebSocket.OPEN,WebSocket.CONNECTING].includes(this.socket.readyState))return;
   const socket=new WebSocket(location.origin.replace(/^http/,'ws')+'/ws');this.socket=socket;
   socket.onopen=()=>{
    if(this.socket!==socket)return;this.attempt=0;this.sequence=0;this.onStatus('Conectado');socket.send(JSON.stringify({type:'subscribe'}));
    clearInterval(this.sender);this.sender=setInterval(()=>{const input=this.input();if(input&&socket.readyState===WebSocket.OPEN&&socket.bufferedAmount<16384)socket.send(JSON.stringify({type:'input',seq:++this.sequence,...input}));},1000/30);
   };
   socket.onmessage=event=>{if(this.socket===socket&&!this.closed)this.onMessage(JSON.parse(event.data));};
   socket.onerror=()=>this.onStatus('Conexão interrompida');
   socket.onclose=event=>{
    if(this.socket!==socket)return;clearInterval(this.sender);
    if(this.closed)return;
    if(event.code===1008||event.code===4000){this.closed=true;this.onStatus('Sessão encerrada. Entre novamente.');return;}
    this.onStatus('Reconectando…');this.retry=setTimeout(()=>this.connect(),Math.min(5000,500*2**this.attempt++));
   };
  }
  close(){this.closed=true;clearTimeout(this.retry);clearInterval(this.sender);this.socket?.close();}
 }
 root.MaxballOnline={Connection};
})(globalThis);
