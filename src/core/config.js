(function(root){
 const config=Object.freeze({
  physics:Object.freeze({playerRadius:20,playerMass:3,playerMaxSpeed:140,botMaxSpeeds:Object.freeze([123,132,140]),playerAcceleration:22,playerDeceleration:24,playerTurnResponse:30,playerOutsideMargin:70,ballMass:1.8,ballMaxSpeed:400,ballFriction:.38,ballDamping:.04,wallRestitution:.65,postRestitution:.48,postRadius:6,contactRestitution:.06,contactMaxPushSpeed:132,shotImpulse:350,passImpulse:275,passMinSpeed:250,passMaxSpeed:310,kickCooldown:.3,kickReach:12,kickBuffer:.12,recontactProtection:.12,contactIterations:8}),
  field:Object.freeze({areaDepth:200,areaPadding:100,centerRadius:105}),
  input:Object.freeze({deadzone:.08}),
  match:Object.freeze({introSeconds:10.2,entrySeconds:5,goalCelebrationSeconds:1.6,goalPauseSeconds:6.2,extraTimeSeconds:60,penaltySeconds:8,penaltyFlightSeconds:3,penaltyPauseSeconds:1.2}),
  ai:Object.freeze({formationWidth:240,formationDepth:210,minTeammateDistance:90,attackSupportDistance:135,defensiveSupportDistance:100,decisionInterval:.1,switchChaserCooldown:.65,switchAdvantage:40,pressDistance:260,debug:false}),
  ranked:Object.freeze({initialRating:1000,kFactor:32,ranges:Object.freeze([{seconds:0,difference:100},{seconds:10,difference:200},{seconds:20,difference:400}]),reconnectSeconds:20})
 });
 if(typeof module!=='undefined')module.exports=config;else root.MaxballConfig=config;
})(globalThis);
