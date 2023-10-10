import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    PayloadAction,
    PreloadedState,
    combineReducers,
    configureStore,
    createSlice
} from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/dist/query';
import { FLUSH, PAUSE, PERSIST, PURGE, REGISTER, REHYDRATE, persistReducer } from 'redux-persist';
import bleReducer from '../ble/bleSlice';
import { middleware as apiMiddleware, reducer as apiReducer } from './api';
import secureReducer from './secure';
import userReducer from './user-slice';
import blockchainReducer from './blockchain';

// Persistence configurations
const persistConfig = {
    key: 'root',
    version: 1,
    storage: AsyncStorage,
    whitelist: ['user', 'api'],
};

const apiPersistConfig = {
    key: 'api',
    version: 1,
    storage: AsyncStorage,
    blacklist: ['AuthMsg'], 
};

// Loading slice
const loadingSlice = createSlice({
    name: 'loading',
    initialState: false,
    reducers: {
        setLoading: (state, action: PayloadAction<boolean>) => {
            return action.payload;
        },
    },
});

// Root reducer
const rootReducer = combineReducers({
    user: userReducer,
    loading: loadingSlice.reducer,
    secure: secureReducer,
    ble: bleReducer,
    api:apiReducer, //persistReducer(apiPersistConfig, apiReducer), not persisting api state
    blockchain: blockchainReducer,
});

// Persisted root reducer
const persistedReducers = persistReducer(persistConfig, rootReducer);

// Store setup function
export function setupStore(preloadedState?: PreloadedState<RootState>) {
    const store = configureStore({
        reducer: persistedReducers,
        preloadedState,
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware({
                serializableCheck: {
                    ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
                },
            }).concat(apiMiddleware)
    });

    setupListeners(store.dispatch); // For RTK Query

    return store;
}

// Store instance
export const store = setupStore();

export const { setLoading } = loadingSlice.actions;

export type RootState = ReturnType<typeof rootReducer>;
export type AppStore = ReturnType<typeof setupStore>;
export type AppDispatch = AppStore['dispatch'];
