(function(root){
 'use strict';
 const cache=new Map(),steps=48,size=48,R=21,tau=Math.PI*2;
 const phi=(1+Math.sqrt(5))/2,centres=[];
 for(const a of [-1,1])for(const b of [-phi,phi])centres.push([0,a,b],[a,b,0],[b,0,a]);
 const unit=v=>{const d=Math.hypot(...v);return v.map(x=>x/d);};
 const patches=centres.map(raw=>{const c=unit(raw),u=unit(Math.abs(c[2])<.9?[-c[1],c[0],0]:[0,-c[2],c[1]]),v=[c[1]*u[2]-c[2]*u[1],c[2]*u[0]-c[0]*u[2],c[0]*u[1]-c[1]*u[0]];return Array.from({length:5},(_,i)=>{const a=i*tau/5;return unit(c.map((x,j)=>x+.31*(u[j]*Math.cos(a)+v[j]*Math.sin(a))));});});
 function sprite(x,y){
  const key=x+':'+y;let canvas=cache.get(key);if(canvas)return canvas;
  canvas=document.createElement('canvas');canvas.width=canvas.height=size;const g=canvas.getContext('2d'),ax=x*tau/steps,ay=y*tau/steps;
  const rotate=([x,y,z])=>{const qy=y*Math.cos(ax)-z*Math.sin(ax),qz=y*Math.sin(ax)+z*Math.cos(ax);return [x*Math.cos(ay)+qz*Math.sin(ay),qy,-x*Math.sin(ay)+qz*Math.cos(ay)];};
  g.translate(size/2,size/2);g.beginPath();g.arc(0,0,R,0,tau);g.clip();g.fillStyle='#eef3f7';g.fillRect(-R,-R,R*2,R*2);
  for(const patch of patches){const points=patch.map(rotate);if(points.every(v=>v[2]<0))continue;
   // Clip each surface patch at the hemisphere, so it narrows at the rim.
   const visible=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if(a[2]>=0)visible.push(a);if((a[2]>=0)!==(b[2]>=0)){const t=a[2]/(a[2]-b[2]);visible.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,0]);}}
   if(!visible.length)continue;g.beginPath();visible.forEach((v,i)=>i?g.lineTo(v[0]*R,v[1]*R):g.moveTo(v[0]*R,v[1]*R));g.closePath();g.fillStyle='#182433';g.fill();g.strokeStyle='#667582';g.lineWidth=.5;g.stroke();
  }
  const shade=g.createRadialGradient(-R*.4,-R*.45,R*.08,0,0,R);shade.addColorStop(0,'rgba(255,255,255,.56)');shade.addColorStop(.42,'rgba(255,255,255,.08)');shade.addColorStop(.8,'rgba(17,30,47,.12)');shade.addColorStop(1,'rgba(7,15,30,.65)');g.fillStyle=shade;g.fillRect(-R,-R,2*R,2*R);
  g.strokeStyle='rgba(6,15,28,.75)';g.lineWidth=1.3;g.beginPath();g.arc(0,0,R-.6,0,tau);g.stroke();
  cache.set(key,canvas);if(cache.size>96)cache.delete(cache.keys().next().value);return canvas;
 }
 function draw(g,ball,radius){
  const quantize=v=>((Math.round((v||0)/tau*steps)%steps)+steps)%steps;
  g.fillStyle='rgba(0,0,0,.27)';g.beginPath();g.ellipse(ball.x+radius*.15,ball.y+radius*.7,radius*.95,radius*.4,0,0,tau);g.fill();
  const image=sprite(quantize(ball.rollX),quantize(ball.rollY??ball.rot));g.drawImage(image,ball.x-radius*size/(R*2),ball.y-radius*size/(R*2),radius*size/R,radius*size/R);
 }
 root.MaxballBallVisual={draw};
})(globalThis);
