(function(root){
 'use strict';
 let context,musicBus,effectsBus,noise,timer=null,step=0,next=0,background=false;
 const cooldown=new Map(),notes=[60,64,67,71,67,64,62,67,57,60,64,67,64,60,59,62];
 const prefs=()=>root.MaxballPreferences?.get()||{music:true,sound:true};
 function tone(frequency,start,duration,volume,type,bus,end){
  const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type=type;
  oscillator.frequency.setValueAtTime(frequency,start);if(end)oscillator.frequency.exponentialRampToValueAtTime(end,start+duration);
  gain.gain.setValueAtTime(.0001,start);gain.gain.linearRampToValueAtTime(volume,start+.008);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
  oscillator.connect(gain).connect(bus);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};oscillator.start(start);oscillator.stop(start+duration+.01);
 }
 function rustle(start,duration,volume,frequency){
  const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();source.buffer=noise;filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=.65;
  gain.gain.setValueAtTime(volume,start);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
  source.connect(filter).connect(gain).connect(effectsBus);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};source.start(start);source.stop(start+duration);
 }
 function update(){
  if(!context)return;const p=prefs(),silent=background||document.hidden;
  musicBus.gain.setTargetAtTime(p.music&&!silent?1:0,context.currentTime,.04);effectsBus.gain.setTargetAtTime(p.sound&&!silent?1:0,context.currentTime,.015);
  if(silent){if(timer!==null)clearInterval(timer);timer=null;context.suspend()?.catch(()=>{});return;}
  if(timer===null)timer=setInterval(schedule,100);
 }
 function unlock(){
  if(background||document.hidden)return context;
  try{if(!context){context=new (root.AudioContext||root.webkitAudioContext)();musicBus=context.createGain();effectsBus=context.createGain();musicBus.connect(context.destination);effectsBus.connect(context.destination);noise=context.createBuffer(1,context.sampleRate*.4,context.sampleRate);const data=noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;}
   context.resume()?.catch(()=>{});update();
  }catch{}return context;
 }
 function schedule(){
  if(!context||context.state!=='running'||background||document.hidden||!prefs().music){next=0;return;}
  const now=context.currentTime;if(next<now)next=now+.02;
  while(next<now+.15){const playing=!!document.querySelector('#game.on'),volume=playing?.009:.022,note=notes[step%notes.length];
   tone(440*Math.pow(2,(note-69)/12),next,.27,volume,'sine',musicBus);
   if(step%4===0)tone(440*Math.pow(2,((step%16<8?36:33)-69)/12),next,.55,volume*.9,'triangle',musicBus);
   step++;next+=.3;
  }
 }
 function effect(kind){
  if(!context||context.state!=='running'||background||document.hidden||!prefs().sound)return;
  const t=context.currentTime;if(t-(cooldown.get(kind)??-10)<(kind==='click'?.045:.09))return;cooldown.set(kind,t);
  if(kind==='click')tone(850,t,.055,.035,'sine',effectsBus,540);
  else if(kind==='net'){rustle(t,.32,.22,2300);rustle(t+.055,.2,.1,950);}
  else {tone(kind==='pass'?190:135,t,.13,kind==='pass'?.1:.2,'sine',effectsBus,48);rustle(t,.06,.12,800);}
 }
 function pause(){background=true;update();}
 function resume(){background=false;unlock();}
 document.addEventListener('pointerdown',unlock,{passive:true});document.addEventListener('keydown',unlock);
 document.addEventListener('click',event=>{if(event.target.closest?.('button,[role="button"],a,input[type="checkbox"],input[type="radio"]')){unlock();effect('click');}});
 document.addEventListener('visibilitychange',()=>document.hidden?pause():resume());
 root.addEventListener('maxball:native-pause',pause);root.addEventListener('maxball:native-resume',resume);
 root.addEventListener('maxball-preferences',update);
 root.MaxballAudio={unlock,effect,pause,resume};
})(globalThis);
