/* Call MaxChessClockBridge.moveMade("white"|"black") only after a legal move is confirmed. */
(function(){
  const name="maxchess-live-clock-v1";let channel=null;
  try{if("BroadcastChannel" in window)channel=new BroadcastChannel(name)}catch(_e){}
  function send(message){try{if(channel){channel.postMessage(message);return true}localStorage.setItem(name,JSON.stringify(message));return true}catch(_e){return false}}
  window.MaxChessClockBridge={
    gameStarted:function(){return send({type:"game-start",at:Date.now()})},
    moveMade:function(color){
      if(color!=="white"&&color!=="black")return false;
      return send({type:"legal-move",moved:color,at:Date.now()})
    },
    channelName:name
  };
})();