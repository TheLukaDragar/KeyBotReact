/**
 * @jest-environment jsdom
 */
import { configureStore } from '@reduxjs/toolkit';
import * as SecureStore from 'expo-secure-store';
import { AnyAction } from 'redux';
import secureSlice, { full_signout, getSecure, removeToken, setToken } from '../secure';
import { createWallet } from '../secure';


// Create a mock "store" object this is used to mock SecureStore(native implementation of secure storage)
const mockStore: { [key: string]: any } = {};

// Mock SecureStore so that we can test the behavior of our actions
jest.mock('expo-secure-store', () => ({
    getItemAsync: jest.fn(),
    setItemAsync: jest.fn(),
    deleteItemAsync: jest.fn(),
}));
(SecureStore.setItemAsync as jest.Mock).mockImplementation((key, value) => {
    mockStore[key] = value;
});
(SecureStore.getItemAsync as jest.Mock).mockImplementation((key) => {
    return mockStore[key];
});
(SecureStore.deleteItemAsync as jest.Mock).mockImplementation((key) => {
    delete mockStore[key];
});



const initialState = {
    keyChainData: {
        wallet: '',
        privateKey: '',
        mnemonic: '',
        pin: '',
        did: ''
    },
    userData: {
        token: ''
    },
    loading: true,
    is_wallet_setup: false,
    is_user_logged_in: false,
};


describe('secureSlice', () => {
    let store: ReturnType<typeof configureStore>;

    beforeEach(() => {
        //setup secure slice
        store = configureStore({
            reducer: {
                secure: secureSlice,
            },
            preloadedState: {
                secure: initialState,
            },
        });
        (SecureStore.getItemAsync as jest.Mock).mockClear();
        (SecureStore.setItemAsync as jest.Mock).mockClear();
        (SecureStore.deleteItemAsync as jest.Mock).mockClear();

         // Clear the mockStore
        for (let prop in mockStore) {
            delete mockStore[prop];
        }
    });

    it('should handle initial state', () => {
        const state = store.getState();
        expect(state).toEqual({ secure: initialState });
    });

    // Add other tests for getSecure, createWallet, loadDemoClientWallet, etc.
    // For example:
    it('should handle getSecure(SecureStore test)', async () => {
        (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('testValue');
        await store.dispatch(getSecure() as unknown as AnyAction);
        const state: any = store.getState(); // Fix here
        // Check that the state has been updated correctly
        expect(state.secure.keyChainData.wallet).toEqual('testValue');
        // Add other checks as needed
    });

    // Add this to your imports if you haven't already

    it('should handle createWallet', async () => {
        // Define the pin for the test
        const pin = '1234';
    
        // Dispatch the createWallet action
        await store.dispatch(createWallet(pin) as unknown as AnyAction);
    
        // Check that SecureStore.setItemAsync was called with the correct arguments
        expect(SecureStore.setItemAsync).toHaveBeenCalledWith('wallet', expect.any(String));
        expect(SecureStore.setItemAsync).toHaveBeenCalledWith('privateKey', expect.any(String));
        expect(SecureStore.setItemAsync).toHaveBeenCalledWith('mnemonic', expect.any(String));
        expect(SecureStore.setItemAsync).toHaveBeenCalledWith('pin', pin);
    
        // Check that the mockStore has been updated correctly
        expect(mockStore['wallet']).not.toBeUndefined();
        expect(mockStore['privateKey']).not.toBeUndefined();
        expect(mockStore['mnemonic']).not.toBeUndefined();
        expect(mockStore['pin']).toEqual(pin);

        const state: any = store.getState(); // Fix here
        // Check that the state has been updated correctly
        expect(state.secure.keyChainData.wallet).toEqual(mockStore['wallet']);
        expect(state.secure.keyChainData.privateKey).toEqual(mockStore['privateKey']);
        expect(state.secure.keyChainData.mnemonic).toEqual(mockStore['mnemonic']);
        expect(state.secure.keyChainData.pin).toEqual(mockStore['pin']);
        expect(state.secure.is_wallet_setup).toEqual(true);

        //log the mockStore
        console.log(mockStore);



    }, 10000);

    it('should setToken', async () => {
        const example_token = "example_token";
        await store.dispatch(setToken(example_token) as unknown as AnyAction);
        expect(SecureStore.setItemAsync).toHaveBeenCalledWith('token', example_token);
        expect(mockStore['token']).toEqual(example_token);
        const state: any = store.getState(); 
        expect(state.secure.userData.token).toEqual(mockStore['token']);
        expect(state.secure.is_user_logged_in).toEqual(true);
    })
    it('should removeToken', async () => {
        await store.dispatch(setToken('example_token') as unknown as AnyAction);
        await store.dispatch(removeToken() as unknown as AnyAction);
        expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('token');
        expect(mockStore['token']).toBeUndefined();
        const state: any = store.getState(); 
        expect(state.secure.userData.token).toEqual(null);
        expect(state.secure.is_user_logged_in).toEqual(false);
    }
    )
    it('should handle full_signout', async () => {
        await store.dispatch(full_signout() as unknown as AnyAction);
        expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('wallet');
        expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('privateKey');
        expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('mnemonic');
        expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('pin');
        expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('token');
        expect(mockStore['wallet']).toBeUndefined();
        expect(mockStore['privateKey']).toBeUndefined();
        expect(mockStore['mnemonic']).toBeUndefined();
        expect(mockStore['pin']).toBeUndefined();
        expect(mockStore['token']).toBeUndefined();
        const state: any = store.getState();
        expect(state.secure.keyChainData.wallet).toEqual(null);
        expect(state.secure.keyChainData.privateKey).toEqual(null);
        expect(state.secure.keyChainData.mnemonic).toEqual(null);
        expect(state.secure.keyChainData.pin).toEqual(null);
        expect(state.secure.userData.token).toEqual(null);
        expect(state.secure.is_wallet_setup).toEqual(false);
        expect(state.secure.is_user_logged_in).toEqual(false);

    })

    



});
