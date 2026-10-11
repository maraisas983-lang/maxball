(function(root){
 'use strict';
 const {el,button,note}=root.MaxballUI;
 let chatKind='players',opened=false,channel=null,muted=new Set(),seen=new Set(),list,input,connection='Conectando…',status,overlay,emotePanel,lastLocalEmote=-Infinity,previewScope=null;
 const bubbles=new Map(),game=document.querySelector('#game');
 const preview=el('span',{class:'match-chat-preview',text:'Chat da partida'});
 function showPreview(m){preview.replaceChildren(el('strong',{text:m.name+': '}),el('span',{text:m.body}));}
 function append(m){
  if(!list||seen.has(m.id)||muted.has(m.user_id))return;
  seen.add(m.id);const near=list.scrollHeight-list.scrollTop-list.clientHeight<60,row=el('div',{class:'chat-row'},[el('time',{text:new Date(m.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}),el('strong',{text:m.name+': '}),el('span',{text:m.body})]);
  if(m.user_id&&m.user_id!==root.MaxballPortal.account?.user.id)row.append(button('Silenciar',async()=>{const result=await root.MaxballPortal.api('/chat/mute','POST',{playerId:m.user_id,muted:true});muted=new Set(result.mutes);if(chatKind==='coaches')await load();else paint(result.messages);},'secondary'));
  list.append(row);while(list.children.length>100)list.firstChild.remove();if(near)list.scrollTop=list.scrollHeight;
  if(chatKind==='players'&&overlay?.classList.contains('match-chat'))showPreview(m);
 }
 function paint(messages){list?.replaceChildren();seen=new Set();messages.forEach(append);}
 async function load(){
  const portal=root.MaxballPortal;if(!portal.account){if(status){status.hidden=false;status.textContent='Entre na conta para conversar online.';}return;}
  portal.connection.connect();const targetList=list,kind=chatKind,data=await portal.api('/chat?channel='+kind);if(list!==targetList||chatKind!==kind)return;channel=data.room;muted=new Set(data.mutes);paint(data.messages);if(status)status.textContent=connection;
 }
 function widget(compact=false){
  list=el('div',{class:'chat-history','aria-live':'polite',role:'log'});input=el('input',{type:'text',maxlength:240,placeholder:'Escreva uma mensagem…','aria-label':'Mensagem',autocomplete:'off'});status=note(connection);status.classList.add('chat-status');status.hidden=compact;
  const field=input,send=async()=>{if(!field.value.trim())return;const message=await root.MaxballPortal.api('/chat','POST',{message:field.value,channel:chatKind});field.value='';if(input===field)append(message);};
  const form=el('form',{class:'chat-compose'},[input,el('button',{type:'submit',class:'action primary',text:'Enviar'})]);form.onsubmit=e=>{e.preventDefault();send().catch(error=>{if(status){status.hidden=false;status.textContent=error.message;}});};
  return el('section',{class:'live-chat'},[status,list,form,compact?null:note('Até 240 caracteres · 3 mensagens a cada 5 segundos')]);
 }
 function closeEmotes(){emotePanel?.remove();emotePanel=null;emoteToggle.setAttribute('aria-expanded','false');}
 function close(){opened=false;overlay?.remove();overlay=null;list=null;input=null;status=null;closeEmotes();toggle.setAttribute('aria-expanded','false');root.MaxballGame.resetInputs();}
 async function open(kind='players',container){
  close();chatKind=kind;opened=true;root.MaxballGame.resetInputs();const compact=!container||container===game||!!container.closest('#game')&&!container.classList.contains('locker-experience');
  const dismiss=button('×',close,'secondary');dismiss.setAttribute('aria-label','Fechar chat');
  overlay=el('aside',{class:'game-chat'+(compact?' match-chat':''),'aria-label':kind==='coaches'?'Chat dos técnicos':'Chat da partida'},[el('header',{class:'chat-heading'},[el('strong',{text:kind==='coaches'?'Chat dos técnicos':compact?'Chat':container?.classList.contains('locker-experience')?'Chat do vestiário':'Chat da sala'}),dismiss]),widget(compact)]);
  if(container&&!container.closest('#game')&&!container.classList.contains('locker-experience'))overlay.classList.add('room-chat-popup');
  (container||game).append(overlay);toggle.setAttribute('aria-expanded','true');input.focus();try{await load();}catch(e){if(status){status.hidden=false;status.textContent=e.message;}}
 }
 async function openEmotes(container=game,onUse=null){
  if(emotePanel){closeEmotes();return;}if(opened)close();
  const panel=el('aside',{id:'game-emote-picker','aria-label':'Seus emotes'}),info=note('Carregando…'),grid=el('div',{class:'emote-grid'}),dismiss=button('×',closeEmotes,'secondary');dismiss.setAttribute('aria-label','Fechar emotes');
  panel.append(el('header',{class:'chat-heading'},[el('strong',{text:'Seus emotes'}),dismiss]),info,grid);emotePanel=panel;container.append(panel);emoteToggle.setAttribute('aria-expanded','true');
  try{
   const account=root.MaxballPortal.account,items=account?(await root.MaxballPortal.api('/inventory')).filter(i=>i.category==='EMOTE'):[root.MaxballEmotes[0]];
   if(emotePanel!==panel)return;info.textContent=items.length?'':'Você ainda não possui emotes.';info.hidden=!!items.length;
   for(const item of items){const e=root.MaxballEmotes[item.asset_index];if(!e)continue;const b=button(e.emoji,async()=>{
    if(onUse)await onUse(e.emoji);
    else if(root.MaxballGame.remote)await root.MaxballPortal.api('/emotes/use','POST',{itemId:item.id});
    else{const now=performance.now();if(now-lastLocalEmote<3000)throw Error('Aguarde para usar outro emote.');const p=root.MaxballGame.state()?.P.find(p=>p.ctrl==='p1');if(!p)throw Error('Entre em campo para usar emotes.');lastLocalEmote=now;bubbles.set(p.id,{emoji:e.emoji,until:now+2500});}
    closeEmotes();
   },'secondary');b.setAttribute('aria-label',e.name);grid.append(b);}
  }catch(e){if(emotePanel===panel)info.textContent=e.message;}
 }
 root.MaxballViews.chat=async portal=>{close();chatKind='players';portal.content.append(widget());await load();portal.onLeave(()=>{list=null;input=null;status=null;});};
 root.MaxballViews.coachChat=async portal=>{close();chatKind='coaches';portal.content.append(el('h2',{text:'Chat dos técnicos'}),widget());await load();portal.onLeave(()=>{list=null;input=null;status=null;chatKind='players';});};
 document.addEventListener('keydown',e=>{
  if(e.code==='Escape'&&(opened||emotePanel)){e.preventDefault();e.stopImmediatePropagation();if(opened)close();else closeEmotes();return;}
  if(!e.repeat&&!e.target.isContentEditable&&!/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)&&document.querySelector('#game.on')){
   if(e.code==='KeyT'&&!opened){e.preventDefault();e.stopImmediatePropagation();open('players',root.MaxballExperience?.isOpen?root.MaxballExperience.root:undefined);}
  }
 },true);
 const toggle=button('Chat',()=>opened?close():open(),'secondary');toggle.id='game-chat-toggle';toggle.setAttribute('aria-label','Abrir chat (T)');toggle.setAttribute('aria-expanded','false');
 const emoteToggle=button('☺',openEmotes,'secondary');emoteToggle.id='game-emote-toggle';emoteToggle.setAttribute('aria-label','Abrir seus emotes');emoteToggle.setAttribute('aria-expanded','false');
 const dock=el('div',{id:'match-social-dock'},[emoteToggle,toggle]);toggle.append(preview);game.append(dock);
 root.MaxballSocial={open:container=>open('players',container),openCoach:container=>open('coaches',container),openEmotes,get isOpen(){return opened;},close,status(value){connection=value;if(status)status.textContent=value;},receive(message){
  if(message.type==='chat'){
   const m=message.message;if(m.room_id===channel)append(m);
   const room=root.MaxballOfficials?.currentRoom?.id||'lobby';if(m.room_id===room&&!muted.has(m.user_id))showPreview(m);
  }
  if(message.type==='emote')bubbles.set(message.playerId,{emoji:message.emoji,until:performance.now()+2500});
  if(message.type==='room'&&opened&&message.room.id!==channel?.replace(/:coaches$/,''))load().catch(root.MaxballPortal.error);
 },draw(ctx,players){
  const scope=root.MaxballGame.remote?(root.MaxballOfficials?.currentRoom?.id||'lobby'):'local';if(previewScope!==scope){previewScope=scope;preview.textContent='Chat da partida';bubbles.clear();}
  const now=performance.now();for(const [uid,b] of bubbles){if(b.until<=now){bubbles.delete(uid);continue;}const p=players.find(p=>p.id===uid);if(!p)continue;ctx.font='26px sans-serif';ctx.textAlign='center';ctx.fillText(b.emoji,p.x,p.y-42);}
 }};
})(globalThis);
