import React from 'react';
import ReactDOM from 'react-dom';
import Viewport from './components/Viewport';
import { AppContainer } from 'react-hot-loader';

import { Provider } from 'react-redux';
import { loadInitialData } from '~/reducer/dashboard';

import store from './store';

require('./index.html');

const container = document.querySelector('#app-container');

const render = () => {
  ReactDOM.render(
    <AppContainer>
      <Provider store={store}>
        <Viewport />
      </Provider>
    </AppContainer>,
    container
  );
};

store.dispatch(loadInitialData());
render();

if (module.hot) {
  module.hot.accept('./components/Viewport', () => {
    setImmediate(() => {
      ReactDOM.unmountComponentAtNode(container);
      render();
    });
  });
}
