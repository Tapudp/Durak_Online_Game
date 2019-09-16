import * as types from '../types';
const initialState = {
  usersData: [],
  roomsData: [],
  userData: {},
  messages: [],
};
export default function commonData(state = initialState, action) {
  const { type, payload } = action;
  if (type === types.SET_USERS_DATA) {
    return { ...state, usersData: payload };
  } else if (type === types.SET_ROOMS_DATA) {
    return { ...state, roomsData: payload };
  } else if (type === types.SET_USER_DATA) {
    return {
      ...state,
      userData: payload,
    };
  } else if (type === types.SET_MESSAGES) {
    return {
      ...state,
      messages: payload,
    };
  }
  return state;
}