const GA = {
  sendEvent(category, action, label) {
    if (!window.ga) {
      return;
    }
    window.ga('send', 'event', category, action, label);
    // eslint-disable-next-line no-console
    console.log('GA send event: ', category, action, label);
  },
};

export default GA;
