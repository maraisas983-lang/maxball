(function(root){
 'use strict';
 const fields=['x','y','vx','vy','fx','fy','st','cd','hop','inactive','hid','actionFlash'];
 const staticFields=['id','name','displayName','team','num','slot','ctrl','position','kit','sentOff','celebration'],ballFields=['x','y','vx','vy','rot','rollX','rollY','qx','qy','qz','qw','last','trail'];
 const round=v=>typeof v==='number'?Math.round(v*100)/100:v;
 function snapshot(match,tick=0){
  const state={matchId:match.id,cfg:match.cfg,G:{...match.G,cfg:undefined,teamRequests:undefined},P:match.P,ball:match.ball,W:match.W,H:match.H,GY0:match.GY0,GY1:match.GY1,BR:match.BR};
  state.P=state.P.map(p=>Object.fromEntries(['id','name','displayName','team','num','slot','ctrl','position','kit','sentOff','celebration',...fields].filter(k=>p[k]!==undefined).map(k=>[k,round(p[k])])));
  state.ball=Object.fromEntries(['x','y','vx','vy','rot','rollX','rollY','qx','qy','qz','qw','last','trail'].map(k=>[k,round(state.ball[k])]));
  state.inputState=structuredClone(match.inputState||{});state.tick=tick;state.serverTime=performance.now();return state;
 }
 function frameFromMatch(match,tick,acks){
  return {type:'frame',matchId:match.id,tick,serverTime:performance.now(),acks,inputState:structuredClone(match.inputState||{}),G:{...match.G,cfg:undefined,teamRequests:undefined},P:match.P.map(p=>[p.id,...fields.map(k=>round(p[k]??0))]),ball:Object.fromEntries(['x','y','vx','vy','rot','rollX','rollY','qx','qy','qz','qw','last','trail'].map(k=>[k,round(match.ball[k])]))};
 }
 function frame(state){return {type:'frame',matchId:state.matchId,tick:state.tick,serverTime:state.serverTime,acks:state.acks,inputState:state.inputState,G:state.G,P:state.P.map(p=>[p.id,...fields.map(k=>p[k]??0)]),ball:state.ball};}
 // Deltas are chained on a reliable WebSocket. Every subscription gets a fresh baseline.
 class Encoder {
  constructor(state){this.matchId=state.matchId;this.tick=state.tick;this.players=new Map(state.P.map(p=>[p.id,{...p}]));this.g=new Map();for(const key of Object.keys(state.G))if(state.G[key]!==undefined)this.g.set(key,JSON.stringify(state.G[key]));this.ball={...state.ball};}
  encode(match,tick,acks){
   if(match.id!==this.matchId||match.P.length!==this.players.size||match.P.some(p=>!this.players.has(p.id)||staticFields.some(key=>round(p[key])!==this.players.get(p.id)[key])))return {type:'snapshot',state:{...snapshot(match,tick),acks}};
   const P=[],G={},removedG=[],ball={},removedBall=[];
   for(const p of match.P){const before=this.players.get(p.id),values=[];let mask=0;for(let i=0;i<fields.length;i++){const key=fields[i],value=round(p[key]??0);if(value!==round(before[key]??0)){mask|=1<<i;values.push(value);before[key]=value;}}if(mask)P.push([p.id,mask,...values]);}
   for(const key of Object.keys(match.G)){if(key==='cfg'||key==='teamRequests'||match.G[key]===undefined)continue;const value=match.G[key],encoded=JSON.stringify(value);if(encoded!==this.g.get(key)){G[key]=value;this.g.set(key,encoded);}}
   for(const key of this.g.keys())if(match.G[key]===undefined){removedG.push(key);this.g.delete(key);}
   for(const key of ballFields){const value=round(match.ball[key]);if(value!==this.ball[key]){if(value===undefined)removedBall.push(key);else ball[key]=value;this.ball[key]=value;}}
   const data={type:'delta',matchId:this.matchId,tick,baseTick:this.tick,serverTime:performance.now(),acks,inputState:structuredClone(match.inputState||{}),G,P,ball};if(removedG.length)data.removedG=removedG;if(removedBall.length)data.removedBall=removedBall;this.tick=tick;return data;
  }
 }
 class Decoder {
  constructor(){this.state=null;this.roster=new Map();}
  read(message){
   if(message.type==='snapshot'){this.state=message.state;this.roster=new Map(this.state.P.map(p=>[p.id,p]));return message;}
   if(message.type==='delta'){
    if(!this.state||this.state.matchId!==message.matchId||message.tick<=this.state.tick||message.baseTick!==this.state.tick)return null;
    const changed=new Map(message.P.map(row=>[row[0],row])),P=this.state.P.map(p=>{const row=changed.get(p.id);if(!row)return p;const next={...p};let at=2;for(let i=0;i<fields.length;i++)if(row[1]&(1<<i))next[fields[i]]=row[at++];return next;}),G={...this.state.G,...message.G},ball={...this.state.ball,...message.ball};for(const key of message.removedG||[])delete G[key];for(const key of message.removedBall||[])delete ball[key];
    this.state={...this.state,P,G,ball,acks:message.acks,inputState:message.inputState,tick:message.tick,serverTime:message.serverTime};return {type:'snapshot',state:this.state};
   }
   if(message.type!=='frame')return message;
   if(!this.state||this.state.matchId!==message.matchId||message.tick<=this.state.tick)return null;
   const roster=this.roster;
   const P=message.P.map(row=>({...roster.get(row[0]),...Object.fromEntries(fields.map((k,i)=>[k,row[i+1]]))}));
   if(P.some(p=>!p.id))return null;
   this.state={...this.state,P,G:message.G,ball:message.ball,acks:message.acks,inputState:message.inputState,tick:message.tick,serverTime:message.serverTime};
   return {type:'snapshot',state:this.state};
  }
 }
 const api={snapshot,frame,frameFromMatch,Encoder,Decoder};if(typeof module!=='undefined')module.exports=api;else root.MaxballProtocol=api;
})(globalThis);
