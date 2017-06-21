import React from 'react';
import ReactDOM from 'react-dom';
import Viewport from './components/Viewport';
import {AppContainer} from 'react-hot-loader';

import {Provider} from 'react-redux';

import App from './components/App';

import store from './store';

require('./index.html');

const container = document.querySelector('#app-container');

const render = Component => {
  ReactDOM.render(
    <AppContainer>
      <Provider store={store}>
        <Viewport />
      </Provider>
    </AppContainer>
    , container
  );  
}

render(Viewport);

if (module.hot) {
  module.hot.accept('./components/Viewport', () => {
    render(Viewport);
  });
}

