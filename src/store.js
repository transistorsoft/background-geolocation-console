import {
  createStore, applyMiddleware, compose,
} from 'redux';
import thunk from 'redux-thunk';

import reducer from './reducer';

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
const store = createStore(reducer, composeEnhancers(applyMiddleware(thunk)));

if (import.meta.hot) {
  // eslint-disable-next-line global-require
  import.meta.hot.accept('./reducer', function() {
    store.replaceReducer(require('./reducer').default);
  });
}

export default store;
