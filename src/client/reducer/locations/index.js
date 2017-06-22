import { SET_LOCATIONS } from './actions';

const initialState = [];

export default (state = initialState, action) => {
  switch (action.type) {
    case SET_LOCATIONS:
      return action.locations;
    default:
      return state;
  }
};
