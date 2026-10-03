(function(root){
 'use strict';
 const config=(typeof module!=='undefined'?require('../core/config.js'):root.MaxballConfig).physics;
 // The ring is the exact maximum distance between player and ball centres.
 let lastW,lastH,lastBR,lastRadius;
 function radius(state){if(lastW===state.W&&lastH===state.H&&lastBR===(state.BR||11))return lastRadius;lastW=state.W;lastH=state.H;lastBR=state.BR||11;const scale=Math.sqrt(state.W*state.H/(1000*560));return lastRadius=config.playerRadius+(state.BR||11)+Math.max(2,Math.min(5,3*scale));}
 function contains(player,ball,state){const r=radius(state);return (ball.x-player.x)**2+(ball.y-player.y)**2<=r*r;}
 const api={radius,contains};if(typeof module!=='undefined')module.exports=api;else root.MaxballInteraction=api;
})(globalThis);
