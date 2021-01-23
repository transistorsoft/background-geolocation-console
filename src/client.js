import React from 'react';
import { Provider } from 'react-redux';
import {
  BrowserRouter as Router,
  Route,
  Switch,
} from 'react-router-dom';

import WrappedViewport from 'components/WrappedViewport';

const App = ({ store }) => (
  <Provider store={store}>
    <Router>
      <Switch>
        <Route path='/:token' component={WrappedViewport} exact />
        <Route path='/' component={WrappedViewport} exact />
      </Switch>
    </Router>
  </Provider>
);

export default App;
