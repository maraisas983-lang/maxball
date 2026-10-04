(function(root){
 function validate(players,spectators,changes){if(!Array.isArray(changes)||!changes.length||changes.length>10)throw new Error('Escolha de 1 a 10 substituições.');const out=new Set(),incoming=new Set();return changes.map(c=>{if(!c||typeof c.outId!=='string'||typeof c.inId!=='string'||out.has(c.outId)||incoming.has(c.inId))throw new Error('Cada jogador só pode participar de uma troca.');const p=players.find(p=>p.id===c.outId&&!p.inactive),q=spectators.find(p=>p.id===c.inId);if(!p||!q||p.id===q.id)throw new Error('A escalação mudou. Confira os jogadores e espectadores.');out.add(p.id);incoming.add(q.id);return {out:p,incoming:q};});}
 const api={validate};if(typeof module!=='undefined')module.exports=api;else root.MaxballSubstitutionPlan=api;
})(globalThis);
