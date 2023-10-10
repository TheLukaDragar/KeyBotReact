import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as SecureStore from 'expo-secure-store';


// Import the crypto getRandomValues shim (**BEFORE** the shims)
import "react-native-get-random-values";

// Import the the ethers shims (**BEFORE** ethers)
import "@ethersproject/shims";

import { ethers } from 'ethers';
import { UserType2 } from '../constants/Auth';
import { setPrivateKey } from './blockchain';


//from gimly
export type KeyChainData = {
    wallet: string | null
    privateKey: string | null
    mnemonic: string | null
    pin: string | null
    did?: string | null
}

export type UserData = {
    token: string | null
    userType: UserType2 | null
}


//craate a secure slice use secure store to store the mnemonic
const secureSlice = createSlice({
    name: 'secure',
    initialState: {
        keyChainData: {
            wallet: '',
            privateKey: '',
            mnemonic: '',
            pin: '',
            did: ''
        } as KeyChainData,
        userData: {
            token: '',
            userType: null

        } as UserData,
        loading: true,
        is_wallet_setup: false,
        is_user_logged_in: false,

    },
    reducers: {


    },
    extraReducers: (builder) => {
        builder.addCase(getSecure.fulfilled, (state, action) => {


            state.keyChainData = action.payload?.keyChainData!;
            state.userData = action.payload?.userData!;

            if (state.keyChainData.mnemonic != null && state.keyChainData.mnemonic != '') {
                state.is_wallet_setup = true;
                //TODO ENABLE 
            }

            if (state.userData.token != null && state.userData.token != '') {
                state.is_user_logged_in = true;
            }



            //log data here
            console.log('getSecure.fulfilled');
            state.loading = false;
        });

        builder.addCase(getSecure.rejected, (state, action) => {
            //log error here
            console.log('getSecure.rejected', action.error);
        }
        );

        builder.addCase(getSecure.pending, (state, action) => {
            console.log('getSecure.pending');
        }
        );

        //create a new wallet
        builder.addCase(createWallet.fulfilled, (state, action) => {
            console.log('createWallet.fulfilled');
            state.keyChainData = action.payload?.keyChainData!;
            state.is_wallet_setup = true;
        }
        );

        builder.addCase(createWallet.rejected, (state, action) => {
            console.log('createWallet.rejected', action.error);
        }
        );

        builder.addCase(createWallet.pending, (state, action) => {
            console.log('createWallet.pending');
        }
        );
        //loadDemoClientWallet
        builder.addCase(loadDemoClientWallet.fulfilled, (state, action) => {
            console.log('loadDemoClientWallet.fulfilled');
            state.keyChainData = action.payload?.keyChainData!;
            state.is_wallet_setup = true;
        }
        );
        //loadDemoCourierWallet
        builder.addCase(loadDemoCourierWallet.fulfilled, (state, action) => {
            console.log('loadDemoCourierWallet.fulfilled');
            state.keyChainData = action.payload?.keyChainData!;
            state.is_wallet_setup = true;
        }
        );


        //remove token
        builder.addCase(removeToken.fulfilled, (state, action) => {
            console.log('removeToken.fulfilled');
            state.userData.token = null;
            state.is_user_logged_in = false;
        }
        );
        //set token
        builder.addCase(setToken.fulfilled, (state, action) => {
            console.log('setToken.fulfilled', action.payload);
            state.userData.token = action.payload;
            state.is_user_logged_in = true;
        }
        );
        //set user type
        builder.addCase(setUserType.fulfilled, (state, action) => {
            console.log('setUserType.fulfilled', action.payload);
            state.userData.userType = action.payload;
        }
        );


        //full sign out
        builder.addCase(full_signout.fulfilled, (state, action) => {
            console.log('full_signout.fulfilled');
            state.keyChainData = {
                wallet: null,
                privateKey: null,
                mnemonic: null,
                pin: null,
                did: null
            } as KeyChainData;
            state.userData = {
                token: null,
                userType: null

            } as UserData;
            state.is_wallet_setup = false;
            state.is_user_logged_in = false;
        }
        );


    },



});

export const getSecure = createAsyncThunk(
    'secure/getSecure',
    async (_, thunkAPI) => {
        let keyChainData = {
            wallet: null,
            privateKey: null,
            mnemonic: null,
            pin: null,
            did: null
        } as KeyChainData;

        let userData = {
            token: null,
            userType: null


        } as UserData;

        try {

            //wait 5s for testing
            //await new Promise((resolve) => setTimeout(resolve, 5000));

            // await SecureStore.deleteItemAsync('wallet');
            // await SecureStore.deleteItemAsync('privateKey');
            // await SecureStore.deleteItemAsync('mnemonic');
            // await SecureStore.deleteItemAsync('pin');
            // await SecureStore.deleteItemAsync('did');
            // await SecureStore.deleteItemAsync('token');

            //for testing

            //get from secure store
            keyChainData.wallet = await SecureStore.getItemAsync('wallet');
            keyChainData.privateKey = await SecureStore.getItemAsync('privateKey');
            keyChainData.mnemonic = await SecureStore.getItemAsync('mnemonic');
            keyChainData.pin = await SecureStore.getItemAsync('pin');
            keyChainData.did = await SecureStore.getItemAsync('did');

            userData.token = await SecureStore.getItemAsync('token');
            const string_userType = await SecureStore.getItemAsync('userType');
            userData.userType = Number(string_userType) as UserType2;

            console.log('getSecure', userData);

            //setting Private key in blockgain
            thunkAPI.dispatch(setPrivateKey(keyChainData.privateKey));


            return {
                keyChainData,
                userData

            }

        } catch (error) {

            console.error('getSecure', error);

            //TODO: handle error

            //IMPORTANT IF THIS ERROR HAPPENS 
            //it means the app was reinstalled and the secure store became corrupted
            //we need to delete the secure store and create a new wallet

            //delete secure store
            await SecureStore.deleteItemAsync('wallet');
            await SecureStore.deleteItemAsync('privateKey');
            await SecureStore.deleteItemAsync('mnemonic');
            await SecureStore.deleteItemAsync('pin');
            await SecureStore.deleteItemAsync('did');
            await SecureStore.deleteItemAsync('token');
            await SecureStore.deleteItemAsync('userType');

            return {
                keyChainData,
                userData

            }

            //return thunkAPI.rejectWithValue("secure store error");
        }





    }
);

//create new wallet with ethers and store in secure store ecrypted with pin
export const createWallet = createAsyncThunk(
    'secure/createWallet',
    async (pin: string, thunkAPI) => {

        if (!pin || pin.length !== 4) {
            return thunkAPI.rejectWithValue('pin must be 4 digits');
        }

        //delays for testing
        await new Promise((resolve) => setTimeout(resolve, 5000));

        //create new wallet //gimly
        try {
            console.log('createWallet');
            const mnemonic = ethers.utils.entropyToMnemonic(
                ethers.utils.randomBytes(32)
            )
            console.log('createWallet', "random done");
            const wallet = ethers.Wallet.fromMnemonic(mnemonic)
            const encryptedWallet = await wallet.encrypt(pin, { scrypt: { N: 2 ** 1 } }) //TODO: change N to 2 ** 18

            console.log('createWallet', "saving wallet");


            //store in secure store
            await SecureStore.setItemAsync('wallet', encryptedWallet);
            console.log('createWallet', "wallet saved");
            await SecureStore.setItemAsync('privateKey', wallet.privateKey);
            await SecureStore.setItemAsync('mnemonic', wallet.mnemonic.phrase);
            console.log('createWallet', "mnemonic saved");
            await SecureStore.setItemAsync('pin', pin);

            console.log('createWallet', "saved wallet");


            thunkAPI.dispatch(setPrivateKey(wallet.privateKey));

            return {
                mnemonicPhrase: wallet.mnemonic.phrase,
                keyChainData: { //only used for updating the state
                    wallet: encryptedWallet,
                    privateKey: wallet.privateKey,
                    mnemonic: wallet.mnemonic.phrase,
                    pin: pin
                } as KeyChainData
            }
        } catch (error) {
            return thunkAPI.rejectWithValue(error)
        }
    }
);

export const loadDemoClientWallet = createAsyncThunk(
    'secure/loadDemoClientWallet',
    async (_, thunkAPI) => {
        //create new wallet //gimly
        try {
            console.log('loadDemoClientWallet');
            const mnemonic = "divide make base fuel vibrant into before easily ankle orphan reject float antique weekend since pelican leopard gloom bulb certain regular exercise rather rent"
            console.log('loadDemoClientWallet', "random done");
            const wallet = new ethers.Wallet("0xdbaa334fb6984b34062ff704300dd7dc47b6101f0feaf875d361dbe7e5f07786")
            //const encryptedWallet = await wallet.encrypt("1111", { scrypt: { N: 2 ** 1 } }) //TODO: change N to 2 ** 18
            const encryptedWallet = "{\"address\":\"d52c27cc2c7d3fb5ba4440ffa825c12ea5658d60\",\"id\":\"d8c90009-cd35-48ea-8c30-b5d9b375d1c5\",\"version\":3,\"crypto\":{\"cipher\":\"aes-128-ctr\",\"cipherparams\":{\"iv\":\"c9088d12cbfeeeb97b9145cd08234c64\"},\"ciphertext\":\"393d49a642d9657c076e17ba1107ee675752f5ebfb1d99793c279da01f4f91bd\",\"kdf\":\"scrypt\",\"kdfparams\":{\"salt\":\"0f0f48479ede1ab73071c55357c2b96267800710ee5d3bde0979c63d10311eaa\",\"n\":2,\"dklen\":32,\"p\":1,\"r\":8},\"mac\":\"0c65b782ac32ba8d6a13da2a811d3d515ab86aea82116957baa272f722645c7d\"},\"x-ethers\":{\"client\":\"ethers.js\",\"gethFilename\":\"UTC--2023-05-18T09-22-18.0Z--d52c27cc2c7d3fb5ba4440ffa825c12ea5658d60\",\"mnemonicCounter\":\"ab94cbdbd95bc4403096258ca65b3bc3\",\"mnemonicCiphertext\":\"f0337df718235c35a00f6f875d094eb668cc6ccc5b65159c71f4b743c38d56b7\",\"path\":\"m/44'/60'/0'/0/0\",\"locale\":\"en\",\"version\":\"0.1\"}}"
            console.log('loadDemoClientWallet', "saving wallet");


            //store in secure store
            await SecureStore.setItemAsync('wallet', encryptedWallet);
            console.log('loadDemoClientWallet', "wallet saved");
            await SecureStore.setItemAsync('privateKey', wallet.privateKey);
            await SecureStore.setItemAsync('mnemonic', mnemonic);
            console.log('loadDemoClientWallet', "mnemonic saved");
            await SecureStore.setItemAsync('pin', "1111");

            //set user type
            await SecureStore.setItemAsync('userType', String(UserType2.PARCEL_RECEIVER));
            thunkAPI.dispatch(setPrivateKey(wallet.privateKey));


            console.log('loadDemoClientWallet', "saved wallet");
            return {
                mnemonicPhrase: mnemonic,
                keyChainData: { //only used for updating the state
                    wallet: encryptedWallet,
                    privateKey: wallet.privateKey,
                    mnemonic: mnemonic,
                    pin: "1111"
                } as KeyChainData
            }
        } catch (error) {
            return thunkAPI.rejectWithValue(error)
        }
    }
);

export const loadDemoCourierWallet = createAsyncThunk(
    'secure/loadDemoCourierWallet',
    async (_, thunkAPI) => {
        //create new wallet //gimly
        try {
            console.log('loadDemoCourierWallet');
            const mnemonic = "early library gadget inch day feed dove fee frost margin orange scare math decline chair exclude home input random real melody tongue hover curtain"
            const wallet = new ethers.Wallet("0x6a3c63737cd800c0367abfb24d6f845de550907257ef1e3786583534c1440d1f")
            //const encryptedWallet = await wallet.encrypt("1111", { scrypt: { N: 2 ** 1 } }) //TODO: change N to 2 ** 18
            const encryptedWallet = "{\"address\":\"4cf114732732c072d49a783e80c6fe9fe8ba420a\",\"id\":\"e866a9dd-c7ba-40ff-a2a8-10175765c732\",\"version\":3,\"crypto\":{\"cipher\":\"aes-128-ctr\",\"cipherparams\":{\"iv\":\"d9a24daa2e41603179f37d84a1b0bd4d\"},\"ciphertext\":\"ec10803a485b7f06b8a0d58455a47718f9b363df2d77f26201bc292a16c673b3\",\"kdf\":\"scrypt\",\"kdfparams\":{\"salt\":\"02272998b2e9c596bf16d867653dc577a0821742c8cb47958abec6b68448ef88\",\"n\":2,\"dklen\":32,\"p\":1,\"r\":8},\"mac\":\"5e0a6a6be0a0f8bc8dfebff7926fc72959464e7b4afa45b3bbb59bafcd304a64\"},\"x-ethers\":{\"client\":\"ethers.js\",\"gethFilename\":\"UTC--2023-05-26T10-19-33.0Z--4cf114732732c072d49a783e80c6fe9fe8ba420a\",\"mnemonicCounter\":\"e8474345d7cb128d6a78dee8db320617\",\"mnemonicCiphertext\":\"b5062dbc1a8edf86a9d4256ede60e0bf3ef6b9f2c6d76fdacc99eb7fcb299885\",\"path\":\"m/44'/60'/0'/0/0\",\"locale\":\"en\",\"version\":\"0.1\"}}"
            console.log('loadDemoCourierWallet', "saving wallet");


            //store in secure store
            await SecureStore.setItemAsync('wallet', encryptedWallet);
            console.log('loadDemoCourierWallet', "wallet saved");
            await SecureStore.setItemAsync('privateKey', wallet.privateKey);
            await SecureStore.setItemAsync('mnemonic', mnemonic);
            console.log('loadDemoCourierWallet', "mnemonic saved");
            await SecureStore.setItemAsync('pin', "1111");

            thunkAPI.dispatch(setPrivateKey(wallet.privateKey));

            console.log('loadDemoCourierWallet', "saved wallet");

            //SET USER TYPE
            await SecureStore.setItemAsync('userType', String(UserType2.PARCEL_DELIVERY));

            return {
                mnemonicPhrase: mnemonic,
                keyChainData: { //only used for updating the state
                    wallet: encryptedWallet,
                    privateKey: wallet.privateKey,
                    mnemonic: mnemonic,
                    pin: "1111"
                } as KeyChainData
            }
        } catch (error) {
            return thunkAPI.rejectWithValue(error)
        }
    }
);



//remove token from backend
export const removeToken = createAsyncThunk(
    'secure/removeToken',
    async (_, thunkAPI) => {
        await SecureStore.deleteItemAsync('token');
        return null;
    }
);
export const full_signout = createAsyncThunk(
    'secure/full_signout',
    async (_, thunkAPI) => {
        await SecureStore.deleteItemAsync('token');
        await SecureStore.deleteItemAsync('wallet');
        await SecureStore.deleteItemAsync('privateKey');
        await SecureStore.deleteItemAsync('mnemonic');
        await SecureStore.deleteItemAsync('pin');

        return null;
    }
);

//set token in secure store
export const setToken = createAsyncThunk(
    'secure/setToken',
    async (token: string, thunkAPI) => {
        await SecureStore.setItemAsync('token', token);
        return token;
    }
);

//set UserType in secure store
export const setUserType = createAsyncThunk(
    'secure/setUserType',
    async (userType: UserType2, thunkAPI) => {
        await SecureStore.setItemAsync('userType', String(userType));

        return userType;
    }
);








export default secureSlice.reducer;





