(function(root){
 const config=Object.freeze({
  physics:Object.freeze({
   // World units: the entire visible disc, including its rim, is 40 units wide.
   playerRadius:20,ballRadius:20*.42,playerMass:3,ballMass:1.8,
   playerMaxSpeed:150,botMaxSpeeds:Object.freeze([132,142,150]),
   playerAcceleration:36,playerTurnResponse:48,inputEpsilon:.01,
   playerOutsideMargin:70,
   // Measured in field units/second; calibrated against the smallest pitch.
   shotImpulse:360,passImpulse:280,passMinSpeed:220,passMaxSpeed:320,passArrivalSpeed:180,ballMaxSpeed:440,
   ballFriction:.65,ballRollingResistance:8,
   wallRestitution:.45,postRestitution:.32,postRadius:6,
   contactRestitution:.12,contactBounceThreshold:24,contactSlop:.0001,
   contactIterations:32,contactVelocityIterations:48,
   kickCooldown:.18,kickGlobalCooldown:.08,kickReach:1,kickBuffer:.12,
   dbWindow:.1,dbReach:30,
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
