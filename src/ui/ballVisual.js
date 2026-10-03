(function(root){
 'use strict';
 const cache=new Map(),steps=64,size=96,R=43,tau=Math.PI*2;
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
 function sprite(x,y){
  const key=x+':'+y;let canvas=cache.get(key);if(canvas)return canvas;
  canvas=document.createElement('canvas');canvas.width=canvas.height=size;const g=canvas.getContext('2d'),ax=x*tau/steps,ay=y*tau/steps;
  const sa=Math.sin(ax),ca=Math.cos(ax),sb=Math.sin(ay),cb=Math.cos(ay);
  const rotate=([x,y,z])=>{const qy=y*ca-z*sa,qz=y*sa+z*ca;return [x*cb+qz*sb,qy,-x*sb+qz*cb];};
  g.translate(size/2,size/2);g.beginPath();g.arc(0,0,R,0,tau);g.clip();g.fillStyle='#fafbf9';g.fillRect(-R,-R,R*2,R*2);
  for(const face of faces){
   // Sample spherical seams so adjoining panels meet, including at the rim.
   const points=face.samples.map(rotate);
   if(points.every(v=>v[2]<0))continue;
   const visible=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if(a[2]>=0)visible.push(a);if((a[2]>=0)!==(b[2]>=0)){const t=a[2]/(a[2]-b[2]);visible.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,0]);}}
   if(!visible.length)continue;g.beginPath();visible.forEach((v,i)=>i?g.lineTo(v[0]*R,v[1]*R):g.moveTo(v[0]*R,v[1]*R));g.closePath();g.fillStyle=face.dark?'#202833':'#fafbf9';g.fill();g.strokeStyle='#a3a9aa';g.lineWidth=.65;g.stroke();
  }
  const shade=g.createRadialGradient(-R*.32,-R*.38,R*.08,0,0,R*1.12);shade.addColorStop(0,'rgba(255,255,255,.26)');shade.addColorStop(.48,'rgba(255,255,255,0)');shade.addColorStop(.82,'rgba(27,38,43,.1)');shade.addColorStop(1,'rgba(16,27,32,.4)');g.fillStyle=shade;g.fillRect(-R,-R,2*R,2*R);
  g.strokeStyle='rgba(15,25,29,.6)';g.lineWidth=1;g.beginPath();g.arc(0,0,R-.5,0,tau);g.stroke();
  cache.set(key,canvas);if(cache.size>96)cache.delete(cache.keys().next().value);return canvas;
 }
 function draw(g,ball,radius){
  const quantize=v=>((Math.round((v||0)/tau*steps)%steps)+steps)%steps;
  g.fillStyle='rgba(0,0,0,.22)';g.beginPath();g.ellipse(ball.x+radius*.12,ball.y+radius*.65,radius*.86,radius*.3,0,0,tau);g.fill();
  const image=sprite(quantize(ball.rollX),quantize(ball.rollY??ball.rot));g.drawImage(image,ball.x-radius*size/(R*2),ball.y-radius*size/(R*2),radius*size/R,radius*size/R);
 }
 root.MaxballBallVisual={draw};
})(globalThis);
