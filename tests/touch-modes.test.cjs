const test=require('node:test'),assert=require('node:assert/strict'),{Element,Target}=require('./helpers.cjs'),{bindJoystick}=require('../src/input/pointerControls.js');
test('floating and follow joystick track the finger; off cancels movement',t=>{
 const previous=global.MaxballPreferences;let mode='floating';global.MaxballPreferences={get:()=>({joystick:mode})};t.after(()=>{global.MaxballPreferences=previous;});
 const host=new Target(),joy=new Element(),knob=new Element(),value={x:0,y:0};joy.style.left='20px';joy.style.top='30px';joy.getBoundingClientRect=()=>({left:0,top:0,width:100,height:100});bindJoystick(joy,knob,value,host);
 joy.onpointerdown({pointerId:1,clientX:150,clientY:250});assert.equal(value.x,0);assert.equal(joy.style.left,'150px');host.dispatch('pointermove',{pointerId:1,clientX:182,clientY:250});assert.equal(value.x,1);host.dispatch('pointerup',{pointerId:1});assert.equal(value.x,0);assert.equal(joy.style.left,'20px');
 mode='follow';host.dispatch('maxball-preferences',{});joy.onpointerdown({pointerId:2,clientX:150,clientY:250});host.dispatch('pointermove',{pointerId:2,clientX:250,clientY:250});assert.equal(joy.style.left,'218px');assert.equal(value.x,1);
 mode='off';host.dispatch('maxball-preferences',{});assert.equal(value.x,0);assert.equal(joy.style.visibility,'hidden');joy.onpointerdown({pointerId:3,clientX:500,clientY:250});assert.equal(value.x,0);
});
