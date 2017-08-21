
const GA = {
  sendEvent: function(category, action, label) {
    if (!window.ga) { return; }
    console.log('GA send event: ', category, action, label);
    window.ga('send', 'event', category, action, label);    
  }    
};

export default GA;

