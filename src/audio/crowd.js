(function(root){
 'use strict';
 class Crowd {
  constructor(){this.context=null;this.gain=null;this.last=-1;this.celebration=0;this.points=[];this.key='';this.volume=-1;}
  start(context){
   if(!context||this.context===context)return;
   this.context=context;const buffer=context.createBuffer(1,context.sampleRate*3,context.sampleRate),data=buffer.getChannelData(0);let filtered=0;
   for(let i=0;i<data.length;i++){filtered=.88*filtered+.12*(Math.random()*2-1);data[i]=filtered;}
   const source=context.createBufferSource();source.buffer=buffer;source.loop=true;
   const filter=context.createBiquadFilter();filter.type='bandpass';filter.frequency.value=750;filter.Q.value=.55;
   this.gain=context.createGain();this.gain.gain.value=0;source.connect(filter);filter.connect(this.gain);this.gain.connect(context.destination);source.start();
  }
  goal(){this.celebration=3;}
  quiet(){this.volume=-1;if(this.gain)this.gain.gain.setTargetAtTime(0,this.context.currentTime,.1);}
  update(dt,s){
   this.celebration=Math.max(0,this.celebration-dt);
   if(!this.gain)return;const danger=s.G.phase==='play'&&Math.min(s.ball.x,s.W-s.ball.x)<200;
   const volume=root.MaxballPreferences?.get().sound===false||s.G.paused?0:this.celebration>0?.4*(.6+.4*this.celebration/3):s.G.phase==='end'?.08:danger?.07:.025;
   const next=volume*(s.G.cfg.final?1.4:1);if(Math.abs(next-this.volume)>.002){this.volume=next;this.gain.gain.setTargetAtTime(next,this.context.currentTime,.18);}
  }
  draw(g,s,reduced=false,viewport){
   const {W,H,G}=s,key=W+':'+H+':'+!!G.cfg.final;
   if(this.key!==key){this.key=key;this.points=[];for(let i=0;i<(G.cfg.final?192:96);i++)this.points.push({x:20+(i%48)*(W-40)/47,y:i%96<48?-110-Math.floor(i/96)*22:H+110+Math.floor(i/96)*22,phase:i*2.4,flag:i%8===0});}
   const t=Math.floor((G.elapsed||G.el||0)*12)/12+(G.phase==='goal'?G.pt:0),goal=G.phase==='goal';
   for(const p of this.points){if(viewport&&(p.x<viewport.left-30||p.x>viewport.right+30||p.y<viewport.top-30||p.y>viewport.bottom+30))continue;const jump=reduced?0:Math.abs(Math.sin(t*(goal?9:2)+p.phase))*(goal?12:2),y=p.y-jump;
    g.fillStyle=p.x<W/2?'#c8ff2e':'#ff2d87';g.fillRect(p.x-3,y,6,8);g.fillStyle='#e8c7a2';g.fillRect(p.x-2,y-4,4,4);
    if(p.flag){g.strokeStyle='#ccd4ee';g.beginPath();g.moveTo(p.x+5,y+8);g.lineTo(p.x+5,y-18);g.stroke();g.fillStyle=p.x<W/2?'#c8ff2e':'#ff2d87';g.fillRect(p.x+5,y-18,14+(reduced?0:Math.sin(t*4+p.phase)*3),9);}
    if(goal){g.strokeStyle='#e8c7a2';g.beginPath();g.moveTo(p.x-3,y+2);g.lineTo(p.x-8,y-5);g.moveTo(p.x+3,y+2);g.lineTo(p.x+8,y-5);g.stroke();}
   }
  }
 }
 root.MaxballCrowd={Crowd};
})(globalThis);
