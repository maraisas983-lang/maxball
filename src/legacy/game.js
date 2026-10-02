(function () {
const $=s=>document.querySelector(s),cv=$('#cv'),cx=cv.getContext('2d');
let W=1000,H=560,GY0=210,GY1=350,BR=9;const M=40,PR=20,MG=70,E=210,CM=120,GD=46,PM=60;let POSTS=[[0,GY0],[0,GY1],[W,GY0],[W,GY1]],lastSc=[0,0];cv.width=W+2*M;cv.height=H+2*M;
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const SK=MaxballTeams.kits;
const KITS=SK.map(k=>[k.n,k.c[0],k.pr]);
function drawSkin(g,x,y,r,k){const[a,b,c]=k.c;g.save();g.beginPath();g.arc(x,y,r,0,7);g.clip();g.fillStyle=a;g.fillRect(x-r,y-r,2*r,2*r);g.fillStyle=b;g.strokeStyle=b;const P=k.p,d=2*r;
 if(P==='sleeves'){g.fillRect(x-r,y-r,r*.45,2*r);g.fillRect(x+r*.55,y-r,r*.45,2*r);g.fillStyle=c;g.fillRect(x-r,y-r,2*r,r*.14)}else if(P==='detail'){g.fillRect(x-r,y-r*.16,2*r,r*.32);g.fillStyle=c;g.fillRect(x-r*.12,y-r,r*.24,r*.35)}else if(P=='hoops'||P=='vstripe'){const n=P=='hoops'?7:5,h=d/n;for(let i=1;i<n;i+=2)P=='hoops'?g.fillRect(x-r,y-r+i*h,d,h):g.fillRect(x-r+i*h,y-r,h,d)}
 else if(P=='bands3'){g.fillRect(x-r,y-r+d/3,d,d/3);g.fillStyle=c;g.fillRect(x-r,y-r+2*d/3,d,d/3)}
 else if(P=='vthird'){g.fillRect(x-r+d/3,y-r,d/3,d);g.fillStyle=c;g.fillRect(x-r+2*d/3,y-r,d/3,d)}
 else if(P=='half')g.fillRect(x,y-r,r,d);
 else if(P=='sash'){g.translate(x,y);g.rotate(-Math.PI/4);g.fillRect(-2*r,-r*.3,4*r,r*.6)}
 else if(P=='letter'){g.font='700 '+r*1.35+'px Bungee,Impact,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(k.l,x,y+r*.06)}
 else if(P=='star'){g.beginPath();for(let i=0;i<10;i++){const q=i*Math.PI/5-Math.PI/2,rr=i%2?r*.3:r*.72;g.lineTo(x+Math.cos(q)*rr,y+Math.sin(q)*rr)}g.fill()}
 else if(P=='ring'){g.lineWidth=r*.26;g.beginPath();g.arc(x,y,r*.7,0,7);g.stroke()}
 else if(P=='chevron'){g.lineWidth=r*.3;g.lineJoin='miter';g.beginPath();g.moveTo(x-r*.8,y-r*.45);g.lineTo(x,y+r*.3);g.lineTo(x+r*.8,y-r*.45);g.stroke()}
 else if(P=='check'){const n=4,h=d/n;for(let i=0;i<n;i++)for(let j=0;j<n;j++)if((i+j)%2)g.fillRect(x-r+i*h,y-r+j*h,h,h)}
 g.restore();g.fillStyle='rgba(255,255,255,.16)';g.beginPath();g.ellipse(x-r*.3,y-r*.45,r*.36,r*.18,-.6,0,7);g.fill();
 g.lineWidth=Math.max(2,r*.11);g.strokeStyle='#0a0f2c';g.beginPath();g.arc(x,y,r,0,7);g.stroke()}
const SPR={},PSPR={};function skinSpr(i){return SPR[i]||(SPR[i]=(()=>{const c=document.createElement('canvas');c.width=c.height=64;drawSkin(c.getContext('2d'),32,32,29,SK[i]);return c})())}
/* sprite do jogador em jogo: aro branco, borda escura, relevo e brilho */
function pSpr(i){return PSPR[i]||(PSPR[i]=(()=>{const c=document.createElement('canvas');c.width=c.height=96;const g=c.getContext('2d');
 g.fillStyle='#0a0f2c';g.beginPath();g.arc(48,48,47,0,7);g.fill();
 g.fillStyle='#f4f6ff';g.beginPath();g.arc(48,48,43,0,7);g.fill();
 drawSkin(g,48,48,39,SK[i]);
 g.save();g.beginPath();g.arc(48,48,39,0,7);g.clip();
 const s=g.createRadialGradient(38,34,4,48,48,42);s.addColorStop(0,'rgba(255,255,255,.22)');s.addColorStop(.55,'rgba(255,255,255,0)');s.addColorStop(1,'rgba(0,0,20,.38)');
 g.fillStyle=s;g.fillRect(0,0,96,96);g.restore();
 g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=2;g.beginPath();g.arc(48,48,35,Math.PI*1.05,Math.PI*1.6);g.stroke();return c})())}
const lum=c=>{const n=parseInt(c.slice(1),16);return((n>>16)*299+((n>>8&255)*587)+(n&255)*114)/1000};
const cd=(a,b)=>{const f=h=>{const n=parseInt(h.slice(1),16);return[n>>16,n>>8&255,n&255]},x=f(a),y=f(b);return Math.hypot(x[0]-y[0],x[1]-y[1],x[2]-y[2])};
let HT=0,oppI=0;const FMT=[0,[760,440,100],[1000,560,140],[1240,680,170],[1480,800,200]];function pickOpp(){let i,t=0;do{i=Math.random()*KITS.length|0}while((i==save.kit||cd(SK[i].c[0],KITS[save.kit][1])<110)&&++t<60);return i}
const FX=[['Sem rastro',0],['Neon',50],['Fogo',100],['Estrelas',150]];
let storageIssue = '', ready = false;
const storageMessages = {
 read: 'Armazenamento indisponível. O progresso desta sessão não será salvo.',
 write: 'Não foi possível salvar. Verifique o espaço e as permissões do navegador.',
 backup: 'Não foi possível criar backup. O save original foi preservado; esta sessão não será salva.',
 invalid: 'Save inválido recuperado. O conteúdo original foi guardado em backup.',
 future: 'Save de versão mais recente. Alterações desta sessão não serão salvas.'
};
const repository = MaxballStorage.createLocalSaveRepository({
 kitCount: SK.length, effectCount: FX.length,
 onError(code) {
  const message = storageMessages[code];
  if (storageIssue === message) return;
  storageIssue = message;
  console.warn('[MAXBALL] ' + message);
  if (ready) toast(message);
 }
});
let save = repository.load();
const DEF = MaxballStorage.DEFAULT_CONTROLS;
const persist = () => repository.save(save);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),rnd=(a,b)=>a+Math.random()*(b-a);

/* ---------- telas ---------- */
function show(id){resetInputs();if(id!=='game')crowd.quiet();document.querySelectorAll('.scr').forEach(s=>s.classList.toggle('on',s.id==id));
 document.querySelectorAll('.coins').forEach(c=>c.textContent=save.coins+' moedas');
 if(id==='home')window.MaxballHome?.refresh();if(id=='prof')rProf();uchip();if(id=='friends')rFr();if(id=='custom')rInv();if(id=='room')rRoom();if(id=='ctl')rCtl();if(id=='lock')lkBegin()}
document.addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(!b)return;const g=b.dataset.go;aud();
 if(g=='shop'||g=='custom'){inv.shop=g=='shop';inv.tab='k';inv.i=inv.shop?-1:save.kit;show('custom');return}
 if(g=='bot'||g=='train'||g=='local')start(g);else show(g)});
function toast(t){const e=$('#toast');e.textContent=t;e.style.opacity=1;setTimeout(()=>e.style.opacity=0,1600)}
function chip(label,sw,sel,fn){const b=document.createElement('button');b.className='chip'+(sel?' sel':'');b.innerHTML=(sw?`<i style="background:${sw}"></i>`:'')+label;b.onclick=fn;return b}
let inv={tab:'k',i:0,shop:false};
const PL={solid:'Liso',hoops:'Listras horizontais',vstripe:'Listras verticais',bands3:'Faixas tricolores',vthird:'Tricolor vertical',half:'Meio a meio',sash:'Faixa diagonal',letter:'Letra na frente',star:'Estrela',ring:'Aro',chevron:'Chevron',check:'Xadrez'};
function fxIcon(g,i,S){g.fillStyle='#0d1238';g.beginPath();g.arc(S/2,S/2,S/2-2,0,7);g.fill();const C=[['#fff'],['#22d6ff','#ff2d87'],['#ff5a1f','#ffb020','#ffe066'],['#ffd84a','#fff']][i];
 for(let j=0;j<7;j++){const x=S*(.2+j*.09),y=S*(.75-j*.08);g.globalAlpha=.35+j*.09;g.fillStyle=C[j%C.length];if(i==3){g.font=(S*.12+j*S*.012)+'px sans-serif';g.textAlign='center';g.fillText('✦',x,y)}else{g.beginPath();g.arc(x,y,S*(.02+j*.011),0,7);g.fill()}}
 g.globalAlpha=1;g.fillStyle='#fff';g.beginPath();g.arc(S*.85,S*.2,S*.08,0,7);g.fill();g.strokeStyle='#0a0f2c';g.lineWidth=S*.02;g.stroke()}
function rInv(){const shop=inv.shop,t=inv.tab,list=t=='k'?SK.slice(0,KITS.length):FX,key=t=='k'?'k':'f',own=i=>save[key].includes(i),pr=i=>t=='k'?SK[i].pr:FX[i][1],nm=i=>t=='k'?SK[i].n:FX[i][0],cur=t=='k'?save.kit:save.fx;
 document.querySelectorAll('.coins').forEach(c=>c.textContent=save.coins+' moedas');
 $('#ih').textContent=shop?'Loja':'Inventário';$('#tk').classList.toggle('sel',t=='k');$('#tf').classList.toggle('sel',t=='f');$('#nv').textContent=save.num;
 const idx=list.map((_,i)=>i).filter(i=>!shop||!own(i)),gr=$('#gr'),pv=$('#pv').getContext('2d');gr.innerHTML='';pv.clearRect(0,0,220,220);
 if(!idx.length){gr.textContent='Você já tem tudo aqui!';$('#pn').textContent='';$('#pd').textContent='';$('#peq').disabled=true;$('#peq').textContent='—';return}
 if(!idx.includes(inv.i))inv.i=idx[0];const i=inv.i;
 idx.forEach(j=>{const b=document.createElement('button');b.className='cell'+(j==i?' sel':'');const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');t=='k'?drawSkin(g,32,32,29,SK[j]):fxIcon(g,j,64);b.append(c);
  if(own(j)&&cur==j){const e=document.createElement('span');e.className='eq';e.textContent='✓';b.append(e)}
  if(!own(j)){const l=document.createElement('span');l.className='lk';l.textContent=pr(j);b.append(l)}
  b.onclick=()=>{inv.i=j;rInv()};gr.append(b)});
 if(t=='k'){drawSkin(pv,110,110,100,SK[i]);pv.font='700 70px Bungee,Impact,sans-serif';pv.textAlign='center';pv.textBaseline='middle';pv.lineWidth=8;pv.strokeStyle='#0a0f2c';pv.strokeText(save.num,110,116);pv.fillStyle='#fff';pv.fillText(save.num,110,116)}else fxIcon(pv,i,220);
 const o=own(i),eq=o&&cur==i;$('#pn').textContent=nm(i);$('#pd').textContent=t=='k'?PL[SK[i].p]+(SK[i].l?' '+SK[i].l:''):'Efeito na bola';
 const b=$('#peq');b.disabled=eq;b.textContent=eq?'Equipado':o?'Equipar':'Comprar · '+pr(i);
 b.onclick=()=>{if(!o){if(save.coins<pr(i))return toast('Moedas insuficientes');save.coins-=pr(i);save[key].push(i);toast('Comprado!')}if(t=='k')save.kit=i;else save.fx=i;persist();rInv()}}
$('#tk').onclick=()=>{inv.tab='k';inv.i=inv.shop?-1:save.kit;rInv()};$('#tf').onclick=()=>{inv.tab='f';inv.i=inv.shop?-1:save.fx;rInv()};
$('#nm').onclick=()=>{save.num=save.num<=1?99:save.num-1;persist();rInv()};
$('#np').onclick=()=>{save.num=save.num>=99?1:save.num+1;persist();rInv()};

/* ---------- sala e controles ---------- */
const FSN=['Normal','Grande','Enorme'],FSS=[1,1.3,1.6],RT=[60,180,300,600],DF=['Fácil','Médio','Difícil'];
function rlog(t){rAdd('',t,0)}
function rRoom(){const c=save.room=Object.assign({n:2,time:300,gold:0,diff:1,fs:0,side:0,sk0:save.kit,sk1:-1},save.room);
 if(!RT.includes(c.time))c.time=300;if(c.sk1<0||c.sk1==c.sk0){const sv=save.kit;save.kit=c.sk0;c.sk1=pickOpp();save.kit=sv}
 const fm=FMT[c.n],el=(t,cl,h)=>{const d=document.createElement(t);if(cl)d.className=cl;if(h!=null)d.innerHTML=h;return d};
 $('#rname').textContent=AB(c.sk0)+' x '+AB(c.sk1);{const f=FSS[c.fs||0];$('#rsub').textContent=c.n+'v'+c.n+' · Campo '+FSN[c.fs||0]+' '+Math.round(fm[0]*f)+'×'+Math.round(fm[1]*f)+' · Gol '+Math.round(fm[2]*(1+(f-1)*.6))}
 const av=(k,r)=>{const cv2=document.createElement('canvas');cv2.width=cv2.height=64;drawSkin(cv2.getContext('2d'),32,32,29,SK[k]);return cv2};
 const chg=(t,d)=>{const o=c['sk'+(1-t)];let i=c['sk'+t];do{i=(i+d+KITS.length)%KITS.length}while(i==o);c['sk'+t]=i;persist();rRoom();rlog((t?'Visitante':'Mandante')+': '+SK[i].n)};
 [0,1].forEach(t=>{const pn=$(t?'#pB':'#pA'),k=c['sk'+t];pn.style.background='repeating-conic-gradient(rgba(255,255,255,.12) 0 25%,rgba(0,0,0,.1) 0 50%) 0 0/36px 36px,'+SK[k].c[0];pn.classList.toggle('me',c.side==t);pn.innerHTML='';
  pn.append(el('h3',0,(t?'Visitante':'Mandante')+' ('+c.n+')'));
  const cs=el('div','csel'),l=el('button','ar','‹'),r=el('button','ar','›');l.onclick=e=>{e.stopPropagation();chg(t,-1)};r.onclick=e=>{e.stopPropagation();chg(t,1)};cs.append(l,av(k),el('span',0,SK[k].n),r);pn.append(cs);
  for(let i=0;i<c.n;i++){const me=c.side==t&&i==0,row=el('div','slot2'+(me?' me':''));row.append(av(k),Object.assign(document.createElement('span'),{textContent:me?save.name+' · #'+save.num:'Bot '+(i+1)}));pn.append(row)}
  if(c.side==t){const vb=el('button','btn b4','🚪 Vestiário');vb.style.cssText='width:100%;font-size:14px;padding:10px;margin-top:6px';vb.onclick=e=>{e.stopPropagation();lockStart()};pn.append(vb)}
  pn.onclick=()=>{c.side=t;persist();rRoom();rlog('Você entrou no '+(t?'Visitante':'Mandante'))}});
 const ps=$('#pS');ps.innerHTML='';ps.classList.toggle('me',c.side==2);ps.append(el('h3',0,'Espectadores ('+(c.side==2?1:0)+')'));if(c.side==2){const row=el('div','slot2 me');row.append(av(save.kit),el('span',0,'Você'));ps.append(row)}
 ps.onclick=()=>{c.side=2;persist();rRoom();rlog('Você está assistindo')};
 const box=$('#ropts');box.innerHTML='';
 const opt=(ic,txt,fn)=>{const d=el('div','opt'),l=el('button','ar','‹'),r=el('button','ar','›');l.onclick=()=>fn(-1);r.onclick=()=>fn(1);d.append(l,el('div','ov','<i>'+ic+'</i><b>'+txt+'</b>'),r);box.append(d)};
 opt('🏟️',c.n+'v'+c.n,d=>{c.n=(c.n-1+d+4)%4+1;persist();rRoom();rlog('Formato '+c.n+'v'+c.n+' · gol de '+FMT[c.n][2])});
 opt('⏱️',c.time/60+' minuto'+(c.time>60?'s':''),d=>{c.time=RT[(RT.indexOf(c.time)+d+4)%4];persist();rRoom();rlog('Tempo: '+c.time/60+' min')});
 opt('🥇','Gol de ouro: '+(c.gold?'sim':'não'),()=>{c.gold=c.gold?0:1;persist();rRoom();rlog('Gol de ouro '+(c.gold?'ativado':'desativado'))});
 opt('🤖','Bots: '+DF[c.diff],d=>{c.diff=(c.diff+d+3)%3;persist();rRoom();rlog('Bots: '+DF[c.diff])});
 opt('📏','Campo: '+FSN[c.fs||0],d=>{c.fs=((c.fs||0)+d+3)%3;persist();rRoom();rlog('Campo '+FSN[c.fs])})}
$('#rgo').onclick=()=>{aud();start('bot',Object.assign({},save.room,{intro:1}))};
$('#rinv').onclick=()=>{try{navigator.clipboard.writeText(location.href)}catch(e){}toast('Link copiado. Sala offline por enquanto.')};
const CB={j:160,s:88,p:70};
function place(el,k){const c=save.ctl[k],b=CB[k]*c.s;Object.assign(el.style,{left:c.x*100+'%',top:c.y*100+'%',width:b+'px',height:b+'px',opacity:save.ctl.op,fontSize:Math.max(9,b*.14)+'px'})}
function applyCtl(){[['#ljoy','j'],['#joy','j'],['#bS','s'],['#bP','p'],['#ej','j'],['#es','s'],['#ep','p']].forEach(([q,k])=>place($(q),k))}
function rCtl(){$('#r0').value=save.ctl.j.s*100;$('#r1').value=save.ctl.s.s*100;$('#r2').value=save.ctl.p.s*100;$('#r3').value=save.ctl.op*100;applyCtl()}
[['#ej','j'],['#es','s'],['#ep','p']].forEach(([q,k])=>{const el=$(q);el.onpointerdown=e=>{el.setPointerCapture(e.pointerId);el._d=1};
 el.onpointermove=e=>{if(!el._d)return;const r=$('#ctl').getBoundingClientRect();save.ctl[k].x=clamp((e.clientX-r.left)/r.width,.06,.94);save.ctl[k].y=clamp((e.clientY-r.top)/r.height,.12,.94);applyCtl()};
 el.onpointerup=el.onpointercancel=()=>{el._d=0;persist()}});
[['r0','j'],['r1','s'],['r2','p']].forEach(([id,k])=>$('#'+id).oninput=e=>{save.ctl[k].s=e.target.value/100;applyCtl();persist()});
$('#r3').oninput=e=>{save.ctl.op=e.target.value/100;applyCtl();persist()};
$('#crst').onclick=()=>{save.ctl=JSON.parse(JSON.stringify(DEF));persist();rCtl()};
applyCtl();

/* ---------- áudio ---------- */
const crowd=new MaxballCrowd.Crowd();
let AC;function aud(){try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();AC.resume?.();crowd.start(AC)}catch(e){}}
function beep(f,d,t='square',v=.06,s=0){if(!AC)return;const o=AC.createOscillator(),g=AC.createGain();o.type=t;o.frequency.setValueAtTime(f,AC.currentTime);
 if(s)o.frequency.exponentialRampToValueAtTime(s,AC.currentTime+d);g.gain.setValueAtTime(v,AC.currentTime);g.gain.exponentialRampToValueAtTime(.001,AC.currentTime+d);o.connect(g).connect(AC.destination);o.start();o.stop(AC.currentTime+d)}

/* ---------- entrada ---------- */
addEventListener('contextmenu',e=>e.preventDefault());
const actionSeq={shoot:0,pass:0},keys={},tj={x:0,y:0},tb={s:0,p:0,r:0};
addEventListener('keydown',e=>{if(e.target.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))return;if(!e.repeat&&!keys[e.code]){if(['KeyF','Space'].includes(e.code))actionSeq.shoot++;if(['KeyG','KeyE'].includes(e.code))actionSeq.pass++;}keys[e.code]=1;if(G&&(G.phase=='intro'||G.phase=='count')&&/Enter|Space|KeyF|KeyG/.test(e.code))skipIntro();if(G&&/Arrow|Space/.test(e.code))e.preventDefault()});
addEventListener('keyup',e=>keys[e.code]=0);
const joy=$('#joy'),knob=$('#knob');
let jid=null;
const joystickBinding=MaxballPointers.bindJoystick(joy,knob,tj);
const jend=()=>joystickBinding.reset();
const actionBindings=[['#bS','s','shoot'],['#bP','p','pass']].map(([selector,key,action])=>MaxballPointers.bindAction($(selector),value=>tb[key]=+value,()=>{actionSeq[action]++;aud();}));
/* ---------- vestiário ---------- */
const LW=960,LH2=540,LR=18,LNU=[[7,8,5,4],[9,11,6,3]],lx=$('#lcv').getContext('2d'),lcv=$('#lcv');
const LRECTS=[{x:0,y:0,w:960,h:140},{x:190,y:330,w:230,h:34},{x:540,y:330,w:230,h:34},{x:700,y:170,w:150,h:70},{x:395,y:190,w:170,h:38}];
let LK=null,LKRUN=0,LKT=0;
function lockStart(){const c=save.room;if(c.side==2)return toast('Entre em um time primeiro');const t=c.side,k=c['sk'+t];
 LK={t,k,ball:{x:480,y:300,vx:0,vy:0},touch:0,tun:0,go:0,me:{x:480,y:440,vx:0,vy:0,num:save.num,tgt:null,tm:0},bots:[]};
 for(let i=1;i<c.n;i++)LK.bots.push({x:200+i*150,y:400+(i%2)*50,vx:0,vy:0,num:LNU[t][i],name:'Bot '+i,wt:rnd(0,2),tgt:null,tm:0});
 $('#lname').textContent='Vestiário · '+SK[k].n;$('#lsub').textContent='Seu time · '+c.n+'v'+c.n;$('#llog').innerHTML='';show('lock')}
function lkBegin(){if(LKRUN)return;LKRUN=1;LKT=0;requestAnimationFrame(lkLoop)}
function lkLoop(t){if(!$('#lock').classList.contains('on')||!LK){LKRUN=0;return}requestAnimationFrame(lkLoop);const dt=Math.min(.033,(t-LKT)/1000||0);LKT=t;lkStep(dt);lkDraw()}
function pushOut(o,r,R){const a=clamp(o.x,r.x,r.x+r.w),b=clamp(o.y,r.y,r.y+r.h),dx=o.x-a,dy=o.y-b,d=Math.hypot(dx,dy);if(d<R){if(d>.001){o.x=a+dx/d*R;o.y=b+dy/d*R}else o.y=r.y-R}}
function lkStep(dt){const m=LK.me,k=1-Math.exp(-12*dt);let ix=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0)+ljs.x,iy=(keys.KeyS||keys.ArrowDown?1:0)-(keys.KeyW||keys.ArrowUp?1:0)+ljs.y;
 if(ix||iy){m.tgt=null;const l=Math.hypot(ix,iy);if(l>1){ix/=l;iy/=l}}
 else if(m.tgt){m.tm-=dt;const dx=m.tgt.x-m.x,dy=m.tgt.y-m.y,d=Math.hypot(dx,dy);if(d>8&&m.tm>0){ix=dx/d;iy=dy/d}else m.tgt=null}
 m.vx+=(ix*150-m.vx)*k;m.vy+=(iy*150-m.vy)*k;m.x+=m.vx*dt;m.y+=m.vy*dt;
 LK.bots.forEach(b=>{if(b.tgt){b.tm-=dt;const dx=b.tgt.x-b.x,dy=b.tgt.y-b.y,d=Math.hypot(dx,dy);if(d>8&&b.tm>0){b.vx+=(dx/d*55-b.vx)*k;b.vy+=(dy/d*55-b.vy)*k}else{b.tgt=null;b.wt=rnd(1,3.5)}}
  else{b.vx*=.85;b.vy*=.85;b.wt-=dt;if(b.wt<=0){b.tgt={x:rnd(60,900),y:rnd(175,495)};b.tm=6}}b.x+=b.vx*dt;b.y+=b.vy*dt});
 const all=[m,...LK.bots];for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++){const a=all[i],b=all[j],d=dist(a,b);if(d<LR*2&&d>0){const o=(LR*2-d)/2,nx=(b.x-a.x)/d,ny=(b.y-a.y)/d;a.x-=nx*o;a.y-=ny*o;b.x+=nx*o;b.y+=ny*o}}
 all.forEach(o=>{o.sayT-=dt;LRECTS.forEach(r=>pushOut(o,r,LR));o.x=clamp(o.x,-LOX+20+LR,LXW-LOX-20-LR);o.y=clamp(o.y,140+LR,500)});lkBall(dt,all)}
let LSC=1,LOX=0,LXW=960;
function lkBall(dt,all){const b=LK.ball,m=LK.me;b.x+=b.vx*dt;b.y+=b.vy*dt;const f=Math.pow(.3,dt);b.vx*=f;b.vy*=f;
 all.forEach(o=>{const dx=b.x-o.x,dy=b.y-o.y,d=Math.hypot(dx,dy),mm=LR+9;if(d<mm){const nx=d>.01?dx/d:1,ny=d>.01?dy/d:0,sp=Math.max(240,Math.hypot(o.vx,o.vy)*2.4);b.x=o.x+nx*mm;b.y=o.y+ny*mm;b.vx=nx*sp;b.vy=ny*sp;if(o===m){LK.touch++;$('#lsub').textContent='Toques na bola: '+LK.touch}}});
 LRECTS.forEach(r=>pushOut(b,r,9));const x0=-LOX+29,x1=LXW-LOX-29;
 if(b.x<x0){b.x=x0;b.vx=Math.abs(b.vx)*.8}if(b.x>x1){b.x=x1;b.vx=-Math.abs(b.vx)*.8}if(b.y<149){b.y=149;b.vy=Math.abs(b.vy)*.8}if(b.y>505){b.y=505;b.vy=-Math.abs(b.vy)*.8}
 if(m.x>430&&m.x<530&&m.y>=496){LK.tun+=dt;if(LK.tun>.6&&!LK.go){LK.go=1;aud();start('bot',Object.assign({},save.room,{intro:1}))}}else LK.tun=0}
function drawLB(g){const b=LK.ball;g.textAlign='center';g.textBaseline='middle';g.fillStyle='#b9c4ff';g.font='700 10px Rubik';g.fillText('toque: trocar nº',474,150);
 g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(b.x,b.y+7,9,4.5,0,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(b.x,b.y,9,0,7);g.fill();g.strokeStyle='#0a0f2c';g.lineWidth=2;g.stroke();g.fillStyle='#0a0f2c';g.beginPath();g.arc(b.x,b.y,3.5,0,7);g.fill()}
function lkDraw(){const cw=lcv.clientWidth,chh=lcv.clientHeight,dp=Math.min(2,devicePixelRatio||1);if(lcv.width!=Math.round(cw*dp)||lcv.height!=Math.round(chh*dp)){lcv.width=Math.round(cw*dp);lcv.height=Math.round(chh*dp)}
 LSC=Math.min(lcv.height/540,lcv.width/960);LXW=lcv.width/LSC;LOX=(LXW-960)/2;const g=lx;g.setTransform(1,0,0,1,0,0);g.fillStyle='#1b2358';g.fillRect(0,0,lcv.width,lcv.height);g.fillStyle='#0f1640';g.fillRect(0,0,lcv.width,140*LSC);g.fillStyle='#0b1233';g.fillRect(0,0,lcv.width,40*LSC);g.setTransform(LSC,0,0,LSC,LOX*LSC,0);
 const k=LK.k,sk=SK[k],pc=sk.c[0],sc=sk.c[1]||'#0a0f2c';
 g.fillStyle='#1b2358';g.fillRect(0,0,LW,LH2);g.strokeStyle='rgba(255,255,255,.05)';g.lineWidth=2;
 for(let x=0;x<LW;x+=60){g.beginPath();g.moveTo(x,140);g.lineTo(x,LH2);g.stroke()}for(let y=140;y<LH2;y+=60){g.beginPath();g.moveTo(0,y);g.lineTo(LW,y);g.stroke()}
 g.globalAlpha=.1;g.fillStyle=pc;g.fillRect(0,140,LW,LH2-140);g.globalAlpha=1;
 g.fillStyle='#0f1640';g.fillRect(0,0,LW,140);g.fillStyle='#0b1233';g.fillRect(0,0,LW,40);
 g.fillStyle='#fff';g.font='22px Bungee,Impact';g.textAlign='center';g.textBaseline='middle';g.fillText('VESTIÁRIO · '+sk.n.toUpperCase(),LW/2,21);drawSkin(g,40,21,14,sk);drawSkin(g,LW-40,21,14,sk);
 const nums=Array.from({length:9},(_,i)=>20+i);nums[4]=LK.me.num;[3,5,2].forEach((p,i)=>{if(LK.bots[i])nums[p]=LK.bots[i].num});
 for(let i=0;i<9;i++){const x=30+i*100,y=50;g.fillStyle='rgba(0,0,0,.35)';g.fillRect(x+4,y+6,88,90);g.fillStyle=pc;g.fillRect(x,y,88,90);g.fillStyle='rgba(0,0,0,.18)';g.fillRect(x+44,y,44,90);
  g.strokeStyle=i==4?'#c8ff2e':'#0a0f2c';g.lineWidth=i==4?4:3;g.strokeRect(x,y,88,90);g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=2;for(let q=0;q<3;q++){g.beginPath();g.moveTo(x+12,y+56+q*8);g.lineTo(x+76,y+56+q*8);g.stroke()}
  g.fillStyle='#0b1233';g.fillRect(x+28,y+8,32,18);g.fillStyle='#fff';g.font='700 13px Rubik';g.fillText(nums[i],x+44,y+18);g.fillStyle=sc;g.fillRect(x+70,y+36,6,14)}
 g.save();g.globalAlpha=.4;g.fillStyle=pc;g.beginPath();g.ellipse(480,440,230,80,0,0,7);g.fill();g.globalAlpha=.55;drawSkin(g,480,440,50,sk);g.restore();
 [[190,330],[540,330]].forEach(([x,y])=>{g.fillStyle='rgba(0,0,0,.3)';g.fillRect(x+4,y+30,230,12);g.fillStyle='#7a4a22';g.fillRect(x,y,230,34);g.fillStyle=pc;g.fillRect(x+6,y+4,218,14);g.fillStyle='rgba(0,0,0,.25)';g.fillRect(x,y+24,230,10)});
 g.fillStyle='#cfd6f5';g.fillRect(395,190,170,38);g.fillStyle='rgba(0,0,0,.25)';g.fillRect(395,218,170,10);['#22d6ff','#ffc400','#22d6ff','#ff2d87','#c8ff2e'].forEach((c,i)=>{g.fillStyle=c;g.fillRect(412+i*30,196,12,22)});
 g.fillStyle='#0b1233';g.fillRect(700,170,150,70);g.fillStyle='#2b7a48';g.fillRect(706,176,138,58);g.strokeStyle='#fff';g.lineWidth=2;g.beginPath();g.moveTo(775,176);g.lineTo(775,234);g.stroke();g.beginPath();g.arc(775,205,12,0,7);g.stroke();
 [[730,195],[735,220],[815,195],[810,220]].forEach(([a,b],i)=>{g.beginPath();if(i<2){g.moveTo(a-5,b-5);g.lineTo(a+5,b+5);g.moveTo(a+5,b-5);g.lineTo(a-5,b+5)}else g.arc(a,b,5,0,7);g.stroke()});
 g.beginPath();g.moveTo(735,200);g.lineTo(765,207);g.setLineDash([4,3]);g.stroke();g.setLineDash([]);
 g.fillStyle='#02030c';g.fillRect(430,505,100,35);g.strokeStyle='#c8ff2e';g.lineWidth=4;g.strokeRect(430,505,100,35);g.fillStyle='#b9c4ff';g.font='700 11px Rubik';g.fillText('TÚNEL → CAMPO',480,523);
 drawLB(g);const m=LK.me;if(m.tgt){g.strokeStyle='rgba(200,255,46,.7)';g.lineWidth=3;g.beginPath();g.arc(m.tgt.x,m.tgt.y,9,0,7);g.stroke()}
 [{o:m,me:1},...LK.bots.map(o=>({o}))].sort((a,b)=>a.o.y-b.o.y).forEach(({o,me})=>{g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(o.x,o.y+14,18,9,0,0,7);g.fill();g.drawImage(pSpr(k),o.x-21,o.y-21,42,42);
  g.font='700 14px Rubik';g.lineWidth=3;g.strokeStyle='#0a0f2c';g.strokeText(o.num,o.x,o.y+1);g.fillStyle='#fff';g.fillText(o.num,o.x,o.y+1);
  const lb=me?save.name:o.name;g.font='700 11px Rubik';const w=g.measureText(lb).width+12;g.fillStyle='rgba(10,15,44,.8)';g.fillRect(o.x-w/2,o.y-42,w,16);g.fillStyle=me?'#c8ff2e':'#fff';g.fillText(lb,o.x,o.y-34);if(o.say&&o.sayT>0){g.font=o.say.length<=2?'20px Rubik':'700 13px Rubik';const w2=g.measureText(o.say).width+16;g.fillStyle='#fff';g.fillRect(o.x-w2/2,o.y-66,w2,20);g.fillStyle='#0a0f2c';g.fillText(o.say,o.x,o.y-56)}})}
const lp=e=>{const r=lcv.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*LXW-LOX,y:clamp((e.clientY-r.top)/r.height*lcv.height/LSC,140+LR,500)}};
const lpr=e=>{const r=lcv.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*LXW-LOX,y:(e.clientY-r.top)/r.height*lcv.height/LSC}};lcv.onpointerdown=e=>{lcv.setPointerCapture(e.pointerId);if(LK){const q=lpr(e);if(q.x>430&&q.x<518&&q.y>50&&q.y<145){$('#lnv').textContent=save.num;$('#lnum').classList.add('on');return}LK.me.tgt=lp(e);LK.me.tm=5}};
lcv.onpointermove=e=>{if(LK&&lcv.hasPointerCapture(e.pointerId)){LK.me.tgt=lp(e);LK.me.tm=5}};
$('#lgo').onclick=()=>{aud();start('bot',Object.assign({},save.room,{intro:1}))};

/* ---------- jogo ---------- */
let G=null,P=[],ball,PA=[],c0,c1='#ff2d87',cam={x:W/2,y:H/2},Z=1.5,VH=427;
const simulationState=()=>({G,P,ball,W,H,GY0,GY1,BR});
const physics=MaxballPhysics.createPhysics({state:simulationState,input:inputOf,effects:{burst,beep,particle:p=>PA.push(p)}});
const events=MaxballCore.createEvents(),matchTimers=MaxballCore.createTimers();
const remoteFrames=new MaxballSnapshots.SnapshotBuffer();let remoteUser=null,remoteMatch=null,remoteScore=[0,0];
const fixedClock=MaxballCore.createClock(dt=>update(dt));
const mk=(team,num,ctrl)=>({id:'local-'+team+'-'+num,displayName:ctrl==='p1'?save.name:ctrl==='p2'?'Jogador 2':['Caio','Breno','Davi','Rui','Leo','Nico','Vini','João'][P.length%8],team,num,ctrl,x:0,y:0,vx:0,vy:0,fx:team?-1:1,fy:0,st:1,cd:0,hop:0});
function start(mode,cfg){actionSeq.shoot=actionSeq.pass=0;$('#versus').hidden=true;$('#penalty-hud').hidden=true;$('#match-notice').textContent='';aud();$('#career-commands').hidden=true;remoteMatch=null;remoteFrames.clear();matchTimers.clear();fixedClock.reset();NET.forEach(n=>n.reset());cfg=Object.assign({n:2,time:300,gold:0,diff:1,ball:1,fs:0,side:0,sk0:save.kit,sk1:-1},cfg||{});
 if(cfg.teams){for(let i=0;i<2;i++){SK[22+i]=MaxballTeams.skin(cfg.teams[i]);delete SPR[22+i];delete PSPR[22+i];}cfg.sk0=22;cfg.sk1=23;}
 if(mode=='train'){cfg.n=1;cfg.side=0}if(cfg.sk1<0||cfg.sk1==cfg.sk0){const sv=save.kit;save.kit=cfg.sk0;cfg.sk1=pickOpp();save.kit=sv}
 HT=cfg.side==1?1:0;const sk=[cfg.sk0,cfg.sk1];c0=SK[sk[0]].c[0];c1=SK[sk[1]].c[0];oppI=sk[1-HT];
 const fm=FMT[mode=='train'?2:cfg.n],fs=FSS[cfg.fs||0],gs=1+(fs-1)*.6;VH=640/[1.5,1.3,1.15][cfg.fs||0];rsz();W=Math.round(fm[0]*fs);H=Math.round(fm[1]*fs);GY0=H/2-fm[2]*gs/2;GY1=H/2+fm[2]*gs/2;POSTS=[[0,GY0],[0,GY1],[W,GY0],[W,GY1]];GG=G3();STAD=null;
 BR=[9,11,14][cfg.ball];G={mode,cfg,sk,score:[0,0],time:mode=='train'?0:cfg.time,phase:'play',pt:0,shake:0,flash:0,earn:0,fw:0};PA=[];
 P=[];const N=cfg.n,nu=[[7,8,5,4],[9,11,6,3]];
 for(let t=0;t<2;t++)for(let k=0;k<N;k++){if(mode=='train'&&t==1)break;const me=k==0&&t==HT&&cfg.side!=2;P.push(mk(t,me?save.num:nu[t][k],me?'p1':(k==0&&mode=='local'&&t!=HT?'p2':'ai')))}
 const L=mode=='local',T=mode=='train',tab=k=>{const c=SK[k].c;return 'linear-gradient(to bottom,'+c[0]+' 50%,'+(c[1]||c[0])+' 50%)'};
 $('#abA').textContent=AB(sk[0]);$('#abB').textContent=AB(sk[1]);$('#tabA').style.background=tab(sk[0]);$('#tabB').style.background=tab(sk[1]);
 ['#abB','#tabB','#s1'].forEach(q=>$(q).style.display=T?'none':'');$('#gbar').classList.remove('on');lastSc=[0,0];
 $('#keys').textContent=mode=='local'?'J1: WASD · F chute · G passe   |   J2: setas · Enter chute · / passe':'Mover: WASD/setas · Chute: F/Espaço · Passe: G';
 $('#res').classList.remove('on');$('#gpan').classList.remove('on');show('game');kickoff();const h0=P.find(q=>q.ctrl=='p1')||P[0];cam.x=h0.x;cam.y=h0.y;if(cfg.intro)intro0()}
function kickoff(){ball=MaxballKickoff.kickoff(simulationState());if(G.mode==='train'){G.restarting=false;P[0].x=W*.3;}}
function intro0(){G.phase='intro';G.it=0;G.ct=0;G.cn=-1;P.forEach((q,i)=>{q.tx=q.x;q.ty=q.y;q.t0=i*.55;q.st2=0;q.x=W/2;q.y=H+90;q.hid=true;q.vx=q.vy=0;q.fx=0;q.fy=-1});cam.x=W/2;cam.y=H-60;toast('Toque para pular a entrada')}
function introStep(dt){G.it+=dt;let done=true;const A={x:W/2,y:H-60};
 P.forEach(q=>{if(G.it<q.t0){done=false;return}q.hid=false;
  if(q.st2<2){done=false;const T=q.st2?{x:q.tx,y:q.ty}:A,dx=T.x-q.x,dy=T.y-q.y,d=Math.hypot(dx,dy),sp=170*dt;
   if(d<=sp){q.x=T.x;q.y=T.y;q.st2++}else{q.x+=dx/d*sp;q.y+=dy/d*sp;q.fx=dx/d;q.fy=dy/d}}
  else{q.fx=q.team?-1:1;q.fy=0}});
 if(done){G.phase='count';G.ct=0;G.cn=-1}}
function countStep(dt){G.ct+=dt;const i=Math.floor(G.ct/.8);if(i!=G.cn){G.cn=i;if(i<3)beep(520,.12,'square',.07);else{beep(880,.3,'square',.08);burst(W/2,H/2,30,[c0,c1,'#fff','#c8ff2e'],300,.8,'c',0)}}if(G.ct>=3.2)G.phase='play'}
function skipIntro(){if(!G||(G.phase!='intro'&&G.phase!='count'))return;P.forEach(q=>{q.x=q.tx;q.y=q.ty;q.hid=false;q.fx=q.team?-1:1;q.fy=0});G.phase='play'}
cv.addEventListener('pointerdown',skipIntro);
function inputOf(p){if(p.ctrl=='ai')return ai(p);const k=keys,L=G.mode=='local';let i;
 if(p.ctrl=='p1'){i={x:(k.KeyD||!L&&k.ArrowRight?1:0)-(k.KeyA||!L&&k.ArrowLeft?1:0)+tj.x,y:(k.KeyS||!L&&k.ArrowDown?1:0)-(k.KeyW||!L&&k.ArrowUp?1:0)+tj.y,
  shootSeq:actionSeq.shoot,passSeq:actionSeq.pass,shoot:k.KeyF||!L&&k.Space||tb.s,requestPass:k.KeyQ||careerButtons.pass,requestShot:k.KeyR||careerButtons.shot,pass:k.KeyG||!L&&k.KeyE||tb.p,press:k.KeyQ||!L&&k.ShiftLeft||tb.r}}
 else i={x:(k.ArrowRight?1:0)-(k.ArrowLeft?1:0),y:(k.ArrowDown?1:0)-(k.ArrowUp?1:0),shoot:k.Enter,pass:k.Slash,press:k.Period};return i}
function ai(p){return physics.ai(p)}
/* Chute: a bola sai na direção jogador → bola (como no MamoBall), não para onde o analógico aponta.
   Bots ainda usam 'aim' (mira deles). No passe, se houver companheiro perto dessa linha, a bola é guiada até ele. */
function kick(...args){return physics.kick(...args)}
function burst(x,y,n,cols,sp,life,type,g){for(let i=0;i<n;i++){const a=Math.random()*6.283,s=rnd(.3,1)*sp;
 PA.push({t:type||'c',x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,l:life*rnd(.6,1.2),m:life,c:cols[i%cols.length],s:rnd(2,5),r:rnd(0,6),g:g||0})}}
function trail(){const sp=Math.hypot(ball.vx,ball.vy);if(sp<320)return;const f=ball.last==HT?save.fx:1,o={x:ball.x,y:ball.y,vx:rnd(-20,20),vy:rnd(-20,20),g:0,s:rnd(3,6),r:0};
 if(f==0)PA.push({...o,t:'c',c:'#fff',l:.2,m:.2,s:3});
 else if(f==1)PA.push({...o,t:'c',c:Math.random()<.5?'#22d6ff':'#ff2d87',l:.4,m:.4});
 else if(f==2)PA.push({...o,t:'c',c:['#ff5a1f','#ffb020','#ffe066'][Math.random()*3|0],l:.5,m:.5,vy:-50,s:rnd(4,8)});
 else PA.push({...o,t:'s',c:Math.random()<.6?'#ffd84a':'#fff',l:.6,m:.6,s:rnd(10,18)})}
function step(dt){physics.step(dt)}
function updHUD(){const T=G.mode=='train';$('#s0').textContent=G.score[0];$('#s1').textContent=G.score[1];
 [0,1].forEach(k=>{if(G.score[k]!=lastSc[k]){const e=$('#s'+k);e.classList.remove('pop');void e.offsetWidth;e.classList.add('pop');lastSc[k]=G.score[k]}});
 const gs=Math.floor(T?(G.el||0):G.cfg.time-G.time+(G.otT||0));$('#clk').classList.toggle('ot',!!G.ot);$('#tm').textContent=String(Math.floor(gs/60)).padStart(2,'0')+':'+String(gs%60).padStart(2,'0')}
const ABR={'Limão':'LIM','Ciano':'CIA','Flamengo':'FLA','Palmeiras':'PAL','São Paulo':'SAO','Corinthians':'COR','Santos':'SAN','Fluminense':'FLU','Vasco':'VAS','Botafogo':'BOT','Cruzeiro':'CRU','Atlético-MG':'CAM','Grêmio':'GRE','Internacional':'INT','Bahia':'BAH','Vitória':'VIT','Bragantino':'RBB','Mirassol':'MIR','Coritiba':'CFC','Athletico-PR':'CAP','Chapecoense':'CHA','Remo':'REM'};
const AB=k=>ABR[SK[k].n]||SK[k].n.slice(0,3).toUpperCase();
function showGoal(t){const k=G.sk[t],sk=SK[k],c=sk.c,x=c[1]||c[0],z=c[2]||c[0],p=sk.p;$('#ga').textContent=AB(k);
 const g=$('#gsk').getContext('2d');g.clearRect(0,0,64,64);drawSkin(g,32,32,29,sk);let bg=c[0];
 if(p=='hoops')bg='repeating-linear-gradient(0deg,'+c[0]+' 0 6px,'+x+' 6px 12px)';else if(p=='vstripe')bg='repeating-linear-gradient(90deg,'+c[0]+' 0 14px,'+x+' 14px 28px)';
 else if(p=='sash')bg='linear-gradient(115deg,'+c[0]+' 55%,'+x+' 55% 75%,'+c[0]+' 75%)';else if(p=='vthird')bg='linear-gradient(90deg,'+c[0]+' 33%,'+x+' 33% 66%,'+z+' 66%)';
 else if(p=='bands3')bg='linear-gradient('+c[0]+' 33%,'+x+' 33% 66%,'+z+' 66%)';else if(p=='half')bg='linear-gradient(90deg,'+c[0]+' 50%,'+x+' 50%)';
 else if(p=='check')bg='repeating-conic-gradient('+c[0]+' 0 25%,'+x+' 0 50%) 0 0/24px 24px';
 const gt=$('#gtx');gt.style.background=bg;gt.style.color=lum(c[0])>170?'#0a0f2c':'#fff';const b=$('#gbar');b.classList.add('on');clearTimeout(showGoal.h);showGoal.h=matchTimers.after(()=>b.classList.remove('on'),2600)}
function wh(v){if(Math.abs(v)>240){burst(ball.x,ball.y,5,['#fff','#c8ff2e'],150,.25);beep(160,.05,'triangle',.05)}}
function moveBall(dt){MaxballBall.moveBall(simulationState(),dt,goal,wh)}
function goal(t){if(!G||G.phase!=='play')return;events.emit('GOAL_SCORED',{team:t});crowd.goal();showGoal(t);G.ko=1-t;G.phase='goal';G.pt=0;G.sc=t;G.score[t]++;G.flash=1;G.shake=18;G.fw=0;
 const gx=t?0:W;burst(gx,ball.y,60,[c0,c1,'#fff','#c8ff2e'],420,1,'c',300);
 if(t==HT&&G.cfg.side!=2&&G.mode!='local'){const e=G.mode=='train'?3:10;save.coins+=e;G.earn+=e;save.st.g++;persist()}
 beep(523,.15,'square',.07);matchTimers.after(()=>beep(659,.15,'square',.07),130);matchTimers.after(()=>beep(784,.35,'square',.07),260)}
function endMatch(){if(!G||G.phase==='end')return;G.phase='end';events.emit('MATCH_ENDED',{score:G.score.slice()});const a=G.score[0],b=G.score[1],L=G.mode=='local',sp=G.cfg.side==2,me=HT?b:a,ot=HT?a:b;
 const t=a==b?'EMPATE':L?(a>b?'J1 VENCEU':'J2 VENCEU'):sp?(a>b?'MANDANTE VENCEU':'VISITANTE VENCEU'):me>ot?'VITÓRIA':'DERROTA';let bonus=0;if(!L&&!sp){save.st.p++;if(me>ot)save.st.w++;persist()}
 if(!L&&!sp&&me>ot){bonus=20;save.coins+=20;persist()}
 $('#rt').textContent=t;$('#rs').textContent=a+' x '+b+(L||sp?'':' · +'+(G.earn+bonus)+' moedas');matchTimers.after(()=>$('#res').classList.add('on'),700)}
$('#again').onclick=()=>{if(G.remote){leaveRemote();return}start(G.mode,G.cfg)};$('#menu').onclick=()=>{if(G?.remote){leaveRemote();return}matchTimers.clear();G=null;show('home')};
$('#exit').onclick=()=>{if(G?.remote){leaveRemote();return}matchTimers.clear();G=null;show('home')};

function update(dt){G.pt+=dt;G.shake*=Math.pow(.02,dt);G.flash=Math.max(0,G.flash-dt*2.2);let s=1;
 if(G.phase=='goal'&&G.pt<1.2)s=.4;const d=dt*s;
 if(G.phase=='play'){step(d);G.el=(G.el||0)+dt;
if(G.mode!='train'){if(!G.ot){G.time-=dt;if(G.time<=0){G.time=0;if(G.cfg.gold&&G.score[0]==G.score[1]){G.ot=true;G.otT=0;burst(ball.x,ball.y,20,['#d8e52a','#fff'],260,.6)}else endMatch()}}else G.otT+=dt}}
 else if(G.phase=='intro')introStep(dt);else if(G.phase=='count')countStep(dt);else if(G.phase=='goal'){P.forEach(p=>{p.vx*=.9;p.vy*=.9;p.hop=p.team==G.sc?Math.abs(Math.sin(G.pt*9+p.num))*18:0});
  G.fw-=dt;if(G.fw<=0){G.fw=.3;burst(rnd(W*.2,W*.8),rnd(H*.15,H*.6),36,[['#c8ff2e','#fff'],['#ff2d87','#ffc400'],['#22d6ff','#fff']][Math.random()*3|0],220,.9,'c',120)}
  for(let i=0;i<2;i++)PA.push({t:'k',x:rnd(0,W),y:-10,vx:rnd(-30,30),vy:rnd(60,140),g:60,l:3,m:3,c:[c0,c1,'#fff','#ffc400'][Math.random()*4|0],s:rnd(5,9),r:rnd(0,6)});
  if(G.pt>2.6){const dn=G.mode!='train'&&(G.ot||G.time<=0&&!(G.cfg.gold&&G.score[0]==G.score[1]));if(dn)endMatch();else{if(G.mode!='train'&&G.time<=0&&!G.ot){G.ot=true;G.otT=0}G.phase='play';kickoff()}}}
 moveBall(d);trail();netUpd(dt);camUpdate(dt);
 for(let i=PA.length-1;i>=0;i--){const q=PA[i];q.l-=dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=q.g*dt;q.r+=dt*8;if(q.t=='r')q.s+=dt*260;if(q.l<=0)PA.splice(i,1)}
 updHUD()}

/* ---------- desenho ---------- */
function pent(x,y,r,a){cx.beginPath();for(let i=0;i<5;i++){const q=a+i*1.2566;i?cx.lineTo(x+Math.cos(q)*r,y+Math.sin(q)*r):cx.moveTo(x+Math.cos(q)*r,y+Math.sin(q)*r)}cx.closePath();cx.fill()}
function drawBall(){const R=BR,sp=Math.hypot(ball.vx,ball.vy),a=ball.rot;
 cx.fillStyle='rgba(0,0,0,.3)';cx.beginPath();cx.ellipse(ball.x,ball.y+R*.7,R,R*.5,0,0,7);cx.fill();
 cx.save();cx.translate(ball.x,ball.y);
 if(sp>380){cx.fillStyle='rgba(255,255,255,.22)';cx.beginPath();cx.arc(0,0,R+7,0,7);cx.fill();cx.fillStyle='rgba(200,255,46,.25)';cx.beginPath();cx.arc(0,0,R+3.5,0,7);cx.fill()}
 cx.save();cx.beginPath();cx.arc(0,0,R,0,7);cx.clip();
 const g=cx.createRadialGradient(-R*.35,-R*.4,R*.1,0,0,R);g.addColorStop(0,'#fff');g.addColorStop(.65,'#e6eaff');g.addColorStop(1,'#9ea8de');cx.fillStyle=g;cx.fillRect(-R,-R,2*R,2*R);
 cx.strokeStyle='rgba(10,15,44,.55)';cx.lineWidth=1.1;for(let i=0;i<5;i++){const q=a+i*1.2566;cx.beginPath();cx.moveTo(Math.cos(q)*R*.42,Math.sin(q)*R*.42);cx.lineTo(Math.cos(q)*R*.85,Math.sin(q)*R*.85);cx.stroke()}
 cx.fillStyle='#0a0f2c';pent(0,0,R*.45,a);for(let i=0;i<5;i++){const q=a+i*1.2566+.628;pent(Math.cos(q)*R*1.02,Math.sin(q)*R*1.02,R*.42,q+3.14)}
 const sh=cx.createRadialGradient(-R*.3,-R*.35,R*.2,0,0,R*1.05);sh.addColorStop(0,'rgba(255,255,255,0)');sh.addColorStop(1,'rgba(0,0,30,.32)');cx.fillStyle=sh;cx.fillRect(-R,-R,2*R,2*R);cx.restore();
 cx.strokeStyle='#0a0f2c';cx.lineWidth=2.2;cx.beginPath();cx.arc(0,0,R,0,7);cx.stroke();
 cx.fillStyle='rgba(255,255,255,.75)';cx.beginPath();cx.ellipse(-R*.36,-R*.42,R*.22,R*.12,-.7,0,7);cx.fill();cx.restore()}
function draw(){cx.setTransform(1,0,0,1,0,0);cx.fillStyle='#0a0f2c';cx.fillRect(0,0,cv.width,cv.height);
 const sh=RM||save.ns?0:G.shake;cx.translate(cv.width/2+rnd(-sh,sh),cv.height/2+rnd(-sh,sh));cx.scale(Z,Z);cx.translate(-cam.x,-cam.y);
 if(!STAD)STAD=buildStadium();cx.drawImage(STAD,-E,-E);crowd.draw(cx,simulationState(),RM);netBack(0);netBack(1);
 PA.filter(q=>q.t!='k').forEach(dq);
 P.forEach(p=>{if(p.hid||p.inactive)return;cx.fillStyle='rgba(0,0,0,.3)';cx.beginPath();cx.ellipse(p.x,p.y+PR*.75,PR,PR*.5,0,0,7);cx.fill()});
 P.forEach((p,i)=>{if(p.hid||p.inactive)return;const y=p.y-p.hop,col=p.team?c1:c0;
  if(p.hop>2){cx.strokeStyle=col;cx.lineWidth=3;cx.globalAlpha=.6;cx.beginPath();cx.arc(p.x,p.y,PR+8+p.hop,0,7);cx.stroke();cx.globalAlpha=1}
  if(p.ctrl=='p1'||p.ctrl=='p2'){const rg=dist(p,ball)<PR+BR+12;cx.strokeStyle=rg?'rgba(255,255,255,.95)':'rgba(255,255,255,.2)';cx.lineWidth=rg?3:1.5;cx.beginPath();cx.arc(p.x,y,PR+5,0,7);cx.stroke()}
  cx.drawImage(pSpr(G.sk[p.team]),p.x-PR-3,y-PR-3,PR*2+6,PR*2+6);
  cx.font='700 14px Rubik';cx.textAlign='center';cx.textBaseline='middle';cx.lineWidth=3;cx.strokeStyle='#0a0f2c';cx.strokeText(p.num,p.x,y+1);cx.fillStyle='#fff';cx.fillText(p.num,p.x,y+1);cx.font='700 11px Rubik';const label=p.displayName||p.name||'Bot';cx.strokeText(label,p.x,p.y+34);cx.fillText(label,p.x,p.y+34);
  if(p.ctrl=='p1'||p.ctrl=='p2'){cx.fillStyle='#fff';cx.beginPath();cx.moveTo(p.x-7,y-PR-16);cx.lineTo(p.x+7,y-PR-16);cx.lineTo(p.x,y-PR-6);cx.fill();
   }});
 drawBall();
 netFront(0);netFront(1);PA.filter(q=>q.t=='k').forEach(dq);
 if(G.phase=='goal'){cx.fillStyle='#fff';for(let q=0;q<40;q++){const fx=rnd(-E+10,W+E-10),fy=rnd(-E+10,H+E-10);if(fx>-MG-16&&fx<W+MG+16&&fy>-MG-16&&fy<H+MG+16)continue;cx.globalAlpha=Math.random();cx.fillRect(fx,fy,4,4)}cx.globalAlpha=1}
 if(G.phase=='goal'){const k=Math.min(1,G.pt/.35),sc=k<1?.3+.9*k:1.2-.2*Math.min(1,(G.pt-.35)*3);
  cx.save();cx.translate(cam.x,cam.y-30);cx.rotate(-.07);cx.scale(sc*.8,sc*.8);cx.font='110px Bungee,Impact';cx.textAlign='center';cx.lineWidth=12;cx.strokeStyle='#0a0f2c';cx.strokeText('GOOOL!',0,0);
  const g=cx.createLinearGradient(0,-90,0,20);g.addColorStop(0,'#fff');g.addColorStop(.5,'#c8ff2e');g.addColorStop(1,'#22d6ff');cx.fillStyle=g;cx.fillText('GOOOL!',0,0);
  cx.font='30px Bungee,Impact';cx.fillStyle='#fff';cx.lineWidth=6;const w=G.cfg.labels?.[G.sc]||AB(G.sk[G.sc]);cx.strokeText(w,0,50);cx.fillText(w,0,50);cx.restore()}
 if(G.phase=='count'){const i=Math.floor(G.ct/.8),lt=G.ct-i*.8,tx=['3','2','1','VAI!'][Math.min(3,i)],k=Math.min(1,lt/.18);cx.save();cx.translate(cam.x,cam.y-10);cx.scale(1.6-.6*k,1.6-.6*k);cx.globalAlpha=i<3?1-Math.max(0,(lt-.55)/.25):1;cx.font=(i<3?'140px':'100px')+' Bungee,Impact';cx.textAlign='center';cx.textBaseline='middle';cx.lineWidth=14;cx.strokeStyle='#0a0f2c';cx.strokeText(tx,0,0);const g=cx.createLinearGradient(0,-60,0,60);g.addColorStop(0,'#fff');g.addColorStop(.5,'#c8ff2e');g.addColorStop(1,'#22d6ff');cx.fillStyle=g;cx.fillText(tx,0,0);cx.restore()}
 if(G.flash>0){cx.setTransform(1,0,0,1,0,0);cx.fillStyle=`rgba(255,255,255,${G.flash*.6})`;cx.fillRect(0,0,cv.width,cv.height)}}
const NET=[new MaxballNet.Net(),new MaxballNet.Net()];
function netUpd(dt){NET.forEach((net,side)=>{const inside=ball.y>GY0&&ball.y<GY1&&(side?ball.x>W+BR:ball.x<-BR);if(inside&&!net.inside)net.impact((ball.y-GY0)/(GY1-GY0),Math.hypot(ball.vx,ball.vy));net.inside=inside;net.update(dt)})}
function camUpdate(dt){const h=P.find(q=>q.ctrl=='p1'),h2=P.find(q=>q.ctrl=='p2');let t;if(G.phase==='penalties')t={x:W-120,y:H/2};else if(G.phase=='intro'){const a=P.filter(q=>!q.hid);t=a.length?{x:a.reduce((s,q)=>s+q.x,0)/a.length,y:a.reduce((s,q)=>s+q.y,0)/a.length}:{x:W/2,y:H};t.y=Math.max(t.y,H*.5)}else if(G.phase=='goal'||!h)t=ball;else if(h2)t={x:(h.x+h2.x+ball.x*2)/4,y:(h.y+h2.y+ball.y*2)/4};else t={x:h.x+(ball.x-h.x)*.3,y:h.y+(ball.y-h.y)*.3};
 const k=1-Math.exp(-6*dt),vw=cv.width/Z,vh=cv.height/Z;const cc=(v,a,b)=>a>b?(a+b)/2:clamp(v,a,b);cam.x=cc(cam.x+(t.x-cam.x)*k,vw/2-CM,W+CM-vw/2);cam.y=cc(cam.y+(t.y-cam.y)*k,vh/2-CM,H+CM-vh/2)}
const GH=32,GDT=36,GI=9,VD=58;
function gp(s,d,y,z){const u=NET[s].sample((y-GY0)/(GY1-GY0),d/VD),dir=s?1:-1;return[(s?W:0)+dir*(d+u*(1-z/GH*.5)+z*.75),y-z*.6]}
function panel(s,c00,c10,c01,c11,nu,nv,fill,al){const at=(u,v)=>{const a=[0,1,2].map(k=>c00[k]*(1-u)*(1-v)+c10[k]*u*(1-v)+c01[k]*(1-u)*v+c11[k]*u*v);return gp(s,a[0],a[1],a[2])};
 cx.fillStyle=fill;cx.beginPath();for(let i=0;i<=nu;i++){const p=at(i/nu,0);i?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1])}
 for(let j=1;j<=nv;j++){const p=at(1,j/nv);cx.lineTo(p[0],p[1])}for(let i=nu-1;i>=0;i--){const p=at(i/nu,1);cx.lineTo(p[0],p[1])}for(let j=nv-1;j>0;j--){const p=at(0,j/nv);cx.lineTo(p[0],p[1])}cx.fill();
 cx.strokeStyle='rgba(255,255,255,'+al+')';cx.lineWidth=1;
 for(let i=0;i<=nu;i++){cx.beginPath();for(let j=0;j<=nv;j++){const p=at(i/nu,j/nv);j?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1])}cx.stroke()}
 for(let j=0;j<=nv;j++){cx.beginPath();for(let i=0;i<=nu;i++){const p=at(i/nu,j/nv);i?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1])}cx.stroke()}}
function bar(s,a,b,w){const p=gp(s,a[0],a[1],a[2]),q=gp(s,b[0],b[1],b[2]);cx.lineCap='round';cx.beginPath();cx.moveTo(p[0],p[1]);cx.lineTo(q[0],q[1]);cx.strokeStyle='rgba(10,15,44,.55)';cx.lineWidth=w+2.5;cx.stroke();cx.strokeStyle='#f4f6ff';cx.lineWidth=w;cx.stroke();cx.lineCap='butt'}
const G3=()=>({FLT:[0,GY0,GH],FRT:[0,GY1,GH],FLG:[0,GY0,0],FRG:[0,GY1,0],BLT:[GDT,GY0+GI*.6,GH*.72],BRT:[GDT,GY1-GI*.6,GH*.72],BLG:[VD,GY0+GI,0],BRG:[VD,GY1-GI,0]});
let GG=G3();
function netBack(s){const q=GG;cx.fillStyle='rgba(0,0,0,.3)';cx.beginPath();[q.FLG,q.FRG,q.BRG,q.BLG].forEach((c,i)=>{const p=gp(s,c[0],c[1],c[2]);i?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1])});cx.fill();
 {const a=gp(s,0,GY0,0),b=gp(s,0,GY1,0);cx.strokeStyle='#ff4d4d';cx.lineWidth=3.5;cx.beginPath();cx.moveTo(a[0],a[1]);cx.lineTo(b[0],b[1]);cx.stroke()}
 panel(s,q.BLT,q.BRT,q.BLG,q.BRG,8,4,'rgba(225,235,255,.12)',.5);
 panel(s,q.FLT,q.BLT,q.FLG,q.BLG,4,3,'rgba(225,235,255,.09)',.4);panel(s,q.FRT,q.BRT,q.FRG,q.BRG,4,3,'rgba(225,235,255,.09)',.4);
 bar(s,q.FLG,q.BLG,2.5);bar(s,q.FRG,q.BRG,2.5);bar(s,q.BLG,q.BRG,2.5);bar(s,q.BLT,q.BLG,3);bar(s,q.BRT,q.BRG,3);bar(s,q.BLT,q.BRT,3)}
function netFront(s){const q=GG;panel(s,q.FLT,q.FRT,q.BLT,q.BRT,8,4,'rgba(225,235,255,.07)',.45);
 bar(s,q.FLT,q.BLT,3);bar(s,q.FRT,q.BRT,3);
 [GY0,GY1].forEach(y=>{const p=gp(s,0,y,0);cx.fillStyle='rgba(10,15,44,.7)';cx.beginPath();cx.arc(p[0],p[1],6,0,7);cx.fill()});
 bar(s,q.FLG,q.FLT,6);bar(s,q.FRG,q.FRT,6);bar(s,q.FLT,q.FRT,6)}
function dq(q){const a=Math.max(0,q.l/q.m);cx.globalAlpha=a;cx.fillStyle=q.c;cx.strokeStyle=q.c;
 if(q.t=='c'){cx.beginPath();cx.arc(q.x,q.y,q.s*(.4+a*.6),0,7);cx.fill()}
 else if(q.t=='r'){cx.lineWidth=3;cx.beginPath();cx.arc(q.x,q.y,q.s,0,7);cx.stroke()}
 else if(q.t=='k'){cx.save();cx.translate(q.x,q.y);cx.rotate(q.r);cx.fillRect(-q.s/2,-q.s/4,q.s,q.s/2);cx.restore()}
 else if(q.t=='t'){cx.font=q.s+'px Bungee,Impact,sans-serif';cx.textAlign='center';cx.lineWidth=4;cx.strokeStyle='#0a0f2c';cx.strokeText(q.txt,q.x,q.y);cx.fillText(q.txt,q.x,q.y)}else{cx.font=q.s+'px sans-serif';cx.textAlign='center';cx.fillText('✦',q.x,q.y)}cx.globalAlpha=1}

let STAD=null;document.fonts&&document.fonts.ready.then(()=>{STAD=null;for(const k in SPR)delete SPR[k];for(const k in PSPR)delete PSPR[k]});
function buildStadium(){const c=document.createElement('canvas');c.width=W+2*E;c.height=H+2*E;const g=c.getContext('2d');g.translate(E,E);
 let sd=7;const rn=()=>(sd=sd*16807%2147483647)/2147483647,ib=MG+16;
 g.fillStyle='#0d1238';g.fillRect(-E,-E,W+2*E,H+2*E);
 const cols=['#e8ebff','#c8ff2e','#ff2d87','#22d6ff','#ffc400','#7d86c9','#3b4489','#3b4489'];
 for(let x=-E;x<W+E;x+=9)for(let y=-E;y<H+E;y+=9){if(x>-ib-9&&x<W+ib&&y>-ib-9&&y<H+ib)continue;g.globalAlpha=.5+rn()*.45;g.fillStyle=cols[rn()*cols.length|0];g.fillRect(x+rn()*3,y+rn()*3,5,6)}
 g.globalAlpha=1;g.strokeStyle='rgba(8,10,40,.6)';g.lineWidth=3;for(let k=0;k<5;k++){const o=ib+24+k*26;g.strokeRect(-o,-o,W+2*o,H+2*o)}
 g.fillStyle='#0a0f2c';g.fillRect(-ib,-ib,W+2*ib,H+2*ib);
 const bc=['#c8ff2e','#22d6ff','#ff2d87','#ffc400'],bw=(W+2*MG)/9,bh=(H+2*MG)/6;g.font='10px Bungee,Impact';g.textAlign='center';
 for(let i=0;i<9;i++)[-ib+2,H+MG+2].forEach(y=>{g.fillStyle=bc[i%4];g.fillRect(-MG+i*bw+2,y,bw-4,12);g.fillStyle='#0a0f2c';g.fillText('MAXBALL',-MG+i*bw+bw/2,y+10)});
 for(let i=0;i<6;i++){g.fillStyle=bc[(i+1)%4];g.fillRect(-ib+2,-MG+i*bh+2,12,bh-4);g.fillRect(W+MG+2,-MG+i*bh+2,12,bh-4)}
 g.fillStyle='#3f9a3a';g.fillRect(-MG,-MG,W+2*MG,H+2*MG);
 g.fillStyle='rgba(255,255,255,.05)';for(let x=-MG;x<W+MG;x+=60)g.fillRect(x,-MG,30,H+2*MG);
 for(let i=0;i<10;i++){g.fillStyle=i%2?'#1c9448':'#20a04e';g.fillRect(i*W/10,0,W/10+1,H)}
 g.fillStyle='rgba(0,0,0,.22)';g.fillRect(-GD,GY0,GD,GY1-GY0);g.fillRect(W,GY0,GD,GY1-GY0);
 g.strokeStyle='rgba(255,255,255,.85)';g.lineWidth=3;g.strokeRect(0,0,W,H);g.beginPath();g.moveTo(W/2,0);g.lineTo(W/2,H);g.stroke();
 g.beginPath();g.arc(W/2,H/2,MaxballField.geometry(simulationState()).centerRadius,0,7);g.stroke();const area=MaxballField.geometry(simulationState());g.strokeRect(0,GY0-area.areaPadding,area.areaDepth,GY1-GY0+area.areaPadding*2);g.strokeRect(W-area.areaDepth,GY0-area.areaPadding,area.areaDepth,GY1-GY0+area.areaPadding*2);
 g.strokeRect(0,GY0-25,55,GY1-GY0+50);g.strokeRect(W-55,GY0-25,55,GY1-GY0+50);
 g.fillStyle='rgba(255,255,255,.85)';[[110,H/2],[W-110,H/2],[W/2,H/2]].forEach(a=>{g.beginPath();g.arc(a[0],a[1],4,0,7);g.fill()});
 g.fillStyle='rgba(255,255,255,.1)';g.font='60px Bungee,Impact';g.fillText('MAX',W/2,H/2+20);
 g.fillStyle='#0b2a14';g.fillRect(-8,-8,W+16,8);g.fillRect(-8,H,W+16,8);[-8,W].forEach(x=>{g.fillRect(x,0,8,GY0);g.fillRect(x,GY1,8,H-GY1)});
 {const rr=(x,y,w,h,r)=>{g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.lineTo(x+w,y+h);g.lineTo(x,y+h);g.arcTo(x,y,x+w,y,r);g.closePath()},tx=W/2-64,ty=H+12,tw=128,th=ib+22;
 rr(tx-6,ty-6,tw+12,th,22);g.fillStyle='#c8ff2e';g.fill();rr(tx,ty,tw,th-6,18);const gr=g.createLinearGradient(0,ty,0,ty+th);gr.addColorStop(0,'#3a4bb8');gr.addColorStop(.35,'#10184a');gr.addColorStop(1,'#02030c');g.fillStyle=gr;g.fill();
 g.fillStyle='rgba(255,255,255,.08)';for(let i=1;i<5;i++)g.fillRect(tx+8,ty+i*18,tw-16,2);
 g.fillStyle='#fff';g.font='12px Bungee,Impact';g.textAlign='center';g.fillText('MAXBALL',W/2,ty+th-14)}
 [[-E+70,-E+70],[W+E-70,-E+70],[-E+70,H+E-70],[W+E-70,H+E-70]].forEach(([x,y])=>{const r=g.createRadialGradient(x,y,3,x,y,120);r.addColorStop(0,'rgba(255,255,230,.95)');r.addColorStop(1,'rgba(255,255,230,0)');g.fillStyle=r;g.fillRect(x-120,y-120,240,240)});
 return c}
let last=0;function loop(t){requestAnimationFrame(loop);const dt=Math.min(.25,(t-last)/1000||0);last=t;
 if(!G||G.renderError||!$('#game').classList.contains('on'))return;try{if(G.remote)remoteRender(dt,t);else if(!G.paused)fixedClock.advance(dt);else fixedClock.reset();crowd.update(dt,simulationState());draw()}catch(e){G.renderError=true;crowd.quiet();console.error(e);toast('Não foi possível continuar a partida. Volte ao menu.')}}
function rsz(){const d=Math.min(2,devicePixelRatio||1);cv.width=Math.round(innerWidth*d);cv.height=Math.round(innerHeight*d);Z=cv.height/VH*(save.zoom||100)/100}
addEventListener('resize',rsz);rsz();
const ljs={x:0,y:0},lj=$('#ljoy'),lkn=lj.firstElementChild;
const lockerJoystick=MaxballPointers.bindJoystick(lj,lkn,ljs);
function resetInputs(){
 for(const code of Object.keys(keys))delete keys[code];
 tj.x=tj.y=ljs.x=ljs.y=0;
 tb.s=tb.p=tb.r=0;joystickBinding.reset();actionBindings.forEach(b=>b.reset());careerButtons.pass=careerButtons.shot=false;
 jid=null;lockerJoystick.reset();
 knob.style.transform=lkn.style.transform='';
}
MaxballInput.installInputLifecycle({target:window,document,reset:resetInputs});
function lchat(n,t,me){const l=$('#llog'),d=document.createElement('div'),b=document.createElement('b');b.style.color=me?'#c8ff2e':'#22d6ff';b.textContent=n+':';d.append(b,document.createTextNode(' '+t));l.append(d);while(l.children.length>6)l.firstChild.remove();
 const o=me?LK&&LK.me:LK&&LK.bots.find(q=>q.name==n);if(o){o.say=t;o.sayT=4}}
function lsend(){const i=$('#lmsg'),t=i.value.trim();if(!t||!LK)return;i.value='';lchat(save.name,t,1);const b=LK.bots[Math.random()*LK.bots.length|0];if(b){const R=['Bora!','Hoje a gente ganha!','Fechou!','Vamos pra cima!'];setTimeout(()=>{if(LK)lchat(b.name,R[Math.random()*R.length|0])},900+Math.random()*900)}}
$('#lsend').onclick=lsend;$('#lmsg').onkeydown=e=>{if(e.key=='Enter')lsend()};
$('#gset').onclick=()=>{resetInputs();$('#z0').value=save.zoom||100;$('#z1').value=save.ctl.j.s*100;$('#z2').value=save.ctl.op*100;$('#z3').checked=!save.ns;$('#gpan').classList.add('on');if(G)G.paused=1};
$('#zok').onclick=()=>{resetInputs();$('#gpan').classList.remove('on');if(G)G.paused=0;persist()};
$('#z0').oninput=e=>{save.zoom=+e.target.value;rsz();persist()};
$('#z1').oninput=e=>{const v=e.target.value/100;save.ctl.j.s=save.ctl.s.s=save.ctl.p.s=v;applyCtl();persist()};
$('#z2').oninput=e=>{save.ctl.op=e.target.value/100;applyCtl();persist()};
$('#z3').onchange=e=>{save.ns=!e.target.checked;persist()};
applyCtl();
function rAdd(n,t,me){const l=$('#rlogc'),d=document.createElement('div');if(n){const b=document.createElement('b');b.style.color=me?'#c8ff2e':'#22d6ff';b.textContent=n+': ';d.append(b)}else d.style.color='#b9c4ff';d.append(document.createTextNode(t));l.append(d);while(l.children.length>5)l.firstChild.remove()}
function rSend(){const i=$('#rmsg'),t=i.value.trim();if(!t)return;i.value='';rAdd(save.name,t,1);const R=['Bora!','Fechou!','Hoje a gente ganha!','Vamos pra cima!'];setTimeout(()=>rAdd('Bot 1',R[Math.random()*R.length|0]),900+Math.random()*900)}
$('#rsend').onclick=rSend;$('#rmsg').onkeydown=e=>{if(e.key=='Enter')rSend()};

function uchip(){$('#pchip').textContent='👤 '+save.name+' · '+save.fid}
function rProf(){$('#pid').textContent=save.fid;$('#pnm').value=save.name;const t=$('#pst');t.innerHTML='';[['Partidas',save.st.p],['Vitórias',save.st.w],['Gols',save.st.g],['Moedas',save.coins]].forEach(([a,b])=>{const d=document.createElement('div');d.className='fr';const x=document.createElement('span'),y=document.createElement('small');x.textContent=a;y.textContent=b;d.append(x,y);t.append(d)})}
$('#psv').onclick=()=>{const v=$('#pnm').value.trim().replace(/\s+/g,' ');if(!/^[\p{L}\p{N} _.-]{3,14}$/u.test(v))return toast('Nome: 3 a 14 letras, números, espaço, _ . -');save.name=v;persist();uchip();toast('Nome salvo')};
$('#pcp').onclick=()=>{try{navigator.clipboard.writeText(save.fid)}catch(e){}toast('ID copiado')};
$('#lnm').onclick=()=>{save.num=save.num<=1?99:save.num-1;$('#lnv').textContent=save.num;if(LK)LK.me.num=save.num;persist()};
$('#lnp').onclick=()=>{save.num=save.num>=99?1:save.num+1;$('#lnv').textContent=save.num;if(LK)LK.me.num=save.num;persist()};
$('#lnok').onclick=()=>$('#lnum').classList.remove('on');
document.querySelectorAll('.emo button').forEach(b=>b.onclick=()=>{if(!LK)return;LK.me.say=b.textContent;LK.me.sayT=3;const o=LK.bots[Math.random()*LK.bots.length|0];if(o)setTimeout(()=>{o.say=['👏','🔥','😂','👍'][Math.random()*4|0];o.sayT=3},700)});
function rFr(){$('#fid').textContent=save.fid;const l=$('#frl');l.innerHTML='';if(!save.fr.length){l.textContent='Nenhum amigo ainda. Adicione pelo nome ou código.';return}
 save.fr.forEach((f,i)=>{const d=document.createElement('div');d.className='fr';const a=document.createElement('span');a.textContent=f;const m=document.createElement('small');m.textContent='Offline';const b=document.createElement('button');b.className='chip';b.textContent='Remover';b.onclick=()=>{save.fr.splice(i,1);persist();rFr()};d.append(a,m,b);l.append(d)})}
function fAdd(){const i=$('#fin'),v=i.value.trim();if(v.length<2)return toast('Digite pelo menos 2 caracteres');if(save.fr.some(f=>f.toLowerCase()==v.toLowerCase()))return toast('Já está na lista');if(save.fr.length>=50)return toast('Lista cheia');save.fr.push(v);i.value='';persist();rFr();toast('Amigo adicionado')}
$('#fadd').onclick=fAdd;$('#fin').onkeydown=e=>{if(e.key=='Enter')fAdd()};
$('#fcp').onclick=()=>{try{navigator.clipboard.writeText(save.fid)}catch(e){}toast('Código copiado')};
const LG={priv:['Privacidade e dados',`<p><b>Dados locais.</b> Os modos offline guardam preferências e cosméticos no navegador.</p><p><b>Conta.</b> O servidor guarda perfil, sessões, carreira, compras, saldo, inventário, partidas e ações administrativas. Com Supabase configurado, ele autentica o e-mail e armazena perfil e histórico ranqueado.</p><p><b>Conexão.</b> O servidor recebe comandos de jogo e calcula os resultados. Google Fonts fornece as fontes e recebe as requisições do navegador.</p><p>Limpar o navegador apaga o progresso offline; o progresso da conta permanece no servidor.</p>`],terms:['Uso do MAXBALL',`<p>Gemas e cosméticos são itens virtuais do jogo. Resultados oficiais são calculados pelo servidor.</p><p>No ranqueado, sair da partida resulta em derrota. Uma desconexão permite até 20 segundos para reconectar.</p><p>Trapaças e abuso podem resultar em suspensão. O progresso da conta depende da disponibilidade e dos backups do servidor.</p>`]};
document.addEventListener('click',e=>{const b=e.target.closest('[data-legal]');if(!b)return;const x=LG[b.dataset.legal];$('#lt').textContent=x[0];$('#ltxt').innerHTML=x[1];show('legal')});

const careerButtons={pass:false,shot:false};
for(const [id,key] of [['request-pass','pass'],['request-shot','shot']]){const b=$('#'+id);b.addEventListener('pointerdown',e=>{e.preventDefault();careerButtons[key]=true;});for(const type of ['pointerup','pointercancel','pointerleave'])b.addEventListener(type,()=>careerButtons[key]=false);}
addEventListener('blur',()=>{careerButtons.pass=careerButtons.shot=false;crowd.quiet();});document.addEventListener('visibilitychange',()=>{if(document.hidden)crowd.quiet();});
function leaveRemote(){matchTimers.clear();remoteMatch=null;remoteFrames.clear();G=null;show('home');events.emit('REMOTE_EXIT',{});}
function receiveRemote(snapshot,userId){
 if(remoteMatch!==snapshot.matchId){
  start('bot',snapshot.cfg);remoteUser=userId;remoteMatch=snapshot.matchId;remoteScore=[0,0];
  $('#keys').textContent='WASD / setas · F chute · G passe'+(snapshot.cfg.career?' · Q pedir passe · R pedir chute':'');$('#career-commands').hidden=!snapshot.cfg.career;
 }
 window.MaxballPresentation?.update(snapshot,userId);remoteFrames.push(snapshot,performance.now());G.remote=true;if(!$('#game').classList.contains('on'))show('game');
}
function remoteRender(dt,time){
 const state=remoteFrames.sample(time);if(!state)return;
 const previousPhase=G.phase;
 if(previousPhase==='starting'&&state.G.phase==='play'){resetInputs();actionSeq.shoot=actionSeq.pass=0;}
 G={...state.G,mode:'online',remote:true,paused:G.paused,cfg:state.cfg,sk:state.cfg.teams?[22,23]:[state.cfg.sk0,state.cfg.sk1],shake:G.shake||0,flash:Math.max(0,(G.flash||0)-dt*2),earn:0};
 P=state.P.map(p=>({...p,ctrl:p.id===remoteUser?'p1':'ai'}));ball={...state.ball};HT=P.find(p=>p.id===remoteUser)?.team||0;
 W=state.W;H=state.H;GY0=state.GY0;GY1=state.GY1;BR=state.BR;
 if(G.phase==='penalties'&&previousPhase!=='penalties'){cam.x=W-120;cam.y=H/2;}
 if(G.cfg.labels){$('#abA').textContent=G.cfg.labels[0].slice(0,12);$('#abB').textContent=G.cfg.labels[1].slice(0,12);}
 for(let team=0;team<2;team++)if(G.score[team]>remoteScore[team]){crowd.goal();showGoal(team);beep(659,.25);G.flash=1;burst(team?0:W,ball.y,40,[c0,c1,'#fff'],320,1);}
 $('#match-notice').textContent=G.notice&&G.notice.until>G.elapsed?G.notice.text:G.period==='EXTRA_TIME'?'PRORROGAÇÃO':'';
 const penaltyHUD=$('#penalty-hud');penaltyHUD.hidden=G.phase!=='penalties';if(G.penalties){const pen=G.penalties,shooter=P.find(p=>p.id===pen.shooter),role=remoteUser===pen.shooter?'Você cobra: mova e chute':remoteUser===pen.keeper?'Você defende: cima / baixo':'Aguarde a cobrança';penaltyHUD.textContent='PÊNALTIS '+pen.score.join(' × ')+' · '+(shooter?.displayName||shooter?.name||'')+' · '+(pen.result==='GOAL'?'GOL':pen.result==='MISS'?'DEFESA / FORA':Math.ceil(Math.max(0,MaxballConfig.match.penaltySeconds-pen.time))+'s')+' · '+role;}
 remoteScore=G.score.slice();netUpd(dt);camUpdate(dt);updHUD();
 for(let i=PA.length-1;i>=0;i--){const p=PA[i];p.l-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.l<=0)PA.splice(i,1);}
 if(G.phase==='end'&&previousPhase!=='end'){
  $('#rt').textContent=G.reason==='ABANDONED'?'ENCERRADA':G.winner==null?'EMPATE':G.winner===HT?'VITÓRIA':'DERROTA';
  $('#rs').textContent=G.score.join(' x ')+(G.penalties?' · Pênaltis '+G.penalties.score.join(' × '):'');$('#res').classList.add('on');
 }
}
window.MaxballGame=Object.freeze({
 show,toast,on:events.on,
 get remote(){return !!G?.remote;},
 snapshot:receiveRemote,
 localProfile(){return {name:save.name,num:save.num,kit:save.kit,coins:save.coins};},
 cycleKit(dir){const n=save.k.indexOf(save.kit);save.kit=save.k[(n+dir+save.k.length)%save.k.length];persist();},
 teamSkin(canvas,team){const g=canvas.getContext('2d');g.clearRect(0,0,canvas.width,canvas.height);drawSkin(g,canvas.width/2,canvas.height/2,canvas.width*.43,MaxballTeams.skin(team));},
 input(){if(!G?.remote)return null;if(G.paused||G.phase==='starting')return {x:0,y:0,shoot:false,pass:false};const p=P.find(p=>p.id===remoteUser);if(!p)return null;const i=inputOf(p),n=Math.max(1,Math.hypot(i.x,i.y));return {x:i.x/n,y:i.y/n,shoot:!!i.shoot,pass:!!i.pass,shootSeq:i.shootSeq||0,passSeq:i.passSeq||0,requestPass:!!i.requestPass,requestShot:!!i.requestShot};},
 celebrateSound(){aud();beep(523,.2,'sine',.08);setTimeout(()=>beep(659,.2,'sine',.08),180);setTimeout(()=>beep(784,.5,'sine',.08),360);},
 leaveRemote,
 skin(canvas,index){const g=canvas.getContext('2d');drawSkin(g,canvas.width/2,canvas.height/2,canvas.width*.44,SK[index]||SK[0]);},
 effect(canvas,index){fxIcon(canvas.getContext('2d'),index,canvas.width);}
});

requestAnimationFrame(loop);show('home');ready=true;if(storageIssue)toast(storageIssue);

})();

