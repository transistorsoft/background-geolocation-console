import { combineReducers } from 'redux';

import dashboard from './dashboard';
import auth from './auth';

export default combineReducers({ dashboard, auth });
