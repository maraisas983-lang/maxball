(function(root){
 'use strict';
 const cache=new Map(),size=96,R=43,tau=Math.PI*2;
 // A top-down ball keeps screen-space rolling aligned with the flat playing field.
 const viewCos=1,viewSin=0;
 function project(point,q,out,at=0){const x=point[0],y=point[1],z=point[2],[qx,qy,qz,qw]=q,tx=2*(qy*z-qz*y),ty=2*(qz*x-qx*z),tz=2*(qx*y-qy*x),ry=y+qw*ty+qz*tx-qx*tz,rz=z+qw*tz+qx*ty-qy*tx;out[at]=x+qw*tx+qy*tz-qz*ty;out[at+1]=ry*viewCos-rz*viewSin;out[at+2]=ry*viewSin+rz*viewCos;return out;}
 const phi=(1+Math.sqrt(5))/2,vertices=[];
 for(const a of [-1,1])for(const b of [-phi,phi])vertices.push([0,a,b],[a,b,0],[b,0,a]);
 const unit=v=>{const d=Math.hypot(...v);return v.map(x=>x/d);};
 const adjacent=vertices.map((a,i)=>vertices.map((b,j)=>j!==i&&Math.abs(Math.hypot(...a.map((v,k)=>v-b[k]))-2)<.001?j:-1).filter(j=>j>=0));
 const edge=(a,b)=>unit(vertices[a].map((v,k)=>(2*v+vertices[b][k])/3));
 const faces=[];
 for(let a=0;a<12;a++){
  const c=unit(vertices[a]),u=unit(Math.abs(c[2])<.9?[-c[1],c[0],0]:[0,-c[2],c[1]]),v=[c[1]*u[2]-c[2]*u[1],c[2]*u[0]-c[0]*u[2],c[0]*u[1]-c[1]*u[0]];
  const points=adjacent[a].map(b=>edge(a,b)).sort((p,q)=>Math.atan2(p.reduce((s,x,k)=>s+x*v[k],0),p.reduce((s,x,k)=>s+x*u[k],0))-Math.atan2(q.reduce((s,x,k)=>s+x*v[k],0),q.reduce((s,x,k)=>s+x*u[k],0)));
  faces.push({points,dark:true});
  for(const b of adjacent[a])for(const c of adjacent[a])if(a<b&&b<c&&adjacent[b].includes(c))faces.push({points:[edge(a,b),edge(b,a),edge(b,c),edge(c,b),edge(c,a),edge(a,c)],dark:false});
 }
 // Geometry is shared by every cached rotation; only projection changes.
 for(const face of faces){face.samples=[];for(let i=0;i<face.points.length;i++){const a=face.points[i],b=face.points[(i+1)%face.points.length];for(let j=0;j<5;j++)face.samples.push(unit(a.map((v,k)=>v+(b[k]-v)*j/5)));}}
 const projected=faces.map(face=>new Float64Array(face.samples.length*3));
 const stats={hits:0,misses:0};
 function sprite(q,skin=0){const palette=root.MaxballCollections?.balls[skin]||{light:'#fafbf9',dark:'#202833'};
  // Finer orientation buckets keep slow dribbling smooth without changing the
  // physical quaternion. The cache stays bounded at 96 small canvas sprites.
  const sign=q[3]<0?-1:1,values=q.map(v=>Math.round(v*sign*1024)/1024),norm=Math.hypot(...values)||1; q=values.map(v=>v/norm);const key=skin+':'+values.join(':');let canvas=cache.get(key);if(canvas){stats.hits++;cache.delete(key);cache.set(key,canvas);return canvas;}
  stats.misses++;if(cache.size>=96){const oldest=cache.keys().next().value;canvas=cache.get(oldest);cache.delete(oldest);}else{canvas=document.createElement('canvas');canvas.width=canvas.height=size;}
  const g=canvas.getContext('2d');if(g.reset)g.reset();else canvas.width=size;

  g.translate(size/2,size/2);g.beginPath();g.arc(0,0,R,0,tau);g.clip();g.fillStyle=palette.light;g.fillRect(-R,-R,R*2,R*2);
  if(palette.style==='jabulani'||palette.style==='trionda')pattern(g,q,palette.style);
  else for(let fi=0;fi<faces.length;fi++){const face=faces[fi],points=projected[fi],samples=face.samples;let any=false;
   for(let i=0;i<samples.length;i++){project(samples[i],q,points,i*3);any ||= points[i*3+2]>=0;}
   if(!any)continue;g.beginPath();let started=false,firstX=0,firstY=0,firstLimb=false,lastX=0,lastY=0,lastLimb=false;
   const emit=(x,y,limb)=>{if(started){if(lastLimb&&limb){const a=Math.atan2(lastY,lastX),b=Math.atan2(y,x),delta=Math.atan2(Math.sin(b-a),Math.cos(b-a));g.arc(0,0,R,a,a+delta,delta<0);}else g.lineTo(x,y);}else{g.moveTo(x,y);firstX=x;firstY=y;firstLimb=limb;started=true;}lastX=x;lastY=y;lastLimb=limb;};
   for(let i=0;i<samples.length;i++){const a=i*3,b=((i+1)%samples.length)*3,az=points[a+2],bz=points[b+2];if(az>=0)emit(points[a]*R,points[a+1]*R,Math.abs(az)<1e-10);if((az>=0)!==(bz>=0)){const t=az/(az-bz),x=points[a]+(points[b]-points[a])*t,y=points[a+1]+(points[b+1]-points[a+1])*t,n=Math.hypot(x,y)||1;emit(x/n*R,y/n*R,true);}}
   if(lastLimb&&firstLimb){const a=Math.atan2(lastY,lastX),b=Math.atan2(firstY,firstX),delta=Math.atan2(Math.sin(b-a),Math.cos(b-a));g.arc(0,0,R,a,a+delta,delta<0);}
   g.closePath();g.fillStyle=face.dark?palette.dark:palette.light;g.fill();g.strokeStyle='rgba(36,45,49,.28)';g.lineWidth=.48;g.stroke();
  }
  const shade=g.createRadialGradient(-R*.25,-R*.3,R*.1,0,0,R*1.12);shade.addColorStop(0,'rgba(255,255,255,.16)');shade.addColorStop(.48,'rgba(255,255,255,0)');shade.addColorStop(.82,'rgba(27,38,43,.06)');shade.addColorStop(1,'rgba(16,27,32,.24)');g.fillStyle=shade;g.fillRect(-R,-R,2*R,2*R);
  g.strokeStyle='rgba(15,25,29,.6)';g.lineWidth=1;g.beginPath();g.arc(0,0,R-.5,0,tau);g.stroke();
  cache.set(key,canvas);if(cache.size>96)cache.delete(cache.keys().next().value);return canvas;
 }
 function pattern(g,q,style){
  const colors=style==='jabulani'?['#171c22','#171c22','#171c22','#171c22']:['#dc3045','#188c5c','#177ac0'];
  for(let band=0;band<colors.length;band++){
   const trace=()=>{g.beginPath();let started=false;const out=new Float64Array(3);
    for(let i=0;i<=180;i++){const t=i*tau/180,angle=band*tau/colors.length,lat=.32*Math.sin(t*2+band),p=[Math.cos(t)*Math.cos(angle)-Math.sin(t)*Math.sin(angle)*Math.sin(lat),Math.cos(t)*Math.sin(angle)+Math.sin(t)*Math.cos(angle)*Math.sin(lat),Math.sin(t)*Math.cos(lat)];project(p,q,out);if(out[2]<0){started=false;continue;}if(started)g.lineTo(out[0]*R,out[1]*R);else{g.moveTo(out[0]*R,out[1]*R);started=true;}}
   };
   g.lineCap='round';trace();g.strokeStyle=style==='jabulani'?'#c5a34e':colors[band];g.lineWidth=style==='jabulani'?12:11;g.stroke();trace();g.strokeStyle=colors[band];g.lineWidth=style==='jabulani'?8:6;g.stroke();
   if(style==='jabulani'){trace();g.strokeStyle=['#df3936','#e5be43','#2f9879','#4684ad'][band];g.lineWidth=2;g.stroke();}
  }
 }
 function eyePose(ball,radius,target,time){
  const dx=(target?.x??ball.x)-ball.x,dy=(target?.y??ball.y)-ball.y,d=Math.hypot(dx,dy),amount=Math.min(.29*radius,d*.09),phase=((time%6)+6)%6;
  const distance=Math.min(phase,6-phase),blink=time>5.8?Math.max(0,1-distance/.16):0;
  return {x:d?dx/d*amount:0,y:d?dy/d*amount:0,open:1-blink};
 }
 function eye(g,ball,radius,options){
  const time=options.time??performance.now()/1000,pose=eyePose(ball,radius,options.target,time);
  g.save();g.translate(ball.x,ball.y);g.scale(radius,radius);g.beginPath();g.arc(0,0,1,0,tau);g.clip();
  const white=g.createRadialGradient(-.25,-.3,.1,0,0,1.1);white.addColorStop(0,'#ffffff');white.addColorStop(.7,'#fff7f3');white.addColorStop(1,'#d9bcbc');g.fillStyle=white;g.fillRect(-1,-1,2,2);
  g.lineCap='round';
  for(let i=0;i<11;i++){const a=i*tau/11+.13,cs=Math.cos(a),sn=Math.sin(a);g.strokeStyle=i%2?'#cc6b73':'#e39ca2';g.lineWidth=.012;g.beginPath();g.moveTo(cs,sn);g.bezierCurveTo(cs*.85-sn*.08,sn*.85+cs*.08,cs*.68+sn*.1,sn*.68-cs*.1,cs*.49,sn*.49);g.stroke();g.beginPath();g.moveTo(cs*.76,sn*.76);g.lineTo(cs*.72-sn*.16,sn*.72+cs*.16);g.lineTo(cs*.58-sn*.2,sn*.58+cs*.2);g.stroke();}
  g.save();g.translate(pose.x/radius,pose.y/radius);g.scale(1,Math.max(.001,pose.open));
  const iris=g.createRadialGradient(0,0,.12,0,0,.44);iris.addColorStop(0,'#c6ac4e');iris.addColorStop(.45,'#5ac6a4');iris.addColorStop(.83,'#237367');iris.addColorStop(1,'#113e3c');g.fillStyle=iris;g.beginPath();g.arc(0,0,.44,0,tau);g.fill();
  for(let i=0;i<32;i++){const a=i*tau/32;g.strokeStyle=i%2?'rgba(215,244,170,.5)':'rgba(7,66,59,.5)';g.lineWidth=.012;g.beginPath();g.moveTo(Math.cos(a)*.21,Math.sin(a)*.21);g.lineTo(Math.cos(a+.05)*.4,Math.sin(a+.05)*.4);g.stroke();}
  g.fillStyle='#101a20';g.beginPath();g.arc(0,0,.21,0,tau);g.fill();g.fillStyle='rgba(255,255,255,.85)';g.beginPath();g.arc(-.12,-.14,.075,0,tau);g.fill();g.restore();
  if(pose.open<.3){g.strokeStyle='#bd8585';g.lineWidth=.035;g.beginPath();g.moveTo(-.65,0);g.quadraticCurveTo(0,.12,.65,0);g.stroke();}
  g.restore();
 }
 function draw(g,ball,radius,skin=0,options={}){
  g.fillStyle='rgba(0,0,0,.18)';g.beginPath();g.ellipse(ball.x+radius*.08,ball.y+radius*.25,radius*.92,radius*.72,0,0,tau);g.fill();
  if(root.MaxballCollections?.balls[skin]?.style==='eye'){eye(g,ball,radius,options);return;}
  const ax=-(ball.rollX||0)/2,ay=-(ball.rollY||0)/2,q=Number.isFinite(ball.qw)?[ball.qx||0,ball.qy||0,ball.qz||0,ball.qw]:[Math.sin(ax)*Math.cos(ay),Math.cos(ax)*Math.sin(ay),-Math.sin(ax)*Math.sin(ay),Math.cos(ax)*Math.cos(ay)];const image=sprite(q,skin);g.drawImage(image,ball.x-radius*size/(R*2),ball.y-radius*size/(R*2),radius*size/R,radius*size/R);
 }
 root.MaxballBallVisual={draw,eyePose,stats,project(point,q,out=new Float64Array(3)){return project(point,q,out);},clear(){cache.clear();}};
})(globalThis);
