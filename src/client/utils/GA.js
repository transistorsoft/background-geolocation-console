
const GA = {
  sendEvent: function (category, action, label) {
    if (!window.ga) { return; }
    window.ga('send', 'event', category, action, label);
    console.log('GA send event: ', category, action, label);
  },
};

export default GA;
