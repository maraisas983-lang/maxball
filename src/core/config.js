(function(root){
 const config=Object.freeze({
  physics:Object.freeze({playerRadius:20,playerMaxSpeed:205,playerAcceleration:12,playerDeceleration:12,playerOutsideMargin:70,ballMaxSpeed:560,shotImpulse:420,passImpulse:260,contactIterations:8}),
  ai:Object.freeze({formationWidth:200,formationDepth:210,minTeammateDistance:76,attackSupportDistance:135,defensiveSupportDistance:100,decisionInterval:.1,switchChaserCooldown:.65,switchAdvantage:40,defensiveAreaDepth:150,defensiveAreaPadding:70,pressDistance:260,debug:false}),
  ranked:Object.freeze({initialRating:1000,kFactor:32,ranges:Object.freeze([{seconds:0,difference:100},{seconds:10,difference:200},{seconds:20,difference:400}]),reconnectSeconds:20})
 });
 if(typeof module!=='undefined')module.exports=config;else root.MaxballConfig=config;
})(globalThis);
