import { combineReducers, configureStore, type Action } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import authReducer, { logout, setCredentials } from '../features/auth/authSlice';
import { api } from './api';

const appReducer = combineReducers({
  auth: authReducer,
  [api.reducerPath]: api.reducer,
});

export type RootState = ReturnType<typeof appReducer>;

// Wipe the entire RTK Query cache on logout OR a fresh login, so the next
// account never sees the previous user's tasks/projects/users/analytics.
// Catches every logout path (the button + the forced 401 logout) in one place.
const rootReducer = (state: RootState | undefined, action: Action): RootState => {
  if (state && (action.type === logout.type || action.type === setCredentials.type)) {
    state = { ...state, [api.reducerPath]: api.reducer(undefined, { type: '@@RESET' }) };
  }
  return appReducer(state, action);
};

export const store = configureStore({
  reducer: rootReducer,
  middleware: getDefault => getDefault().concat(api.middleware),
});

setupListeners(store.dispatch);

export type AppDispatch = typeof store.dispatch;
