(function(root){
 'use strict';
 const {el,field,select,button,note,card}=root.MaxballUI;
 const labels={SOLID:'Lisa',HALF:'Meio a meio',STRIPES:'Listras verticais',SLEEVES:'Mangas',DETAIL:'Faixa central',HOOPS:'Listras horizontais',SASH:'Faixa diagonal',CHECKER:'Xadrez',CHEVRON:'Chevron',THIRDS:'Três faixas',STAR:'Estrela',BALL:'Bola',SHIELD:'Escudo',LIGHTNING:'Raio',CROWN:'Coroa',HEART:'Coração',CIRCLE:'Círculo',STRIPE:'Faixa',RING:'Anel',DIAMOND:'Losango',TRIANGLE:'Triângulo',CROSS:'Cruz',TEXT:'Texto / iniciais',DRAW:'Desenho livre'};
 const clone=value=>JSON.parse(JSON.stringify(value)),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function editor(initial){
  const schema=root.MaxballSkinDesign,radius=137.6;
  const fresh=()=>({primaryColor:'#176b47',secondaryColor:'#ffffff',accentColor:'#c8ff2e',kitStyle:'HALF',layers:[]});
  let design=schema.validate(initial||fresh()),selected=-1,drag=null,history=[JSON.stringify(design)],cursor=0,tab='models';
  const canvas=el('canvas',{width:320,height:320,class:'skin-editor-canvas',tabindex:0,'aria-label':'Prévia da skin. Selecione, desenhe ou arraste uma camada.'});
  const fieldCanvas=el('canvas',{width:320,height:132,class:'skin-field-preview','aria-label':'Prévia da skin no campo'});
  const box=el('section',{class:'skin-editor'}),controls=el('div',{class:'skin-layer-controls'}),layers=el('div',{class:'skin-layer-list'}),colors=el('div',{class:'skin-colors'}),colorInputs={};
  const undo=button('Desfazer',()=>restore(-1),'secondary'),redo=button('Refazer',()=>restore(1),'secondary'),counter=note(''),hint=note('Selecione um símbolo ou desenhe a sua marca.');
  undo.onclick=()=>restore(-1);redo.onclick=()=>restore(1);
  const tools=select('Ferramenta','editorTool',[['SELECT','Selecionar / mover'],['DRAW','Pincel'],['ERASE','Apagar camada']],'SELECT'),tool=tools.querySelector('select');
  const ink=field('Cor do pincel','brushColor','color',design.accentColor),brush=field('Espessura do pincel','brushSize','range',.08,{min:.015,max:.4,step:.005});
  const mirror=el('input',{type:'checkbox',name:'mirrorBrush'});
  const grid=el('input',{type:'checkbox',name:'showGrid'}),snap=el('input',{type:'checkbox',name:'snapGrid'});
  const tabs=el('div',{class:'skin-tabs',role:'tablist','aria-label':'Personalizar skin'}),panels={},tabButtons={};
  function activate(next){tab=next;for(const key of Object.keys(panels)){panels[key].hidden=key!==tab;tabButtons[key].setAttribute('aria-selected',String(key===tab));tabButtons[key].tabIndex=key===tab?0:-1;}}
  for(const [key,title] of [['models','Uniforme'],['layers','Símbolos e camadas'],['drawing','Desenhar']]){
   panels[key]=el('section',{class:'skin-tab-panel',role:'tabpanel','aria-label':title});
   tabButtons[key]=button(title,()=>activate(key),'secondary');tabButtons[key].setAttribute('role','tab');tabs.append(tabButtons[key]);
  }
  tabs.onkeydown=e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const keys=Object.keys(panels),next=keys[(keys.indexOf(tab)+(e.key==='ArrowRight'?1:2))%3];activate(next);tabButtons[next].focus();};
  function commit(){const next=JSON.stringify(design);if(history[cursor]!==next){history=history.slice(0,cursor+1);history.push(next);if(history.length>60)history.shift();cursor=history.length-1;}undo.disabled=cursor===0;redo.disabled=cursor===history.length-1;}
  function restore(delta){if(!history[cursor+delta])return;cursor+=delta;design=JSON.parse(history[cursor]);selected=Math.min(selected,design.layers.length-1);sync();render();}
  function change(fn){fn();commit();render();}
  function sync(){for(const key of Object.keys(colorInputs))colorInputs[key].value=design[key];style.querySelector('select').value=design.kitStyle;ink.querySelector('input').value=design.accentColor;}
  function paint(){
   root.MaxballGame.teamSkin(canvas,{...design,design,name:'Prévia'});
   const g=canvas.getContext('2d');
   if(grid.checked){g.save();g.beginPath();g.arc(160,160,radius,0,Math.PI*2);g.clip();g.lineWidth=1;g.strokeStyle='#ffffff45';g.beginPath();for(let i=-8;i<=8;i++){const at=160+i*radius/8;g.moveTo(at,160-radius);g.lineTo(at,160+radius);g.moveTo(160-radius,at);g.lineTo(160+radius,at);}g.stroke();g.restore();}
   if(selected>=0&&design.layers[selected].visible!==false){const l=design.layers[selected];g.save();g.translate(160+l.x*radius,160+l.y*radius);g.rotate(l.rotation*Math.PI/180);g.strokeStyle=l.locked?'#ffd46d':'#22d6ff';g.lineWidth=2;g.setLineDash([5,4]);g.beginPath();g.ellipse(0,0,Math.max(12,l.scale*radius*(l.scaleX??1)),Math.max(12,l.scale*radius*(l.scaleY??1)),0,0,Math.PI*2);g.stroke();g.restore();}
   const pitch=fieldCanvas.getContext('2d');pitch.fillStyle='#22653f';pitch.fillRect(0,0,320,132);pitch.strokeStyle='#d8efd070';pitch.lineWidth=1.5;pitch.strokeRect(10,10,300,112);pitch.beginPath();pitch.moveTo(160,10);pitch.lineTo(160,122);pitch.arc(160,66,30,0,Math.PI*2);pitch.stroke();
   const sprite=el('canvas',{width:64,height:64});root.MaxballGame.teamSkin(sprite,{...design,design,name:'Prévia'});for(const [x,y,size] of [[86,67,36],[161,47,28],[231,84,24]]){pitch.drawImage(sprite,x-size/2,y-size/2,size,size);pitch.fillStyle='#fff';pitch.font='bold '+Math.round(size*.3)+'px Rubik';pitch.textAlign='center';pitch.textBaseline='middle';pitch.fillText('10',x,y);}
  }
  function render(){
   counter.textContent=design.layers.length+' / '+schema.maxLayers+' camadas';layers.replaceChildren();
   [...design.layers.keys()].reverse().forEach(i=>{const l=design.layers[i],row=el('div',{class:'skin-layer-row'}),thumb=el('canvas',{width:40,height:40,'aria-hidden':'true'});schema.layers(thumb.getContext('2d'),20,20,16,{...design,layers:[{...l,x:0,y:0,scale:.6,visible:true}]});
    const b=button((i+1)+' · '+(l.name||(l.icon==='TEXT'?l.text:labels[l.icon]))+(l.visible===false?' · oculta':'')+(l.locked?' · bloqueada':''),()=>{selected=i;tool.value='SELECT';activate('layers');render();},'secondary');b.classList.toggle('selected',selected===i);b.setAttribute('aria-pressed',String(selected===i));b.prepend(thumb);row.append(b);layers.append(row);
   });controls.replaceChildren();
   if(selected>=0){
    const l=design.layers[selected],name=field('Nome da camada','layerName','text',l.name||labels[l.icon],{maxlength:24});
    name.onchange=()=>change(()=>{const value=name.querySelector('input').value.trim();if(value)l.name=value;else delete l.name;});controls.append(name);
    for(const [key,label,min,max,step] of [['x','Horizontal',-1,1,.01],['y','Vertical',-1,1,.01],['scale','Tamanho',.05,1.5,.01],['scaleX','Largura',.2,3,.01],['scaleY','Altura',.2,3,.01],['rotation','Rotação',-180,180,1],['opacity','Opacidade',0,1,.01]]){
     const row=field(label,key,'range',l[key]??1,{min,max,step}),input=row.querySelector('input');input.oninput=()=>{l[key]=+input.value;paint();};input.onchange=commit;controls.append(row);
    }
    const color=field('Cor da camada','layerColor','color',l.color);color.oninput=()=>{l.color=color.querySelector('input').value;paint();};color.onchange=commit;controls.append(color);
    if(l.icon==='TEXT'){const text=field('Texto (até 12 caracteres)','layerText','text',l.text,{maxlength:12,required:''});text.oninput=()=>{l.text=text.querySelector('input').value;paint();};text.onchange=()=>{commit();render();};controls.append(text);}
    if(l.icon==='DRAW'){const size=field('Espessura do traço','strokeBrush','range',l.brush,{min:.015,max:.4,step:.005});size.oninput=()=>{l.brush=+size.querySelector('input').value;paint();};size.onchange=commit;controls.append(size);}
    controls.append(el('div',{class:'skin-tools'},[
     button('Centralizar',()=>change(()=>{l.x=l.y=0;}),'secondary'),
     button('Espelhar',()=>change(()=>l.flipX=!l.flipX),'secondary'),
     button(l.locked?'Desbloquear camada':'Bloquear camada',()=>change(()=>l.locked=!l.locked),'secondary'),
     button(l.visible===false?'Mostrar camada':'Ocultar camada',()=>change(()=>l.visible=l.visible===false),'secondary'),
     button('Duplicar camada',()=>change(()=>{capacity();if(l.points&&pointCount()+l.points.length>schema.maxDrawingPoints)throw Error('Limite de pontos do desenho atingido.');design.layers.splice(selected+1,0,{...clone(l),x:Math.min(1,l.x+.08),y:Math.min(1,l.y+.08)});selected++;}),'secondary'),
     button('Camada acima',()=>change(()=>{if(selected<design.layers.length-1){[design.layers[selected],design.layers[selected+1]]=[design.layers[selected+1],design.layers[selected]];selected++;}}),'secondary'),
     button('Camada abaixo',()=>change(()=>{if(selected>0){[design.layers[selected],design.layers[selected-1]]=[design.layers[selected-1],design.layers[selected]];selected--;}}),'secondary'),
     button('Remover camada',()=>change(()=>{design.layers.splice(selected,1);selected=Math.min(selected,design.layers.length-1);}),'danger')
    ]));
   }else controls.append(note('Escolha uma camada para editar. As camadas do topo aparecem na frente.'));
   undo.disabled=cursor===0;redo.disabled=cursor===history.length-1;canvas.dataset.tool=tool.value;paint();
  }
  function capacity(){if(design.layers.length>=schema.maxLayers)throw Error('Limite de 32 camadas.');}
  function pointCount(){return design.layers.reduce((sum,l)=>sum+(l.points?.length||0),0);}
  function add(kind){change(()=>{capacity();design.layers.push({icon:kind,color:design.accentColor,x:0,y:0,scale:.35,rotation:0,...(kind==='TEXT'?{text:'MAX'}:{})});selected=design.layers.length-1;tool.value='SELECT';activate('layers');});}
  for(const [key,label] of [['primaryColor','Principal'],['secondaryColor','Secundária'],['accentColor','Detalhes']]){const row=field(label,key,'color',design[key]);colorInputs[key]=row.querySelector('input');colorInputs[key].oninput=()=>{design[key]=colorInputs[key].value;paint();};colorInputs[key].onchange=commit;colors.append(row);}
  const style=select('Base do uniforme','kitStyle',schema.styles.map(s=>[s,labels[s]]),design.kitStyle);style.onchange=()=>change(()=>design.kitStyle=style.querySelector('select').value);colors.append(style);
  const icon=select('Nova camada','icon',schema.icons.filter(i=>i!=='DRAW').map(i=>[i,labels[i]]),'STAR');
  function download(name,href){const link=el('a',{download:name,href});link.click();}
  const exportImage=button('Baixar PNG',()=>{const c=el('canvas',{width:1024,height:1024});root.MaxballGame.teamSkin(c,{...design,design:schema.validate(design),name:'Skin'});download('maxball-skin.png',c.toDataURL('image/png'));},'secondary');
  const exportDesign=button('Baixar design',()=>download('maxball-skin.json','data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(schema.validate(design)))),'secondary');
  const upload=el('input',{type:'file',accept:'.json,application/json',hidden:''});
  upload.onchange=async()=>{const file=upload.files?.[0];if(!file)return;try{if(file.size>16384)throw Error('O arquivo deve ter até 16 KB.');const next=schema.validate(JSON.parse(await file.text()));change(()=>{design=next;selected=-1;sync();});hint.textContent='Design importado. Você pode editar e salvar sua cópia.';}catch(error){root.MaxballPortal.error(error);}finally{upload.value='';}};
  const importDesign=button('Abrir design',()=>upload.click(),'secondary');
  const presets=el('div',{class:'skin-presets','aria-label':'Modelos de uniformes'});
  for(const [name,base,primary,secondary,accent,mark] of [['Clássico','SOLID','#176b47','#ffffff','#edc363','BALL'],['Listrado','STRIPES','#d3202b','#101014','#ffffff','STAR'],['Diagonal','SASH','#111827','#ffffff','#edc363','SHIELD'],['Xadrez','CHECKER','#176ad6','#ffffff','#edc363','CROWN'],['Meio a meio','HALF','#853cbe','#101014','#c8ff2e','LIGHTNING'],['Tricolor','THIRDS','#176ad6','#111827','#ffffff','STAR']]){
   const model={primaryColor:primary,secondaryColor:secondary,accentColor:accent,kitStyle:base,layers:[{icon:mark,color:accent,x:0,y:0,scale:.32,rotation:0}]},preview=el('canvas',{width:72,height:72,'aria-hidden':'true'});root.MaxballGame.teamSkin(preview,{...model,design:model,name});const choose=button(name,()=>change(()=>{design=clone(model);selected=-1;sync();}),'skin-preset');choose.prepend(preview);presets.append(choose);
  }
  const palette=el('div',{class:'skin-palette','aria-label':'Paletas prontas'});
  for(const [name,primary,secondary,accent] of [['Verde e ouro','#176b47','#ffffff','#edc363'],['Vermelho e preto','#d3202b','#101014','#ffffff'],['Azul e branco','#176ad6','#ffffff','#edc363'],['Roxo e limão','#853cbe','#101014','#c8ff2e'],['Preto e dourado','#111827','#edc363','#ffffff'],['Laranja e azul','#f47b20','#10254a','#ffffff']]){const swatch=button('',()=>change(()=>{design.primaryColor=primary;design.secondaryColor=secondary;design.accentColor=accent;sync();}),'skin-swatch');swatch.setAttribute('aria-label',name);swatch.title=name;swatch.style.background='linear-gradient(90deg,'+primary+' 0 45%,'+secondary+' 45% 80%,'+accent+' 80%)';palette.append(swatch);}
  const library=el('div',{class:'skin-symbol-library','aria-label':'Símbolos para adicionar'});
  for(const kind of schema.icons.filter(i=>i!=='DRAW')){const thumb=el('canvas',{width:44,height:44,'aria-hidden':'true'});schema.layers(thumb.getContext('2d'),22,22,17,{...design,layers:[{icon:kind,color:'#edf4ff',x:0,y:0,scale:1,rotation:0,...(kind==='TEXT'?{text:'FC'}:{})}]});const b=button(labels[kind],()=>add(kind),'skin-symbol');b.prepend(thumb);library.append(b);}
  panels.models.append(el('h4',{text:'Comece por um uniforme'}),presets,el('h4',{text:'Escolha suas cores'}),palette,colors);
  panels.layers.append(library,icon,button('Adicionar camada',()=>add(icon.querySelector('select').value),'secondary'),counter,layers,controls);
  panels.drawing.append(el('h4',{text:'Desenhe a sua marca'}),note('Use o pincel sobre o avatar circular. Cada traço vira uma camada que você pode colorir, transformar e espelhar.'),ink,brush,el('label',{class:'skin-mirror-toggle'},[mirror,el('span',{text:'Desenho simétrico'})]),button('Usar pincel',()=>{tool.value='DRAW';canvas.dataset.tool='DRAW';canvas.focus();},'secondary'),note('Para apagar, selecione “Apagar camada” e toque no traço. Camadas bloqueadas ficam protegidas.'),importDesign,upload,exportDesign);
  const preview=el('div',{class:'skin-preview'},[el('small',{class:'skin-preview-label',text:'SEU AVATAR'}),canvas,tools,el('div',{class:'skin-grid-options'},[el('label',{},[grid,el('span',{text:'Mostrar grade'})]),el('label',{},[snap,el('span',{text:'Encaixar na grade'})])]),hint,el('div',{class:'skin-tools'},[undo,redo,exportImage]),el('small',{class:'skin-preview-label',text:'COMO FICA EM CAMPO'}),fieldCanvas]);
  box.append(preview,el('div',{class:'skin-customization'},[tabs,...Object.values(panels)]));
  tool.onchange=()=>{if(tool.value==='DRAW')activate('drawing');render();};grid.onchange=paint;snap.onchange=()=>{if(snap.checked){grid.checked=true;paint();}};
  function position(e){const rect=canvas.getBoundingClientRect();return {x:(e.clientX-rect.left)/rect.width*320,y:(e.clientY-rect.top)/rect.height*320,rect};}
  function point(pos){const round=v=>Math.round(clamp(v,-1,1)*1000)/1000;let x=(pos.x-160)/radius,y=(pos.y-160)/radius;if(snap.checked){x=Math.round(x*8)/8;y=Math.round(y*8)/8;}return [round(x),round(y)];}
  function hit(pos,l){if(l.visible===false)return false;const dx=(pos.x-160)/radius-l.x,dy=(pos.y-160)/radius-l.y,a=-l.rotation*Math.PI/180;const x=(dx*Math.cos(a)-dy*Math.sin(a))/(l.scale*(l.scaleX??1)*(l.flipX?-1:1)),y=(dx*Math.sin(a)+dy*Math.cos(a))/(l.scale*(l.scaleY??1));if(l.icon!=='DRAW')return Math.hypot(x,y)<=1;if(l.points.length===1)return (l.mirrorDraw?[x,-x]:[x]).some(x=>Math.hypot(x-l.points[0][0],y-l.points[0][1])<l.brush/2+.04);return (l.mirrorDraw?[x,-x]:[x]).some(x=>l.points.some((b,i)=>{if(!i)return false;const a=l.points[i-1],dx=b[0]-a[0],dy=b[1]-a[1],t=clamp(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t)<l.brush/2+.04;}));}
  canvas.onpointerdown=e=>{
   if(e.button!==undefined&&e.button!==0)return;const pos=position(e);if(Math.hypot(pos.x-160,pos.y-160)>radius)return;const before=JSON.stringify(design);
   if(tool.value==='DRAW'){try{capacity();if(pointCount()>=schema.maxDrawingPoints)throw Error('Limite de pontos atingido. Remova um traço para continuar.');design.layers.push({icon:'DRAW',color:ink.querySelector('input').value,x:0,y:0,scale:1,rotation:0,brush:+brush.querySelector('input').value,points:[point(pos)],...(mirror.checked?{mirrorDraw:true}:{})});selected=design.layers.length-1;drag={id:e.pointerId,drawing:true,before};}catch(error){hint.textContent=error.message;return;}}
   else{selected=-1;for(let i=design.layers.length-1;i>=0;i--)if(hit(pos,design.layers[i])){selected=i;break;}if(selected<0){render();return;}const l=design.layers[selected];activate('layers');if(l.locked){hint.textContent='Desbloqueie a camada para mover ou apagar.';render();return;}if(tool.value==='ERASE'){change(()=>{design.layers.splice(selected,1);selected=-1;});return;}drag={id:e.pointerId,x:e.clientX,y:e.clientY,ox:l.x,oy:l.y,w:pos.rect.width,h:pos.rect.height,before};}
   e.preventDefault();canvas.focus();canvas.setPointerCapture(e.pointerId);render();
  };
  canvas.onpointermove=e=>{
   if(!drag||e.pointerId!==drag.id)return;const l=design.layers[selected];
   if(drag.drawing){const p=point(position(e)),last=l.points.at(-1);if(Math.hypot(p[0]-last[0],p[1]-last[1])<.015)return;if(l.points.length>=schema.maxStrokePoints)l.points=l.points.filter((_,i)=>i%2===0||i===l.points.length-1);if(pointCount()>=schema.maxDrawingPoints){hint.textContent='Limite de pontos atingido. Termine ou remova um traço.';return;}l.points.push(p);}
   else{l.x=clamp(drag.ox+(e.clientX-drag.x)/(drag.w*.43),-1,1);l.y=clamp(drag.oy+(e.clientY-drag.y)/(drag.h*.43),-1,1);if(snap.checked){l.x=Math.round(l.x*8)/8;l.y=Math.round(l.y*8)/8;}for(const k of ['x','y'])controls.querySelector('[name='+k+']').value=l[k];}paint();
  };
  canvas.onpointerup=e=>{if(drag&&e.pointerId===drag.id){drag=null;commit();render();}};
  canvas.onpointercancel=e=>{if(drag&&e.pointerId===drag.id){design=JSON.parse(drag.before);drag=null;selected=Math.min(selected,design.layers.length-1);sync();render();}};
  canvas.onlostpointercapture=canvas.onpointercancel;
  canvas.onkeydown=e=>{if(selected<0||design.layers[selected].locked)return;if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();change(()=>{design.layers.splice(selected,1);selected=-1;});return;}if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const l=design.layers[selected],key=e.key==='ArrowLeft'||e.key==='ArrowRight'?'x':'y',step=(snap.checked?.125:e.shiftKey?.1:.01)*(e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:1);change(()=>l[key]=clamp(l[key]+step,-1,1));};
  box.addEventListener('keydown',e=>{if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||!(e.ctrlKey||e.metaKey))return;if(e.key.toLowerCase()==='z'){e.preventDefault();restore(e.shiftKey?1:-1);}else if(e.key.toLowerCase()==='y'){e.preventDefault();restore(1);}});
  activate('models');render();return {node:box,value:()=>schema.validate(design),load(next){design=schema.validate(next);selected=-1;history=[JSON.stringify(design)];cursor=0;sync();render();}};
 }
 root.MaxballSkinEditor={editor};
 root.MaxballViews.skins=async portal=>{
  const schema=root.MaxballSkinDesign;const [skins,clubs]=await Promise.all([portal.api('/skins'),portal.api('/clubs')]),edit=editor(),name=field('Nome da skin','name','text','Minha skin',{minlength:3,maxlength:30,required:''}),list=card('Sua coleção');list.classList.add('skin-collection');let current=null,baseline=null,pendingKey=null,pendingPayload=null;const cost=note('');const updateCost=()=>{const q=schema.quote(baseline,{name:name.querySelector('input').value.trim(),design:edit.value()});cost.textContent=q.price+' gemas para salvar / '+(baseline?q.changes+' propriedades alteradas':'nova skin')+'. Prévia gratuita. Cada propriedade alterada custa '+schema.pricing.perChange+' gemas.';};
  const save=button('Salvar skin',async()=>{if(!name.querySelector('input').reportValidity())return;const values={name:name.querySelector('input').value.trim(),design:edit.value()},payload=JSON.stringify({current,...values});if(payload!==pendingPayload){pendingPayload=payload;pendingKey=crypto.randomUUID();}save.disabled=true;try{await portal.api(current?'/skins/'+current:'/skins',current?'PATCH':'POST',{...values,requestId:pendingKey});await portal.refreshAccount?.();await portal.open('skins');}finally{save.disabled=false;}});
  const owned=clubs.filter(c=>c.ownerId===portal.account.user.id),apply=el('div',{class:'skin-apply'});
  if(owned.length){const choice=select('Usar no meu clube','applyClub',owned.map(c=>[c.id,c.name]),owned[0].id);apply.append(choice,button('Aplicar ao clube',async()=>{const design=edit.value();if(!baseline||schema.quote(baseline,{name:baseline.name,design}).price){portal.status('Salve a skin e pague as gemas antes de aplicar ao clube.');return;}const c=await portal.api('/clubs/'+choice.querySelector('select').value);await portal.api('/clubs/'+c.id,'PATCH',{name:c.name,visibility:c.visibility,primaryColor:design.primaryColor,secondaryColor:design.secondaryColor,accentColor:design.accentColor,kitStyle:design.kitStyle,design});portal.status('Uniforme aplicado a '+c.name+'. Ele aparecerá nas partidas do clube.');},'secondary'));}else apply.append(note('Crie um clube para usar sua skin nas partidas.'),button('Criar meu clube',()=>portal.open('clubs'),'secondary'));
  const gallery=el('div',{class:'skin-gallery'});for(const s of skins){const c=el('canvas',{width:96,height:96});root.MaxballGame.teamSkin(c,{...s.design,design:s.design,name:s.name});gallery.append(el('article',{class:'skin-saved'},[c,el('strong',{text:s.name}),button('Editar',()=>{current=s.id;baseline=s;name.querySelector('input').value=s.name;edit.load(s.design);updateCost();save.textContent='Salvar alterações';edit.node.scrollIntoView({behavior:'smooth',block:'start'});},'secondary'),button('Criar cópia',()=>{current=null;baseline=null;name.querySelector('input').value=(s.name+' cópia').slice(0,30);edit.load(s.design);updateCost();save.textContent='Salvar cópia';},'secondary')]));}list.append(gallery);if(!skins.length)list.append(note('As skins que você salvar aparecerão aqui.'));
  for(const event of ['input','change','click','pointerup','keydown'])edit.node.addEventListener(event,()=>queueMicrotask(updateCost));name.addEventListener('input',updateCost);updateCost();
  portal.content.append(card('Estúdio de skins',note('Dê ao seu clube uma identidade: uniforme circular, símbolos e desenhos feitos por você.'),name,edit.node,cost,el('div',{class:'skin-save-actions'},[save,button('Criar outra skin',()=>portal.open('skins'),'secondary')]),apply),list);
 };
})(globalThis);
