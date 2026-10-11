(function(root){
 const config=Object.freeze({
  physics:Object.freeze({
   // World units: the entire visible disc, including its rim, is 40 units wide.
   playerRadius:20,ballRadius:20*.42,playerMass:3,ballMass:1.8,
   playerMaxSpeed:180,botMaxSpeeds:Object.freeze([158,170,180]),
   playerAcceleration:36,playerTurnResponse:48,inputEpsilon:.01,
   playerOutsideMargin:70,
   // Velocities: player 4.5, full pass 8.5, shot 17 player diameters/second.
   shotImpulse:680,passImpulse:340,passMinSpeed:170,passMaxSpeed:440,ballMaxSpeed:816,
   ballFriction:.65,ballRollingResistance:12,
   wallRestitution:.65,postRestitution:.48,postRadius:6,
   contactRestitution:.22,contactMaxPushSpeed:170,contactResponse:24,contactIterations:8,
   kickCooldown:.18,kickReach:1,kickBuffer:.12,
   kickMomentum:.1,kickTangentRetention:.2,kickTangentLimit:.15
  }),
  field:Object.freeze({areaDepth:200,areaPadding:100,centerRadius:105}),
  input:Object.freeze({deadzone:.08}),
  match:Object.freeze({introSeconds:17.7,entrySeconds:5,goalCelebrationSeconds:1.6,goalPauseSeconds:6.2,extraTimeSeconds:60,penaltySeconds:8,penaltyFlightSeconds:3,penaltyPauseSeconds:1.2}),
  ai:Object.freeze({formationWidth:240,formationDepth:210,minTeammateDistance:90,attackSupportDistance:135,defensiveSupportDistance:100,decisionInterval:.1,switchChaserCooldown:.65,switchAdvantage:40,pressDistance:260,debug:false}),
  ranked:Object.freeze({initialRating:1000,kFactor:32,ranges:Object.freeze([{seconds:0,difference:100},{seconds:10,difference:200},{seconds:20,difference:400}]),reconnectSeconds:20})
 });
 if(typeof module!=='undefined')module.exports=config;else root.MaxballConfig=config;
})(globalThis);
