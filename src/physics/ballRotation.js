(function(root){
 function roll(b,dx,dy,r){const d=Math.hypot(dx,dy);if(d<1e-9)return;const a=d/r*.5,k=Math.sin(a)/d,x=-dy*k,y=dx*k,w=Math.cos(a),qx=b.qx||0,qy=b.qy||0,qz=b.qz||0,qw=b.qw??1;
  b.qx=w*qx+x*qw+y*qz;b.qy=w*qy+y*qw-x*qz;b.qz=w*qz+x*qy-y*qx;b.qw=w*qw-x*qx-y*qy;const n=Math.hypot(b.qx,b.qy,b.qz,b.qw)||1;b.qx/=n;b.qy/=n;b.qz/=n;b.qw/=n;b.rollX=(b.rollX||0)+dy/r;b.rollY=(b.rollY||0)-dx/r;
 }
 function blend(a,b,t,out){if(!Number.isFinite(b.qw))return out;const ax=a.qx||0,ay=a.qy||0,az=a.qz||0,aw=a.qw??1,sign=ax*(b.qx||0)+ay*(b.qy||0)+az*(b.qz||0)+aw*b.qw<0?-1:1;out.qx=ax+(sign*(b.qx||0)-ax)*t;out.qy=ay+(sign*(b.qy||0)-ay)*t;out.qz=az+(sign*(b.qz||0)-az)*t;out.qw=aw+(sign*b.qw-aw)*t;const n=Math.hypot(out.qx,out.qy,out.qz,out.qw)||1;for(const k of ['qx','qy','qz','qw'])out[k]/=n;return out;}
 const api={roll,blend};if(typeof module!=='undefined')module.exports=api;else root.MaxballBallRotation=api;
})(globalThis);
