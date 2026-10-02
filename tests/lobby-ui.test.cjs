const test=require('node:test'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom'),{read}=require('./helpers.cjs');
test('mouse and touch drag preserve origin, accept valid zones, cancel invalid drops and disconnects',async()=>{
 const dom=new JSDOM('<section class="scr"><div id="lobby"><section data-drop-zone="HOME"><div data-drag-player="a">Ana</div></section><section data-drop-zone="AWAY"></section><section data-drop-zone="SPECTATORS"></section></div></section>',{runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 try{
 const errors=[],moves=[];w.MaxballPortal={error:e=>errors.push(e)};w.eval(read('src/ui/roomDrag.js'));
 const lobby=w.document.querySelector('#lobby'),card=lobby.querySelector('[data-drag-player]');let hit=lobby.querySelector('[data-drop-zone=AWAY]');w.document.elementFromPoint=()=>hit;
 const stop=w.MaxballRoomDrag.bind(lobby,(id,zone)=>moves.push([id,zone]));
 const send=(target,type,pointerType='mouse',id=1)=>{const e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{pointerId:id,pointerType,clientX:100,clientY:100});target.dispatchEvent(e);};
 send(card,'pointerdown');assert.ok(card.classList.contains('drag-source'));assert.ok(w.document.querySelector('.drag-ghost'));assert.ok(hit.classList.contains('drop-active'));send(lobby,'pointerup');assert.deepEqual(moves,[['a','AWAY']]);assert.equal(w.document.querySelector('.drag-ghost'),null);
 hit=lobby.querySelector('[data-drop-zone=SPECTATORS]');send(card,'pointerdown','touch',2);send(lobby,'pointerup','touch',2);assert.deepEqual(moves.at(-1),['a','SPECTATORS']);
 send(card,'pointerdown','touch',3);hit=null;send(lobby,'pointerup','touch',3);assert.equal(moves.length,2);
 send(card,'pointerdown');send(lobby,'pointercancel');assert.equal(w.document.querySelector('.drag-ghost'),null);
 send(card,'pointerdown');stop();card.remove();send(lobby,'pointerup');assert.equal(moves.length,2);assert.deepEqual(errors,[]);
 }finally{w.close();}
});
