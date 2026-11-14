/* Call MaxChessClockBridge.moveMade("white"|"black") only after a legal move is confirmed. */
(function(){
  const name="maxchess-live-clock-v1";let channel=null;
  try{if("BroadcastChannel" in window)channel=new BroadcastChannel(name)}catch(_e){}
  window.MaxChessClockBridge={
    moveMade:function(color){
      if(color!=="white"&&color!=="black")return false;
      const message={type:"legal-move",moved:color,at:Date.now()};
      try{if(channel)channel.postMessage(message);else localStorage.setItem(name,JSON.stringify(message));return true}catch(_e){return false}
    },
    channelName:name
  };
})();