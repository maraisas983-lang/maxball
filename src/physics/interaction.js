(function(root){
 'use strict';
 const config=(typeof module!=='undefined'?require('../core/config.js'):root.MaxballConfig).physics;
 // The visible area extends 10.25% beyond the disc (two 5% increases).
 // A kick reaches the ball when
 // its physical edge intersects that area; the ball hitbox is not inflated.
 function areaRadius(){return config.playerRadius+config.kickReach;}
 function radius(state){return areaRadius()+(state.BR??config.ballRadius);}
 function contains(player,ball,state){const r=radius(state);return (ball.x-player.x)**2+(ball.y-player.y)**2<=r*r;}
 const api={areaRadius,radius,contains};if(typeof module!=='undefined')module.exports=api;else root.MaxballInteraction=api;
})(globalThis);
