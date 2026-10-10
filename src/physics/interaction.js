(function(root){
 'use strict';
 const config=(typeof module!=='undefined'?require('../core/config.js'):root.MaxballConfig).physics;
 // The ring is the exact maximum distance between player and ball centres.
 function radius(state){return config.playerRadius+(state.BR??config.ballRadius)+config.kickReach;}
 function contains(player,ball,state){const r=radius(state);return (ball.x-player.x)**2+(ball.y-player.y)**2<=r*r;}
 const api={radius,contains};if(typeof module!=='undefined')module.exports=api;else root.MaxballInteraction=api;
})(globalThis);
