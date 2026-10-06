(function(root){
 'use strict';
 const fields=['x','y','vx','vy','fx','fy','st','cd','hop','inactive','hid'];
 const round=v=>typeof v==='number'?Math.round(v*100)/100:v;
 function snapshot(match,tick=0){
  const state={matchId:match.id,cfg:match.cfg,G:{...match.G,cfg:undefined,teamRequests:undefined},P:match.P,ball:match.ball,W:match.W,H:match.H,GY0:match.GY0,GY1:match.GY1,BR:match.BR};
  state.P=state.P.map(p=>Object.fromEntries(['id','name','displayName','team','num','slot','ctrl','position','kit','sentOff','celebration',...fields].filter(k=>p[k]!==undefined).map(k=>[k,round(p[k])])));
  state.ball=Object.fromEntries(['x','y','vx','vy','rot','rollX','rollY','qx','qy','qz','qw','last','trail'].map(k=>[k,round(state.ball[k])]));
  state.tick=tick;state.serverTime=performance.now();return state;
 }
 function frameFromMatch(match,tick,acks){
  return {type:'frame',matchId:match.id,tick,serverTime:performance.now(),acks,G:{...match.G,cfg:undefined,teamRequests:undefined},P:match.P.map(p=>[p.id,...fields.map(k=>round(p[k]??0))]),ball:Object.fromEntries(['x','y','vx','vy','rot','rollX','rollY','qx','qy','qz','qw','last','trail'].map(k=>[k,round(match.ball[k])]))};
 }
 function frame(state){return {type:'frame',matchId:state.matchId,tick:state.tick,serverTime:state.serverTime,acks:state.acks,G:state.G,P:state.P.map(p=>[p.id,...fields.map(k=>p[k]??0)]),ball:state.ball};}
 class Decoder {
  constructor(){this.state=null;this.roster=new Map();}
  read(message){
   if(message.type==='snapshot'){this.state=message.state;this.roster=new Map(this.state.P.map(p=>[p.id,p]));return message;}
   if(message.type!=='frame')return message;
   if(!this.state||this.state.matchId!==message.matchId||message.tick<=this.state.tick)return null;
   const roster=this.roster;
   const P=message.P.map(row=>({...roster.get(row[0]),...Object.fromEntries(fields.map((k,i)=>[k,row[i+1]]))}));
   if(P.some(p=>!p.id))return null;
   this.state={...this.state,P,G:message.G,ball:message.ball,acks:message.acks,tick:message.tick,serverTime:message.serverTime};
   return {type:'snapshot',state:this.state};
  }
 }
 const api={snapshot,frame,frameFromMatch,Decoder};if(typeof module!=='undefined')module.exports=api;else root.MaxballProtocol=api;
})(globalThis);
