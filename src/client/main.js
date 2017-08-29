import React from 'react';
import ReactDOM from 'react-dom';
import Viewport from './components/Viewport';
import { AppContainer } from 'react-hot-loader';

import { Provider } from 'react-redux';
import { loadInitialData } from '~/reducer/dashboard';

import store from './store';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

const locationHash = (location.hash || '').substring(1);
if (locationHash) {
  window.location = '/' + locationHash;
}

const container = document.querySelector('#app-container');

const WrappedViewport = ({ match }) => {
  store.dispatch(loadInitialData(match.params.token));
  return <Viewport />;
};

const render = () => {
  ReactDOM.render(
    <AppContainer>
      <Provider store={store}>
        <Router>
          <div>
            <Switch>
              <Route path='/:token' component={WrappedViewport} />
              <Route path='/' component={WrappedViewport} />
            </Switch>
          </div>
        </Router>
      </Provider>
    </AppContainer>,
    container
  );
};

render();

if (module.hot) {
  module.hot.accept('./components/Viewport', () => {
    setImmediate(() => {
      ReactDOM.unmountComponentAtNode(container);
      render();
    });
  });
}
