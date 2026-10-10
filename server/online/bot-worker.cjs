const {parentPort}=require('node:worker_threads');
const {Tactics}=require('../../src/ai/tactics.js');
const games=new Map();
parentPort.on('message',job=>{
 if(job.type==='remove'){games.delete(job.id);return;}
 if(job.type!=='think')return;
 const started=performance.now();try{
  let game=games.get(job.id);if(!game){game={state:job.state};let seed=job.seed>>>0;game.brain=new Tactics(()=>game.state,()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;});games.set(job.id,game);}game.state=job.state;
  // Command keys refer to the current snapshot, never to the previous clone.
  game.brain.commands.clear();game.brain.time+=job.dt;game.brain.decide();
  parentPort.postMessage({type:'commands',processingMs:performance.now()-started,id:job.id,sequence:job.sequence,epoch:job.epoch,players:game.state.P.filter(p=>p.ctrl==='ai').map(p=>({id:p.id,command:game.brain.command(p),role:p.role,currentState:p.currentState,primaryBallChaser:p.primaryBallChaser,targetPosition:p.targetPosition}))});
 }catch(error){parentPort.postMessage({type:'error',id:job.id,sequence:job.sequence,epoch:job.epoch,message:error.message});}
});
