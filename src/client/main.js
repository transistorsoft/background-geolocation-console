import React from 'react';
import { render } from 'react-dom';

import App from './client';
import store from './store';

// Detect users incorrectly hitting /locations/username instead of /username.
// It seems people think because the plugin is POSTing -> /location/username that they must
// view in browser at same url.  This is incorrect.
const { pathname } = window.location;
const pathQuery = pathname.match(/^\/locations\/(.*)$/);

if (pathQuery) {
  // Redirect /locations/username -> /username
  [, window.location.pathname] = pathQuery;
}

const hash = (window.location.hash || '').substring(1);

if (hash) {
  window.location = `/${hash}`;
}

document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('#app-container');

  if (module.hot) {
    // eslint-disable-next-line import/no-extraneous-dependencies, global-require
    const HotLoader = require('react-hot-loader').AppContainer;
    render(<HotLoader><App store={store} /></HotLoader>, container);
    module.hot.accept(['./components/Viewport', './client'], () => {
      // eslint-disable-next-line import/no-extraneous-dependencies, global-require
      const { default: NewApp } = require('./client');
      render(
        <HotLoader>
          <NewApp store={store} />
        </HotLoader>,
        container,
      );
    });
  } else {
    render(<App store={store} />, container);
  }
});
