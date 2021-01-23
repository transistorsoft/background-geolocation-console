import {
  createStore, applyMiddleware, compose,
} from 'redux';
import thunk from 'redux-thunk';

import reducer from './reducer';

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
const store = createStore(reducer, composeEnhancers(applyMiddleware(thunk)));

if (module.hot) {
  // eslint-disable-next-line global-require
  module.hot.accept('./reducer', () => store.replaceReducer(require('./reducer').default));
}

export default store;
