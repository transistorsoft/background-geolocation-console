import { SET_DEVICES } from './actions';

const initialState = [];

export default (state = initialState, action) => {
  switch (action.type) {
    case SET_DEVICES:
      return action.devices;
    default:
      return state;
  }
};
