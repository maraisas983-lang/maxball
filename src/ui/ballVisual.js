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
  for(let fi=0;fi<faces.length;fi++){const face=faces[fi],points=projected[fi],samples=face.samples;let any=false;
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
 function draw(g,ball,radius,skin=0){
  g.fillStyle='rgba(0,0,0,.18)';g.beginPath();g.ellipse(ball.x+radius*.08,ball.y+radius*.25,radius*.92,radius*.72,0,0,tau);g.fill();
  const ax=-(ball.rollX||0)/2,ay=-(ball.rollY||0)/2,q=Number.isFinite(ball.qw)?[ball.qx||0,ball.qy||0,ball.qz||0,ball.qw]:[Math.sin(ax)*Math.cos(ay),Math.cos(ax)*Math.sin(ay),-Math.sin(ax)*Math.sin(ay),Math.cos(ax)*Math.cos(ay)];const image=sprite(q,skin);g.drawImage(image,ball.x-radius*size/(R*2),ball.y-radius*size/(R*2),radius*size/R,radius*size/R);
 }
 root.MaxballBallVisual={draw,stats,project(point,q,out=new Float64Array(3)){return project(point,q,out);},clear(){cache.clear();}};
})(globalThis);
