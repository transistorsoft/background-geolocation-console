import React from 'react';
import ReactDOM from 'react-dom';
import Viewport from './components/Viewport';
import {AppContainer} from 'react-hot-loader';

import {Provider} from 'react-redux';

import App from './components/App';

let store = App.getInstance().getStore();

require('./index.html');

const container = document.querySelector('#app-container');

// Render app
ReactDOM.render(
  <AppContainer>
    <Provider store={store}>
      <Viewport />
    </Provider>
  </AppContainer>
  , container
);

if (module.hot) {
  module.hot.accept('./components/Viewport', () => {
    const HotLoadedApp = require('./components/Viewport')
    ReactDOM.render(
      <AppContainer>
        <Provider store={store}>
          <Viewport />
        </Provider>
      </AppContainer>, container
    );
  });
}

