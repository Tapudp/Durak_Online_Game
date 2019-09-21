import * as types from '../types';
const initialState = {
  isAuthenticated: false,
  isInRoom: '',
  socket: null,
  errorMessage: '',
};
export default function authentication(state = initialState, action) {
  const { type, payload } = action;
  switch (type) {
    case types.SET_AUTH:
      return {
        ...state,
        isAuthenticated: payload,
      };
    case types.SET_SOCKET:
      return {
        ...state,
        socket: payload,
      };
    case types.JOIN_ROOM:
      return {
        ...state,
        isInRoom: payload,
      };
    case types.SET_ERROR:
      return {
        ...state,
        errorMessage: payload,
      };
    default:
      return state;
  }
}
