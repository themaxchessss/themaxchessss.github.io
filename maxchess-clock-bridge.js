/* Call MaxChessClockBridge.moveMade("white"|"black") only after a legal move is confirmed. */
(function(){
  const name="maxchess-live-clock-v1";let channel=null;
  try{if("BroadcastChannel" in window)channel=new BroadcastChannel(name)}catch(_e){}
  function send(message){let sent=false;try{if(channel){channel.postMessage(message);sent=true}}catch(_e){}try{localStorage.setItem(name,JSON.stringify(message));sent=true}catch(_e){}return sent}
  window.MaxChessClockBridge={
    gameStarted:function(seconds,bonus){return send({type:"game-start",seconds:Number(seconds)||600,bonus:Number(bonus)||0,at:Date.now()})},
    moveMade:function(color){
      if(color!=="white"&&color!=="black")return false;
      return send({type:"legal-move",moved:color,at:Date.now()})
    },
    channelName:name
  };
})();