(function(root){
 const defaults=Object.freeze({offside:false,penaltyFouls:false,extraTime:false,penalties:false,penaltiesAfterExtraTime:false});
 function settings(value={},gold=false){
  const result={...defaults,...(gold?{extraTime:true,penalties:true,penaltiesAfterExtraTime:true}:{}),...value};
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!(k in defaults)))throw new Error('Configuração de regras inválida.');
  if(Object.values(result).some(v=>typeof v!=='boolean'))throw new Error('As regras devem estar ligadas ou desligadas.');
  result.penaltyFouls=false;
  if(result.penaltiesAfterExtraTime&&(!result.extraTime||!result.penalties))throw new Error('Pênaltis após prorrogação exigem prorrogação e pênaltis ligados.');
  return result;
 }
 function nextPeriod(r,period,tied){if(!tied)return 'FINISHED';if(period==='REGULATION'&&r.extraTime)return 'EXTRA_TIME';if(r.penalties&&(period==='REGULATION'||r.penaltiesAfterExtraTime))return 'PENALTIES';return 'FINISHED';}
 function shootoutWinner(score,taken){
  if(taken[0]<=5&&taken[1]<=5){if(score[0]>score[1]+5-taken[1])return 0;if(score[1]>score[0]+5-taken[0])return 1;}
  if(taken[0]>=5&&taken[1]>=5&&taken[0]===taken[1]&&score[0]!==score[1])return score[0]>score[1]?0:1;
  return null;
 }
 const api={settings,nextPeriod,shootoutWinner};if(typeof module!=='undefined')module.exports=api;else root.MaxballRules=api;
})(globalThis);
