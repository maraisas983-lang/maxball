const test=require('node:test'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const {createApp}=require('../server/app.cjs'),{createSocial}=require('../server/services/social.cjs'),{read}=require('./helpers.cjs');
test('owned unequipped emotes use a separate event, reject foreign items and preserve slot compatibility',async t=>{
 const app=createApp({databasePath:':memory:',logger:{warn(){},error(){}}});t.after(()=>app.close());const {user}=await app.auth.register({username:'emote_owner',password:'emote-password-123'});
 app.db.transaction(()=>app.economy.change(user.id,100,'ADMIN_GRANT','emote-test','emote-test'));app.economy.purchase(user.id,{itemId:'emote-1',requestId:'emote-owned'});
 const events=[],social=createSocial(app.db,{current:()=>({id:'room',players:[user]}),socialBroadcast:(_,e)=>events.push(e)},app.auth);
 assert.equal(social.slots(user.id).some(e=>e.id==='emote-1'),false);
 assert.throws(()=>social.use(user,{itemId:'emote-2'}),e=>e.code==='EMOTE_OWNERSHIP');assert.throws(()=>social.use(user,{itemId:'ball-0'}),e=>e.code==='EMOTE_OWNERSHIP');assert.throws(()=>social.use(user,{itemId:'emote-1',slot:0}));
 social.use(user,{itemId:'emote-1'});assert.equal(events.at(-1).type,'emote');assert.equal(events.at(-1).emoji,'🔥');assert.equal(social.history(user.id).messages.length,0);assert.throws(()=>social.use(user,{slot:0}),e=>e.code==='EMOTE_RATE');
 const legacy=createSocial(app.db,{current:()=>({id:'room',players:[user]}),socialBroadcast:(_,e)=>events.push(e)},app.auth);legacy.use(user,{slot:0});assert.equal(events.at(-1).type,'emote');
});
test('bottom chat contains only messages; the separate picker lists owned emotes and closes on use',async t=>{
 const dom=new JSDOM('<section id="game" class="on"></section>',{runScripts:'outside-only'}),w=dom.window;t.after(()=>w.close());const calls=[],p={id:'self',ctrl:'p1',x:50,y:50};
 w.MaxballViews={};w.MaxballGame={resetInputs(){},remote:true,state:()=>({P:[p]})};w.MaxballOfficials={currentRoom:{id:'room'}};
 w.MaxballPortal={account:{user:{id:'self'}},connection:{connect(){}},error(e){throw e;},async api(url,method,body){calls.push({url,method,body});if(url==='/inventory')return [{id:'emote-1',category:'EMOTE',asset_index:1},{id:'ball-0',category:'BALL',asset_index:0}];if(url.startsWith('/chat?'))return {room:'room',mutes:[],messages:[]};return {ok:true};}};
 for(const f of ['src/ui/components.js','src/data/emotes.js','src/ui/socialView.js'])w.eval(read(f));
 await w.MaxballSocial.open();assert.ok(w.document.querySelector('.match-chat form'));assert.equal(w.document.querySelector('.game-chat .emote-bar'),null);assert.equal(w.MaxballSocial.isOpen,true);
 w.MaxballSocial.receive({type:'chat',message:{id:'m',room_id:'room',user_id:'self',created_at:Date.now(),name:'Player',body:'<img src=x>'}});assert.match(w.document.querySelector('.match-chat-preview').textContent,/<img src=x>/);assert.equal(w.document.querySelector('.match-chat-preview img'),null);
 await w.MaxballSocial.openEmotes();assert.equal(w.document.querySelector('.game-chat'),null);assert.equal(w.MaxballSocial.isOpen,false);const buttons=w.document.querySelectorAll('.emote-grid button');assert.equal(buttons.length,1);assert.equal(buttons[0].textContent,'🔥');await buttons[0].onclick();assert.equal(w.document.querySelector('#game-emote-picker'),null);assert.equal(calls.at(-1).body.itemId,'emote-1');
 const locker=w.document.createElement('section');w.document.body.append(locker);let spoken=null;await w.MaxballSocial.openEmotes(locker,emoji=>{spoken=emoji;});assert.ok(locker.querySelector('#game-emote-picker'));await locker.querySelector('.emote-grid button').onclick();assert.equal(spoken,'🔥');assert.equal(locker.querySelector('#game-emote-picker'),null);assert.equal(calls.filter(c=>c.url==='/emotes/use').length,1);
});
