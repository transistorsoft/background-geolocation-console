import React from 'react';
import { render } from 'react-dom';

import App from './client';
import store from './store';

import './assets/styles/app.css';
import { addGoogleAnalitics, addPureChat } from './extra'

render(<App store={store} />, document.getElementById('root'));

addGoogleAnalitics();
addPureChat();

if (import.meta.hot) {
    import.meta.hot.accept();
}
