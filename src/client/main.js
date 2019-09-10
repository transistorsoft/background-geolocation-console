import React from 'react';
import ReactDOM from 'react-dom';
import WrappedViewport from './components/WrappedViewport';
import { AppContainer } from 'react-hot-loader';
import { Provider } from 'react-redux';

import store from './store';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

// Detect users incorrectly hitting /locations/username instead of /username.
// It seems people think because the plugin is POSTing -> /location/username that they must
// view in browser at same url.  This is incorrect.
const path = window.location.pathname;
const pathQuery = path.match(/^\/locations\/(.*)$/);
if (pathQuery) {
  // Redirect /locations/username -> /username
  window.location.pathname = pathQuery[1];
}

const locationHash = (location.hash || '').substring(1);

if (locationHash) {
  window.location = '/' + locationHash;
}

const container = document.querySelector('#app-container');

const render = () => {
  ReactDOM.render(
    <AppContainer>
      <Provider store={store}>
        <Router>
          <Switch>
            <Route path='/:token' component={WrappedViewport} />
            <Route path='/' component={WrappedViewport} />
          </Switch>
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
