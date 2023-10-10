import "@ethersproject/shims";
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import "react-native-get-random-values";
import { RootState } from './store';


import { ethers } from "ethers";
import Constants from 'expo-constants';
//import dataserRegistryABI from '../contracts/DatasetRegistry.json';
import { Buffer } from 'buffer';
import { _TypedDataEncoder, arrayify, defaultAbiCoder, getAddress, hexlify, keccak256, randomBytes } from "ethers/lib/utils";
import { PreciseLocation } from "./api";
import DatasetRegistry from './iexec/DatasetRegistry';
import { IPFSGateways, IpfsData, downloadFromIPFS, encryptAes256Cbc, generateAes256Key, sha256Sum, uploadToIPFS, uploadToIPFSTesting } from "./iexec/IPFSGateway";
import {
  APP_ORDER,
  DATASET_ORDER,
  NULL_ADDRESS, NULL_BYTES, REQUEST_ORDER, WORKERPOOL_ORDER, signedOrderToStruct
} from './iexec/objDesc';
import Token from './iexec/token';


//fix for expo
export class CustomJsonRpcProvider extends ethers.providers.JsonRpcProvider {
  async fetchFunc(path: string, json: string) {
    try {
      const response = await fetch(
        this.connection.url,
        {
          method: 'POST',
          body: json,
          headers: {
            ...this.connection.headers, //by default ethers sets host header and bellecour api rejects it
            'Content-Type': 'application/json'
          },
        }
      );

      if (!response.ok) {
        throw new Error('Bad response from server');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }
}



const RPCUrl = Constants?.expoConfig?.extra?.RPCUrl;
const reputationSCAddress = Constants?.expoConfig?.extra?.reputationSCAddress;
const parcelNFTSCAddress = Constants?.expoConfig?.extra?.parcelNFTSCAddress;
const DLMDApp = Constants?.expoConfig?.extra?.DLMDApp;
const provider = new CustomJsonRpcProvider(RPCUrl);
//const smsURL = "https://sms.scone-prod.v8-bellecour.iex.ec";
const smsURL = "https://sms.scone-debug.v8-bellecour.iex.ec";
const marketplaceURL = "https://api.market.v8-bellecour.iex.ec";
const result_storageURL = "https://result.v8-bellecour.iex.ec";
const workerpoolApiUrl = "https://core-debug.v8-bellecour.iex.ec";
const hub_addres = "0x3eca1B216A7DF1C7689aEb259fFB83ADFB894E7f"
const iExecDatasetRegistryAddres = "0x799DAa22654128d0C64d5b79eac9283008158730";
const chainId = '134';
const iexecresultIPFSGateway = "https://ipfs-gateway.v8-bellecour.iex.ec";

console.log(RPCUrl);
console.log(reputationSCAddress);
console.log(parcelNFTSCAddress);
console.log(workerpoolApiUrl);

// Setup provider and contract outside of the slice
// const provider = new ethers.providers.JsonRpcProvider(RPCUrl);
// const contractAddress = '0x3623a0e70040859aa3eb8f63eec65d04efcfdf18';
// const abi = [
//     "function balanceOf(address account) external view returns (uint256)",
//     "function totalSupply() external view returns (uint256)",
// ];
const parcelNFTSC_ABI = [{ "type": "constructor", "inputs": [{ "type": "string", "name": "_name", "internalType": "string" }, { "type": "string", "name": "_symbol", "internalType": "string" }, { "type": "string", "name": "_newBaseURI", "internalType": "string" }] }, { "type": "function", "stateMutability": "nonpayable", "outputs": [], "name": "approve", "inputs": [{ "type": "address", "name": "to", "internalType": "address" }, { "type": "uint256", "name": "tokenId", "internalType": "uint256" }] }, { "type": "function", "stateMutability": "view", "outputs": [{ "type": "uint256", "name": "", "internalType": "uint256" }], "name": "balanceOf", "inputs": [{ "type": "address", "name": "owner", "internalType": "address" }] }, { "type": "function", "stateMutability": "view", "outputs": [{ "type": "string", "name": "", "internalType": "string" }], "name": "baseUri", "inputs": [] }, { "type": "function", "stateMutability": "view", "outputs": [{ "type": "string", "name": "parcelId", "internalType": "string" }, { "type": "address", "name": "sender", "internalType": "address" }, { "type": "address", "name": "receiver", "internalType": "address" }], "name": "boxes", "inputs": [{ "type": "uint256", "name": "", "internalType": "uint256" }] }, { "type": "function", "stateMutability": "view", "outputs": [{ "type": "address", "name": "", "internalType": "address" }], "name": "getApproved", "inputs": [{ "type": "uint256", "name": "tokenId", "internalType": "uint256" }] }, { "type": "function", "stateMutability": "view", "outputs": [{ "type": "address[]", "name": "", "internalType": "address[]" }], "name": "getBoxDatasets", "inputs": [{ "type": "uint256", "name": "_tokenId", "internalType": "uint256" }] }, { "type": "function", "stateMutability": "view", "outputs": [{ "type": "string", "name": "", "internalType": "string" }], "name": "getParcelId", "inputs": [{ "type": "uint256", "name": "_tokenId", "internalType": "uint256" }] }, { "type": "function", "stateMutability": "view", "outputs": [{ "type": "bool", "name": "", "internalType": "bool" }], "name": "isApprovedForAll", "inputs": [{ "type": "address", "name": "owner", "internalType": "address" }, { "type": "address", "name": "operator", "internalType": "address" }] }, { "type": "function", "stateMutability": "nonpayable", "outputs": [], "name": "mint", "inputs": [{ "type": "address", "name": "_receiver", "internalType": "address" }, { "type": "string", "name": "_parcelId", "internalType": "string" }, { "type": "address", "name": "_dataset", "internalType": "address" }] }, { "type": "function", "stateMutability": "view", "outputs": [{ "type": "string", "name": "", "internalType": "string" }], "name": "name", "inputs": [] }, { "type": "function", "stateMutability": "view", "outputs": [{ "type": "address", "name": "", "internalType": "address" }], "name": "owner", "inputs": [] }, { "type": "function", "stateMutability": "view", "outputs": [{ "type": "address", "name": "", "internalType": "address" }], "name": "ownerOf", "inputs": [{ "type": "uint256", "name": "tokenId", "internalType": "uint256" }] }, { "type": "function", "stateMutability": "nonpayable", "outputs": [], "name": "renounceOwnership", "inputs": [] }, { "type": "function", "stateMutability": "nonpayable", "outputs": [], "name": "safeTransferFrom", "inputs": [{ "type": "address", "name": "from", "internalType": "address" }, { "type": "address", "name": "to", "internalType": "address" }, { "type": "uint256", "name": "tokenId", "internalType": "uint256" }] }, { "type": "function", "stateMutability": "nonpayable", "outputs": [], "name": "safeTransferFrom", "inputs": [{ "type": "address", "name": "from", "internalType": "address" }, { "type": "address", "name": "to", "internalType": "address" }, { "type": "uint256", "name": "tokenId", "internalType": "uint256" }, { "type": "bytes", "name": "data", "internalType": "bytes" }] }, { "type": "function", "stateMutability": "nonpayable", "outputs": [], "name": "setApprovalForAll", "inputs": [{ "type": "address", "name": "operator", "internalType": "address" }, { "type": "bool", "name": "approved", "internalType": "bool" }] }, { "type": "function", "stateMutability": "nonpayable", "outputs": [], "name": "setBaseURI", "inputs": [{ "type": "string", "name": "_newBaseURI", "internalType": "string" }] }, { "type": "function", "stateMutability": "view", "outputs": [{ "type": "bool", "name": "", "internalType": "bool" }], "name": "supportsInterface", "inputs": [{ "type": "bytes4", "name": "interfaceId", "internalType": "bytes4" }] }, { "type": "function", "stateMutability": "view", "outputs": [{ "type": "string", "name": "", "internalType": "string" }], "name": "symbol", "inputs": [] }, { "type": "function", "stateMutability": "view", "outputs": [{ "type": "string", "name": "", "internalType": "string" }], "name": "tokenURI", "inputs": [{ "type": "uint256", "name": "tokenId", "internalType": "uint256" }] }, { "type": "function", "stateMutability": "nonpayable", "outputs": [], "name": "transferFrom", "inputs": [{ "type": "address", "name": "from", "internalType": "address" }, { "type": "address", "name": "to", "internalType": "address" }, { "type": "uint256", "name": "tokenId", "internalType": "uint256" }] }, { "type": "function", "stateMutability": "nonpayable", "outputs": [], "name": "transferOwnership", "inputs": [{ "type": "address", "name": "newOwner", "internalType": "address" }] }, { "type": "function", "stateMutability": "nonpayable", "outputs": [], "name": "updateBox", "inputs": [{ "type": "uint256", "name": "_tokenId", "internalType": "uint256" }, { "type": "address", "name": "_dataset", "internalType": "address" }, { "type": "bool", "name": "_transferOwnershipToReceiver", "internalType": "bool" }] }, { "type": "function", "stateMutability": "view", "outputs": [{ "type": "bool", "name": "", "internalType": "bool" }], "name": "whitelist", "inputs": [{ "type": "address", "name": "", "internalType": "address" }] }, { "type": "function", "stateMutability": "nonpayable", "outputs": [], "name": "whitelistAddresses", "inputs": [{ "type": "address[]", "name": "_list", "internalType": "address[]" }, { "type": "bool", "name": "_whitelist", "internalType": "bool" }] }, { "type": "event", "name": "Approval", "inputs": [{ "type": "address", "name": "owner", "indexed": true }, { "type": "address", "name": "approved", "indexed": true }, { "type": "uint256", "name": "tokenId", "indexed": true }], "anonymous": false }, { "type": "event", "name": "ApprovalForAll", "inputs": [{ "type": "address", "name": "owner", "indexed": true }, { "type": "address", "name": "operator", "indexed": true }, { "type": "bool", "name": "approved", "indexed": false }], "anonymous": false }, { "type": "event", "name": "OwnershipTransferred", "inputs": [{ "type": "address", "name": "previousOwner", "indexed": true }, { "type": "address", "name": "newOwner", "indexed": true }], "anonymous": false }, { "type": "event", "name": "Transfer", "inputs": [{ "type": "address", "name": "from", "indexed": true }, { "type": "address", "name": "to", "indexed": true }, { "type": "uint256", "name": "tokenId", "indexed": true }], "anonymous": false }]
const reputationSC_ABI = [{ "type": "function", "stateMutability": "view", "outputs": [{ "type": "uint256", "name": "", "internalType": "uint256" }], "name": "MAX_SCORE", "inputs": [] }, { "type": "function", "stateMutability": "view", "outputs": [{ "type": "uint256", "name": "", "internalType": "uint256" }], "name": "MIN_SCORE", "inputs": [] }, { "type": "function", "stateMutability": "nonpayable", "outputs": [], "name": "addScore", "inputs": [{ "type": "address", "name": "_user", "internalType": "address" }, { "type": "uint256", "name": "_score", "internalType": "uint256" }] }, { "type": "function", "stateMutability": "view", "outputs": [{ "type": "address", "name": "", "internalType": "address" }], "name": "owner", "inputs": [] }, { "type": "function", "stateMutability": "nonpayable", "outputs": [], "name": "renounceOwnership", "inputs": [] }, { "type": "function", "stateMutability": "view", "outputs": [{ "type": "uint256", "name": "score", "internalType": "uint256" }, { "type": "uint256", "name": "cnt", "internalType": "uint256" }], "name": "reputation", "inputs": [{ "type": "address", "name": "", "internalType": "address" }] }, { "type": "function", "stateMutability": "nonpayable", "outputs": [], "name": "transferOwnership", "inputs": [{ "type": "address", "name": "newOwner", "internalType": "address" }] }, { "type": "function", "stateMutability": "view", "outputs": [{ "type": "bool", "name": "", "internalType": "bool" }], "name": "whitelist", "inputs": [{ "type": "address", "name": "", "internalType": "address" }] }, { "type": "function", "stateMutability": "nonpayable", "outputs": [], "name": "whitelistAddresses", "inputs": [{ "type": "address[]", "name": "_list", "internalType": "address[]" }, { "type": "bool", "name": "_whitelist", "internalType": "bool" }] }, { "type": "event", "name": "OwnershipTransferred", "inputs": [{ "type": "address", "name": "previousOwner", "indexed": true }, { "type": "address", "name": "newOwner", "indexed": true }], "anonymous": false }]
const DatasetABI = DatasetRegistry.abi;
const TokenABI = Token.abi;
//isWhitelisted
export const isWhitelisted = createAsyncThunk(
  'blockchain/isWhitelisted',
  async (_, thunkAPI) => {
    try {
      // Get the current state
      const state = thunkAPI.getState() as RootState;

      // Get the wallet from the state
      const privateKey = state.blockchain.privateKey;

      // Check if the wallet exists
      if (!privateKey) {
        throw new Error("Wallet not found");
      }


      // Create a new wallet instance
      const wallet = new ethers.Wallet(privateKey, provider);

      // Create a new contract instance using the wallet
      const contract = new ethers.Contract(parcelNFTSCAddress, parcelNFTSC_ABI, wallet);

      console.log("calling isWhitelisted with address: " + wallet.address);

      //call isWhitelisted
      const isWhitelisted = await contract.whitelist(wallet.address);

      return isWhitelisted;


    }
    catch (error) {
      if (error instanceof Error) {
        // If the error is an instance of Error, handle it
        return thunkAPI.rejectWithValue(error.message);
      } else {
        // If the error is not an instance of Error, handle it differently
        return thunkAPI.rejectWithValue('An unknown error occurred');
      }
    }

  }
);
const tokenIdToAddress = (tokenId: { toHexString: () => string; }) => {
  const hexTokenId = tokenId.toHexString().substring(2);
  const lowerCaseAddress = NULL_ADDRESS.substring(
    0,
    42 - hexTokenId.length,
  ).concat(hexTokenId);
  return getAddress(lowerCaseAddress);
};
const concatenateAndHash = (...hexStringArray: string[]) => {
  const buffer = Buffer.concat(
    hexStringArray.map((hexString) => Buffer.from(arrayify(hexString))),
  );
  return keccak256(buffer);
};
export const getChallengeForSetWeb3Secret = (secretAddress: string, secretValue: WithImplicitCoercion<string> | { [Symbol.toPrimitive](hint: "string"): string; }) =>
  concatenateAndHash(
    keccak256(Buffer.from('IEXEC_SMS_DOMAIN', 'utf8')),
    secretAddress,
    keccak256(Buffer.from(secretValue, 'utf8')),
  );

export const getChallengeForSetWeb2Secret = (ownerAddress: string, secretKey: WithImplicitCoercion<string> | { [Symbol.toPrimitive](hint: "string"): string; }, secretValue: WithImplicitCoercion<string> | { [Symbol.toPrimitive](hint: "string"): string; }) =>
  concatenateAndHash(
    keccak256(Buffer.from('IEXEC_SMS_DOMAIN', 'utf8')),
    ownerAddress,
    keccak256(Buffer.from(secretKey, 'utf8')),
    keccak256(Buffer.from(secretValue, 'utf8')),
  );


export const IExecLogin = async (address: string, authorization: string) => {
  //iexec:storage:result-proxy

  //pos to 
  const url = result_storageURL + "/results/login" + "?chainId=" + chainId;
  console.log("result login url: " + url);
  const res = await fetch(url, {
    method: 'POST',
    body: authorization,

  });
  if (res.ok) {
    console.log("login success");
    return res.text();
  }
  else {
    console.log("login failed");
    throw new Error(`HTTP error! status: ${res.status}`);
  }
}





export const pushWeb2Secret = createAsyncThunk(
  'blockchain/pushWeb2Secret',
  async (secretName: string, thunkAPI): Promise<boolean> => {
    try {

      const state = thunkAPI.getState() as RootState;

      // Get the wallet from the state
      const privateKey = state.blockchain.privateKey;

      // Check if the wallet exists
      if (!privateKey) {
        throw new Error("Wallet not found");
      }
      // sign the challenge

      const wallet = new ethers.Wallet(privateKey, provider);
      const vOwnerAddress = wallet.address;

      const res = await fetch(`${smsURL}/secrets/web2?ownerAddress=${vOwnerAddress}&secretName=${secretName}`, {
        method: 'HEAD',
      });

      if (res.ok) {
        console.log("secret already exists");
        return true;

      }

      //login into iexec storage to get token 

      const challenge = await getIExecStorageChallenge(vOwnerAddress, chainId);
      const signedChallenge = await signIEExecStorageChallenge(challenge, privateKey);

      const token = await IExecLogin(vOwnerAddress, signedChallenge);

      console.log("Iexec login token: " + token);

      const web2challenge = getChallengeForSetWeb2Secret(vOwnerAddress, secretName, token);

      const binaryChallenge = arrayify(web2challenge);
      const auth = await wallet.signMessage(binaryChallenge);

      //put or post secret
      const url = `${smsURL}/secrets/web2?ownerAddress=${vOwnerAddress}&secretName=${secretName}`;
      console.log("pushing secret to sms server");
      console.log("secretName: " + secretName);
      console.log("secretValue: " + token);
      console.log("auth: " + auth);


      const headers = new Headers();
      headers.append("Authorization", auth);
      //sent text/plain
      headers.append("Content-Type", "text/plain");

      // make the request
      const response = await fetch(url, {
        method: 'POST', body: token
        , headers: headers
      });

      if (!response.ok) {
        console.log(JSON.stringify(response));
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      else {
        //check if 204
        console.log(JSON.stringify(response));
        return true;
      }

    }
    catch (error) {
      return handleError(error, thunkAPI);
    }
  }
);












export const pushWeb3Secret = async (secretAddress: string, secretValue: string, signed_chall: string) => {
  // sign the challenge
  const signature = signed_chall;

  // create headers
  const headers = new Headers();
  headers.append("Authorization", signature);

  console.log("pushing secret to sms server");
  console.log("secretAddress: " + secretAddress);
  console.log("secretValue: " + secretValue);
  console.log("signature: " + signature);


  // make the request
  const response = await fetch(`${smsURL}/secrets/web3?secretAddress=${secretAddress}`, {
    method: 'POST',
    headers: headers,
    body: secretValue
  });

  if (!response.ok) {
    console.log(JSON.stringify(response));
    throw new Error(`HTTP error! status: ${response.status}`);
  } else {
    //check if 204
    console.log(JSON.stringify(response));

    //no response all ok
  }
}

//get getIExecStorageChallenge
export const getIExecStorageChallenge = async (address: string, chainId: string) => {
  try {
    const url = `${result_storageURL}/results/challenge?address=${address}&chainId=${chainId}`;
    console.log("challenge url: " + url);
    const response = await fetch(url);
    const data = await response.json();
    console.log("challenge data: " + JSON.stringify(data));


    if (response.ok) {
      return data;
    } else {
      throw new Error('Failed to login to iExec storage');
    }
  } catch (error) {
    console.error('Error logging in to iExec storage:', error);
    throw error;
  }
};

export const signIEExecStorageChallenge = async (challenge: any, privateKey: string) => {
  try {
    const typedData = challenge.data || challenge;
    const { domain, message } = typedData || {};
    const { EIP712Domain, ...types } = typedData.types || {};
    if (!domain || !types || !message) {
      throw Error('Unexpected challenge format');
    }
    const signer = new ethers.Wallet(privateKey, provider);
    const signature = await signer._signTypedData(domain, types, message)

    const hash = hashEIP712(typedData);
    const separator = '_';
    return hash
      .concat(separator)
      .concat(signature)
      .concat(separator)
      .concat(signer.address);
  } catch (error) {
    console.error('Error signing iExec storage challenge:', error);
    throw error;
  }
};








const getIExecMarketChallenge = async (address: string, chainId: string) => {
  try {
    const url = `${marketplaceURL}/challenge?address=${address}&chainId=${chainId}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.ok) {

      return data;
    } else {
      throw new Error('Failed to login to iExec');
    }
  } catch (error) {
    console.error('Error logging in to iExec:', error);
    throw error;
  }
};
const postDatasetOrder = async (order: any, chainId: string, signed_chall: string) => {
  try {
    const url = `${marketplaceURL}/datasetorders?chainId=${chainId}`;
    const headers = new Headers();
    headers.append("Authorization", signed_chall);
    headers.append("Content-Type", "application/json");

    console.log("posting dataset order to marketplace" + JSON.stringify(order));
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(order)
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      throw new Error(`Failed to post dataset order. Status: ${response.status}`);
    }
  } catch (error) {
    console.error('Error posting dataset order:', error);
    throw error;
  }
};
const postRequestOrder = async (order: any, chainId: string, signed_chall: string) => {
  try {
    const url = `${marketplaceURL}/requestorders?chainId=${chainId}`;
    const headers = new Headers();
    headers.append("Authorization", signed_chall);
    headers.append("Content-Type", "application/json");

    console.log("posting request order to marketplace" + JSON.stringify(order));
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(order)
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      throw new Error(`Failed to post dataset order. Status: ${response.status}`);
    }
  } catch (error) {
    console.error('Error posting dataset order:', error);
    throw error;
  }
};




export const hashEIP712 = (typedData: any) => {
  try {
    const { domain, message } = typedData;
    const { EIP712Domain, ...types } = typedData.types;
    // use experimental ether utils._TypedDataEncoder (to change when TypedDataEncoder is included)
    // https://docs.ethers.io/v5/api/utils/hashing/#TypedDataEncoder
    /* eslint no-underscore-dangle: ["error", { "allow": ["_TypedDataEncoder"] }] */
    return _TypedDataEncoder.hash(domain, types, message);
  } catch (error) {
    console.error('Error hashing EIP712:', error);
    throw error;
  }
};

export interface Metadata {
  location: PreciseLocation;
  parcel_id: number;
  user_id: number;
  action: string;
  timestamp: string;
  testingEnv?: boolean
}
export interface UploadMetadataToIPFSResponse {
  ipfsRes: IpfsData;
  aesKey: string;
  checksum: string;
}

export const uploadMetadataToIPFS = createAsyncThunk(
  'blockchain/uploadMetadataToIPFS',
  async (metadata: Metadata, thunkAPI): Promise<UploadMetadataToIPFSResponse> => {
    try {
      // Get the current state

      const isTestingEnv = metadata.testingEnv;

      //remve testing env from metadata
      delete metadata.testingEnv;

      const dataBuffer = Buffer.from(JSON.stringify(metadata));


      // Generate AES key
      const aesKey = generateAes256Key();
      console.log("aesKey: " + aesKey);

      // Encrypt data
      const encryptedData = await encryptAes256Cbc(dataBuffer, aesKey);
      console.log("Encrypted Data: " + encryptedData.toString('base64'));

      const checksum = await sha256Sum(encryptedData);
      console.log("checksum: " + checksum);

      let ipfsRes;
      if (isTestingEnv) {
        console.log("uploading to testing ipfs node");
        ipfsRes = await uploadToIPFSTesting(encryptedData);
      } else {
        ipfsRes = await uploadToIPFS(encryptedData);
      }
      console.log("ipfsRes: " + JSON.stringify(ipfsRes));
      // Return IPFS result along with other details
      return { ipfsRes, aesKey, checksum };
    } catch (error) {
      return handleError(error, thunkAPI);
    }
  }
);

// export const uploadMetadataToIPFS = createAsyncThunk(
//   'blockchain/uploadMetadataToIPFS',
//   async (metadata: Metadata, thunkAPI): Promise<UploadMetadataToIPFSResponse> => {
//     try {
//       // Get the current state

//       const isTestingEnv = metadata.testingEnv;

//       //remve testing env from metadata
//       delete metadata.testingEnv;





//       // Generate AES key
//       const aesKey = generateAes256Key();
//       console.log("aesKey: " + aesKey);

//       let ipfsRes;
//       if (isTestingEnv) {
//         const dataBuffer = Buffer.from(JSON.stringify(metadata));



//         // Encrypt data
//         const encryptedData = await encryptAes256Cbc(dataBuffer, aesKey);
//         console.log("Encrypted Data: " + encryptedData.toString('base64'));

//         const checksum = await sha256Sum(encryptedData);
//         console.log("checksum: " + checksum);
//         console.log("uploading to testing ipfs node");
//         ipfsRes = await uploadToIPFSTesting(encryptedData);
//       } else {
//         const aesKey = generateAes256Key();
//         ipfsRes = await uploadToIPFS(JSON.stringify(metadata), aesKey);
//       }
//       console.log("ipfsRes: " + JSON.stringify(ipfsRes));
//       console.log("ipfsRes.Hash: " + ipfsRes.Hash);
//       //console.log("checksum: " + checksum);
//       // Return IPFS result along with other details
//       return { ipfsRes, aesKey, checksum: ipfsRes.Checksum };
//     } catch (error) {
//       return handleError(error, thunkAPI);
//     }
//   }
// );

export const downloadMetadataFromIPFS = createAsyncThunk(
  'blockchain/downloadMetadataFromIPFS',
  async (address: string, thunkAPI): Promise<any> => {
    try {
      let ipfsRes = await downloadFromIPFS(iexecresultIPFSGateway + address);


      return ipfsRes;
    } catch (error) {
      return handleError(error, thunkAPI);
    }
  }
);

export interface CreateDataset {
  ipfsRes: IpfsData;
  aesKey: string;
  checksum: string;
}

export interface CreateDatasetResponse {
  txHash: string;
  aesKey: string;
  datasetAddress: string;
}




export const callCreateDataset = createAsyncThunk(
  'blockchain/callCreateDataset',
  async ({ ipfsRes, aesKey, checksum }: CreateDataset, thunkAPI): Promise<CreateDatasetResponse> => {
    try {
      // Get the current state
      const state = thunkAPI.getState() as RootState;

      // Get the wallet from the state
      const privateKey = state.blockchain.privateKey;

      // Check if the wallet exists
      if (!privateKey) {
        throw new Error("Wallet not found");
      }

      const wallet = new ethers.Wallet(privateKey, provider);

      const multiaddr = IPFSGateways.IExecGateway + ipfsRes.Hash;


      // Create a new contract instance using the wallet
      const contract = new ethers.Contract(iExecDatasetRegistryAddres, DatasetABI, wallet);

      const multiaddr_bytes = ethers.utils.toUtf8Bytes(multiaddr);
      console.log(`calling createDataset with args: owner=${wallet.address}, name=${ipfsRes.Name}, multiaddr=${multiaddr}, checksum=${checksum} , multiaddr_bytes=${multiaddr_bytes}`);

      /// Call the method on the contract
      const tx = await contract.createDataset(wallet.address, ipfsRes.Name, multiaddr_bytes, checksum, { gasPrice: 0, gasLimit: 1000000 });

      console.log(`tx: ${JSON.stringify(tx)}`);

      // Wait for the transaction to be confirmed
      const txReceipt = await tx.wait(1); // replace 1 with the number of confirmations you want to wait for

      console.log(`txReceipt: ${JSON.stringify(txReceipt)}`);

      // Extract Transfer event from the transaction receipt logs
      const transferEvent = txReceipt.events.find((event: { event: string; }) => event.event === 'Transfer');

      // If Transfer event is not found, throw an error
      if (!transferEvent) {
        throw new Error('Transfer event not found in transaction logs');
      }

      console.log(` transfer event: ${JSON.stringify(transferEvent)}`);
      console.log(` transfer event args: ${JSON.stringify(transferEvent.args)}`);

      // Extract tokenId from the arguments of the Transfer event
      const tokenId = transferEvent.args.tokenId;

      console.log(`Dataset created with tokenId: ${tokenId}`);

      // Convert tokenId into an address
      const address = tokenIdToAddress(tokenId); // replace with your actual conversion function

      console.log(`Dataset created with address: ${address}`);

      return { datasetAddress: address, aesKey, txHash: txReceipt.transactionHash } as CreateDatasetResponse;
    } catch (error) {
      return handleError(error, thunkAPI);
    }
  }
);


export interface PushToSMS {
  dataset_address: string;
  aesKey: string;
}

export const callPushToSMS = createAsyncThunk(
  'blockchain/callPushToSMS',
  async ({ dataset_address, aesKey }: PushToSMS, thunkAPI) => {
    try {
      // Get the current state
      const state = thunkAPI.getState() as RootState;

      // Get the wallet from the state
      const privateKey = state.blockchain.privateKey;

      // Check if the wallet exists
      if (!privateKey) {
        throw new Error("Wallet not found");

      }

      const wallet = new ethers.Wallet(privateKey, provider);



      const challenge = arrayify(getChallengeForSetWeb3Secret(dataset_address, aesKey));
      //sign challenge
      const signed_chall = await wallet.signMessage(challenge);
      //console.log("signed_chall: " + JSON.stringify(signed_chall));

      await pushWeb3Secret(dataset_address, aesKey, signed_chall);

      console.log("pushed web3 secret");

      return { dataset_address, aesKey };
    } catch (error) {
      return handleError(error, thunkAPI);
    }
  }
);

export interface SellDataset {
  dataset_address: string;
  price: number;
}

export const callSellDataset = createAsyncThunk(
  'blockchain/callSellDataset',
  async ({ dataset_address, price }: SellDataset, thunkAPI) => {
    try {
      // Get the current state
      const state = thunkAPI.getState() as RootState;

      // Get the wallet from the state
      const privateKey = state.blockchain.privateKey;

      // Check if the wallet exists
      if (!privateKey) {
        throw new Error("Wallet not found");
      }

      const wallet = new ethers.Wallet(privateKey, provider);

      const salt = hexlify(randomBytes(32));

      const salted_iexecMarketOrder = {

        "dataset": dataset_address,
        "datasetprice": price,
        "volume": "99999",  //number of allowed purchases
        "tag": "0x0000000000000000000000000000000000000000000000000000000000000003", //tee,scone
        "apprestrict": "0x0000000000000000000000000000000000000000", //TODO DEJ SAMO NA NAS DAPP
        "workerpoolrestrict": "0x0000000000000000000000000000000000000000",
        "requesterrestrict": "0x0000000000000000000000000000000000000000",
        "salt": salt,
        //"sign": "0x5c801076539228015eaffd0a5671ca376ed9f8fa2187648364acb13b9c22ce4b6218cf8f86eb19b3d8d13b29eae663a65624eaae08767d9c59929fa173cb90281b"
      }

      const typess = {
        'DatasetOrder': [
          { name: 'dataset', type: 'address' },
          { name: 'datasetprice', type: 'uint256' },
          { name: 'volume', type: 'uint256' },
          { name: 'tag', type: 'bytes32' },
          { name: 'apprestrict', type: 'address' },
          { name: 'workerpoolrestrict', type: 'address' },
          { name: 'requesterrestrict', type: 'address' },
          { name: 'salt', type: 'bytes32' },
        ]
      };

      const tokencontract = new ethers.Contract(hub_addres, TokenABI, wallet);

      //call .domain on the contract to get the EIP712Domain for signing the order
      const domainn = await tokencontract.domain();
      console.log("tokencontract3");

      const EIP712Domainn = {
        name: domainn.name,
        version: domainn.version,
        chainId: domainn.chainId.toString(),
        verifyingContract: domainn.verifyingContract,
      };
      console.log("EIP712Domain: " + JSON.stringify(EIP712Domainn));

      const signer = wallet;

      const sign = await signer._signTypedData(EIP712Domainn, typess, salted_iexecMarketOrder);

      //get hash
      const hash = await _TypedDataEncoder.hash(EIP712Domainn, typess, salted_iexecMarketOrder);
      console.log("hash: " + hash);

      //call .verifySignature on the contract
      const isVerified = await tokencontract.verifySignature(wallet.address, hash, sign);
      console.log("isVerified: " + isVerified);
      console.log("salted_iexecMarketOrder: " + sign);

      const iexecMarketOrder = { ...salted_iexecMarketOrder, sign };
      console.log("iexecMarketOrder: " + JSON.stringify(iexecMarketOrder));


      //sell dataset
      const iexecMarketChallenge = await getIExecMarketChallenge(wallet.address, chainId);
      console.log("iexecMarketChallenge: " + iexecMarketChallenge);

      const typedData = iexecMarketChallenge.data || iexecMarketChallenge;
      const { domain, message } = typedData || {};
      const { EIP712Domain, ...types } = typedData.types || {};

      const signature = await wallet._signTypedData(domain, types, message);
      const hash2 = hashEIP712(typedData);
      const separator = '_'
      const iexecMarketSignature = hash2
        .concat(separator)
        .concat(signature)
        .concat(separator)
        .concat(wallet.address);

      console.log("final: " + iexecMarketSignature);


      console.log("iexecMarketSignature: " + iexecMarketSignature);

      const ordr = { order: iexecMarketOrder };

      const sell_res = await postDatasetOrder(ordr, chainId, iexecMarketSignature);

      console.log("sell_res: " + JSON.stringify(sell_res));

      return sell_res;
    } catch (error) {
      return handleError(error, thunkAPI);
    }
  }
);














// callDatasetContract
export const callDatasetContract = createAsyncThunk(
  'blockchain/callDatasetContract',
  async (testingEnv: boolean = true, thunkAPI) => {
    try {
      // Get the current state
      const state = thunkAPI.getState() as RootState;

      // Get the wallet from the state
      const privateKey = state.blockchain.privateKey;

      // Check if the wallet exists
      if (!privateKey) {
        throw new Error("Wallet not found");
      }

      // Create a new wallet instance
      const wallet = new ethers.Wallet(privateKey, provider);

      const somedata = {
        "location": "test",
        "timestamp": Date.now().toString() //ensure that each dataset created is unique so it doesent fail to upload

      }
      const dataBuffer = Buffer.from(JSON.stringify(somedata));

      // Generate AES key
      const aesKey = generateAes256Key();
      console.log("aesKey: " + aesKey);

      // Encrypt data
      const encryptedData = await encryptAes256Cbc(dataBuffer, aesKey);

      console.log("Encrypted Data: " + encryptedData.toString('base64'));

      const checksum = await sha256Sum(encryptedData);

      console.log("checksum: " + checksum);

      //https://github.dev/iExecBlockchainComputing/iexec-sdk/blob/be1e84fbeada087a05d6fbfa1fd0711caea7d188/src/common/utils/config.js



      if (testingEnv) {
        console.log("uploading to testing ipfs node");
        var ipfsRes = await uploadToIPFSTesting(encryptedData);


      } else {

        var ipfsRes = await uploadToIPFS(encryptedData); //NOTE THIS FUNCTION IS SPECIFIC TO THE TESTING IPFS NODE
      }

      //check if the checksum matches



      console.log("ipfsUrl: " + IPFSGateways.IExecGateway + ipfsRes.Hash);

      const multiaddr = IPFSGateways.IExecGateway + ipfsRes.Hash;


      // Create a new contract instance using the wallet
      const contract = new ethers.Contract('0x799DAa22654128d0C64d5b79eac9283008158730', DatasetABI, wallet);

      const multiaddr_bytes = ethers.utils.toUtf8Bytes(multiaddr);
      console.log(`calling dataset method with args: owner=${wallet.address}, name=${ipfsRes.Name}, multiaddr=${multiaddr}, checksum=${checksum} , multiaddr_bytes=${multiaddr_bytes}`);
      //ptint types of args
      console.log("typeof args.multiaddr: " + typeof multiaddr);
      console.log("typeof args.checksum: " + typeof checksum);
      console.log("typeof multiaddr_bytes: " + typeof multiaddr_bytes);
      console.log("typeof ipfsRes.Name: " + typeof ipfsRes.Name);
      console.log("typeof wallet.address: " + typeof wallet.address);


      /// Call the method on the contract
      const tx = await contract.createDataset(wallet.address, ipfsRes.Name, multiaddr_bytes, checksum, { gasPrice: 0, gasLimit: 1000000 });

      // Wait for the transaction to be confirmed
      const txReceipt = await tx.wait(1); // replace 1 with the number of confirmations you want to wait for

      // Extract Transfer event from the transaction receipt logs
      const transferEvent = txReceipt.events.find((event: { event: string; }) => event.event === 'Transfer');

      // If Transfer event is not found, throw an error
      if (!transferEvent) {
        throw new Error('Transfer event not found in transaction logs');
      }

      console.log(` transfer event: ${JSON.stringify(transferEvent)}`);
      console.log(` transfer event args: ${JSON.stringify(transferEvent.args)}`);

      // Extract tokenId from the arguments of the Transfer event
      const tokenId = transferEvent.args.tokenId;

      console.log(`Dataset created with tokenId: ${tokenId}`);

      // Convert tokenId into an address
      const address = tokenIdToAddress(tokenId); // replace with your actual conversion function

      console.log(`Dataset created with address: ${address}`);






      //push SMS https://sms.scone-prod.v8-bellecour.iex.ec TEE_FRAMEWORKS.SCONE tee,scone

      const challenge = arrayify(getChallengeForSetWeb3Secret(address, aesKey));
      //sign challenge
      const signed_chall = await wallet.signMessage(challenge);
      //console.log("signed_chall: " + JSON.stringify(signed_chall));

      await pushWeb3Secret(address, aesKey, signed_chall);

      console.log("pushed web3 secret");









      const salt = hexlify(randomBytes(32));
      console.log("rrrrrrrrrr");




      const salted_iexecMarketOrder = {

        "dataset": address,
        "datasetprice": "0", //free for all users
        "volume": "10",  //number of allowed purchases
        "tag": "0x0000000000000000000000000000000000000000000000000000000000000003", //tee,scone
        "apprestrict": "0x0000000000000000000000000000000000000000", //TODO DEJ SAMO NA NAS DAPP
        "workerpoolrestrict": "0x0000000000000000000000000000000000000000",
        "requesterrestrict": "0x0000000000000000000000000000000000000000",
        "salt": salt,
        //"sign": "0x5c801076539228015eaffd0a5671ca376ed9f8fa2187648364acb13b9c22ce4b6218cf8f86eb19b3d8d13b29eae663a65624eaae08767d9c59929fa173cb90281b"

      }

      const typess = {
        'DatasetOrder': [
          { name: 'dataset', type: 'address' },
          { name: 'datasetprice', type: 'uint256' },
          { name: 'volume', type: 'uint256' },
          { name: 'tag', type: 'bytes32' },
          { name: 'apprestrict', type: 'address' },
          { name: 'workerpoolrestrict', type: 'address' },
          { name: 'requesterrestrict', type: 'address' },
          { name: 'salt', type: 'bytes32' },
        ]
      };

      //getEIP712Domain
      //   {
      //     name,
      //     version,
      //     chainId,
      //     verifyingContract,
      //   } = contract.domain;


      const tokencontract = new ethers.Contract(hub_addres, TokenABI, wallet);

      //check if undef

      console.log("tokencontract");

      //call .domain on the contract
      const domainn = await tokencontract.domain();
      console.log("tokencontract3");
      const EIP712Domainn = {
        name: domainn.name,
        version: domainn.version,
        chainId: domainn.chainId.toString(),
        verifyingContract: domainn.verifyingContract,
      };
      console.log("EIP712Domain: " + JSON.stringify(EIP712Domainn));

      const signer = wallet;

      const sign = await signer._signTypedData(EIP712Domainn, typess, salted_iexecMarketOrder);

      //get hash
      const hash = await _TypedDataEncoder.hash(EIP712Domainn, typess, salted_iexecMarketOrder);

      console.log("hash: " + hash);

      //call .verifySignature on the contract
      const isVerified = await tokencontract.verifySignature(wallet.address, hash, sign);
      console.log("isVerified: " + isVerified);




      console.log("salted_iexecMarketOrder: " + sign);

      const iexecMarketOrder = { ...salted_iexecMarketOrder, sign };

      console.log("iexecMarketOrder: " + JSON.stringify(iexecMarketOrder));


      //sell dataset
      const iexecMarketChallenge = await getIExecMarketChallenge(wallet.address, chainId);
      console.log("iexecMarketChallenge: " + iexecMarketChallenge);

      const typedData = iexecMarketChallenge.data || iexecMarketChallenge;
      const { domain, message } = typedData || {};
      const { EIP712Domain, ...types } = typedData.types || {};

      const signature2 = await wallet._signTypedData(domain, types, message);
      const hash2 = hashEIP712(typedData);
      const separator = '_'
      const iexecMarketSignature = hash2
        .concat(separator)
        .concat(signature2)
        .concat(separator)
        .concat(wallet.address);

      console.log("final: " + iexecMarketSignature);


      console.log("iexecMarketSignature: " + iexecMarketSignature);

      const ordr = { order: iexecMarketOrder };

      const sell_res = await postDatasetOrder(ordr, chainId, iexecMarketSignature);

      console.log("sell_res: " + JSON.stringify(sell_res));

      return { address, txHash: txReceipt.transactionHash };




    }
    catch (error) {
      if (error instanceof Error) {
        // If the error is an instance of Error, handle it
        return thunkAPI.rejectWithValue(error.message);
      } else {
        console.log("error: " + error);
        // If the error is not an instance of Error, handle it differently
        return thunkAPI.rejectWithValue('An unknown error occurred');
      }
    }
  }
);






//klici mitnt na dldm ali update box po dataset orderju
///odpriranje + zapiranje je transakcija   init dostave pa je mint 
//

export interface MintBox {
  reciever_address: string;
  parcel_id: string;
  dataset: string;
}
export interface MintBoxResponse {
  tokenId: string, txHash: string;
}

//mint parcel
export const mintBox = createAsyncThunk(
  'blockchain/mintParcel',
  async (mintBox: MintBox, thunkAPI): Promise<MintBoxResponse> => {
    try {
      // Get the current state
      const state = thunkAPI.getState() as RootState;

      // Get the wallet from the state
      const privateKey = state.blockchain.privateKey;

      // Check if the wallet exists
      if (!privateKey) {
        throw new Error("Wallet not found");
      }


      const wallet = new ethers.Wallet(privateKey, provider);

      const contract = new ethers.Contract(parcelNFTSCAddress, parcelNFTSC_ABI, wallet);
      //mint(_reciever,_uuid,parcel_id,_dataset)
      //random address
      console.log("wallet.address: " + wallet.address);
      console.log("calling mintParcel with args: " + mintBox.reciever_address + " " + mintBox.parcel_id + " " + mintBox.dataset);
      // console.log("reciever_address type: " + typeof mintParcel.reciever_address);
      // console.log("uuid type: " + typeof mintParcel.uuid);
      // console.log("parcel_id type: " + typeof mintParcel.parcel_id);
      // console.log("dataset type: " + typeof mintParcel.dataset);

      const tx = await contract.mint(mintBox.reciever_address, mintBox.parcel_id, mintBox.dataset, { gasLimit: 1000000 });

      //wait for tx to be mined
      const txReceipt = await tx.wait(1);

      const transferEvent = txReceipt.events.find((event: { event: string; }) => event.event === 'Transfer');

      console.log("transferEvent: " + JSON.stringify(transferEvent));

      // If Transfer event is not found, throw an error
      if (!transferEvent) {
        throw new Error('Transfer event not found in transaction logs');
      }

      console.log(`transfer event args: ${JSON.stringify(transferEvent.args)}`);


      // Extract tokenId from the arguments of the Transfer event
      //big number tp string
      const tokenId = transferEvent.args.tokenId.toString();

      console.log(`tokenId: ${tokenId}`);

      // Convert tokenId into an address



      console.log("txReceipt: " + JSON.stringify(txReceipt));





      return { tokenId: tokenId, txHash: txReceipt.transactionHash } as MintBoxResponse;


    }
    catch (error) {
      return handleError(error, thunkAPI);
    }

  }
);



export interface ApproveTransfer {
  to: string;
  tokenId: string; //nft id
}
export interface ApproveTransferResponse {
  tokenId: string, txHash: string, owner: string, approved: string;
}

//user approves the other user to transfer the NFT to himself
export const approveTransfer = createAsyncThunk(
  'blockchain/approveTransfer',
  async (approveTransfer: ApproveTransfer, thunkAPI): Promise<ApproveTransferResponse> => {
    try {
      // Get the current state
      const state = thunkAPI.getState() as RootState;

      // Get the wallet from the state
      const privateKey = state.blockchain.privateKey;

      // Check if the wallet exists
      if (!privateKey) {
        throw new Error("Wallet not found");
      }


      const wallet = new ethers.Wallet(privateKey, provider);

      const contract = new ethers.Contract(parcelNFTSCAddress, parcelNFTSC_ABI, wallet);

      console.log("calling approve with args: " + approveTransfer.to + " " + approveTransfer.tokenId);

      const tx = await contract.approve(approveTransfer.to, approveTransfer.tokenId, { gasLimit: 1000000 });

      //wait for tx to be mined
      const txReceipt = await tx.wait(1);

      const approvalEvent = txReceipt.events.find((event: { event: string; }) => event.event === 'Approval');


      console.log("approvalEvent: " + JSON.stringify(approvalEvent));
      // If Transfer event is not found, throw an error
      if (!approvalEvent) {

        throw new Error('Approval event not found in transaction logs');
      }


      //TODODO
      console.log(`approvalEvent event args: ${JSON.stringify(approvalEvent.args)}`);


      // Extract tokenId from the arguments of the Transfer event
      //big number tp string
      const tokenId = approvalEvent.args.tokenId.toString();
      const owner = approvalEvent.args.owner.toString();
      const approved = approvalEvent.args.approved.toString();

      console.log(`tokenId: ${tokenId}`);
      console.log(`owner: ${owner}`);
      console.log(`approved: ${approved}`);

      // Convert tokenId into an address

      console.log("txReceipt: " + JSON.stringify(txReceipt));

      return { tokenId: tokenId, txHash: txReceipt.transactionHash, owner: owner, approved: approved } as ApproveTransferResponse;


    }
    catch (error) {
      return handleError(error, thunkAPI);
    }

  }
);

export interface UpdateBox {
  tokenId: string; //nft id
  dataset: string; //new dataset
  transferOwnership: boolean; //if true, transfer ownership to new owner called when box is closed

}
export interface UpdateBoxResponse {
  tx_data: string, txHash: string;

}
//user approves the other user to transfer the NFT to himself
export const updateBox = createAsyncThunk(
  'blockchain/updateBox',
  async (updateBox: UpdateBox, thunkAPI): Promise<UpdateBoxResponse> => {
    try {
      // Get the current state
      const state = thunkAPI.getState() as RootState;

      // Get the wallet from the state
      const privateKey = state.blockchain.privateKey;

      // Check if the wallet exists
      if (!privateKey) {
        throw new Error("Wallet not found");
      }


      const wallet = new ethers.Wallet(privateKey, provider);

      const contract = new ethers.Contract(parcelNFTSCAddress, parcelNFTSC_ABI, wallet);

      console.log("calling updateBox with args: " + updateBox.tokenId + " " + updateBox.dataset + " " + updateBox.transferOwnership);

      const tx = await contract.updateBox(updateBox.tokenId, updateBox.dataset, updateBox.transferOwnership, { gasLimit: 1000000 });

      //wait for tx to be mined
      const txReceipt = await tx.wait(1);

      //expext transfer event if transferOwnership is true
      if (updateBox.transferOwnership) {
        const transferEvent = txReceipt.events.find((event: { event: string; }) => event.event === 'Transfer');

        console.log("transferEvent: " + JSON.stringify(transferEvent));
        // If Transfer event is not found, throw an error
        if (!transferEvent) {
          throw new Error('Transfer event not found in transaction logs');
        }
      }






      console.log("txReceipt: " + JSON.stringify(txReceipt));
      const tx_hash = txReceipt.transactionHash;

      return {
        tx_data: JSON.stringify(txReceipt), txHash: tx_hash

      } as UpdateBoxResponse;

    }
    catch (error) {
      return handleError(error, thunkAPI);
    }

  }
);

export interface Dataset {
  dataset: string;
  datasetprice: number;
  volume: number;
  tag: string;
  apprestrict: string;
  workerpoolrestrict: string;
  requesterrestrict: string;
  salt: string;
  sign: string;
  orderHash: string;
  chainId: number;
  publicationTimestamp: string;
  signer: string;
  status: string;
  remaining: number;
}


export const getDatasetOrder = createAsyncThunk(
  'blockchain/getDatasetOrder',
  async (dataset_address: string, thunkAPI): Promise<Dataset> => {
    try {
      // Get the current state
      const state = thunkAPI.getState() as RootState;

      // Get the wallet from the state
      const privateKey = state.blockchain.privateKey;

      // Check if the wallet exists
      if (!privateKey) {
        throw new Error("Wallet not found");
      }


      const wallet = new ethers.Wallet(privateKey, provider);
      const query = {
        "chainId": chainId,
        "app": DLMDApp,
        "dataset": dataset_address,
        "workerpool": "0xdb214a4A444D176e22030bE1Ed89dA1b029320f2", //debug workerpool
        "requester": wallet.address,
        "minTag": "0x0000000000000000000000000000000000000000000000000000000000000003",
        "maxTag": "0x0000000000000000000000000000000000000000000000000000000000000003"
      }

      //fetch datasetOrder of dataset

      const GETdatasetOrder = await fetch(marketplaceURL + '/datasetorders?' + objToQueryString(query), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!GETdatasetOrder.ok) {
        console.log(GETdatasetOrder);
        throw new Error("Error fetching datasetOrder");
      }

      let response = await GETdatasetOrder.json()
      let orderData = response.orders[0];
      let order = orderData && orderData.order;

      if (!order) {
        throw new Error("No datasetOrder found");
      }

      let dataset = {
        ...orderData,
        ...order
      };

      console.log("dataset: " + JSON.stringify(dataset));

      return dataset as Dataset;

    }
    catch (error) {
      return handleError(error, thunkAPI);
    }
  }
);

export const getBoxDatasets = createAsyncThunk(
  'blockchain/getBoxDatasets',
  async (tokenId: string, thunkAPI) => {
    try {
      // Get the current state
      const state = thunkAPI.getState() as RootState;

      // Get the wallet from the state
      const privateKey = state.blockchain.privateKey;

      // Check if the wallet exists
      if (!privateKey) {
        throw new Error("Wallet not found");
      }


      const wallet = new ethers.Wallet(privateKey, provider);

      const contract = new ethers.Contract(parcelNFTSCAddress, parcelNFTSC_ABI, wallet);

      console.log("calling getBoxDatasets with args: " + "tokenId: " + tokenId);
      const datasets = await contract.getBoxDatasets(tokenId) as string[]
      //array "0xA69daC123F22F6Ac24eB42C7a0DBeCC326159209,0xA69daC123F22F6Ac24eB42C7a0DBeCC326159209,0xA69daC123F22F6Ac24eB42C7a0DBeCC326159209"

      console.log("datasets: " + datasets);

      return datasets;








    }
    catch (error) {
      if (error instanceof Error) {
        // If the error is an instance of Error, handle it
        return thunkAPI.rejectWithValue(error.message);
      } else {
        // If the error is not an instance of Error, handle it differently
        return thunkAPI.rejectWithValue('An unknown error occurred');

      }
    }

  }
);

//reputation system

//set reputation
export const setReputation = createAsyncThunk(
  'blockchain/setReputation',
  async ({ user, score }: { user: string, score: number }, thunkAPI) => {
    try {
      // Get the current state
      const state = thunkAPI.getState() as RootState;

      // Get the wallet from the state
      const privateKey = state.blockchain.privateKey;

      // Check if the wallet exists
      if (!privateKey) {
        throw new Error("Wallet not found");
      }

      //call  addScore
      const wallet = new ethers.Wallet(privateKey, provider);

      const contract = new ethers.Contract(reputationSCAddress, reputationSC_ABI, wallet);

      console.log("calling addScore with args: " + "user: " + user + " score: " + score);

      //multiply score to get wei
      const scoreBigNumber = ethers.BigNumber.from(score).mul(ethers.BigNumber.from('1000000000000000000'));


      const tx = await contract.addScore(user, scoreBigNumber, { gasLimit: 1000000 });

      //wait for tx to be mined
      const txReceipt = await tx.wait(1);
      console.log("txReceipt: " + JSON.stringify(txReceipt));
      return { txHash: txReceipt.transactionHash };


    }
    catch (error) {

      return handleError(error, thunkAPI);

    }
  }
);

//get reputation
export const getReputation = createAsyncThunk(
  'blockchain/getReputation',
  async (address: string, thunkAPI) => {
    try {

      console.log("calling getReputation with args: " + "address: " + address);
      // Get the current state
      // Get the current state
      const state = thunkAPI.getState() as RootState;

      // Get the wallet from the state
      const privateKey = state.blockchain.privateKey;

      // Check if the wallet exists
      if (!privateKey) {
        throw new Error("Wallet not found");
      }

      //call  addScore
      const wallet = new ethers.Wallet(privateKey, provider);

      const contract = new ethers.Contract(reputationSCAddress, reputationSC_ABI, wallet);

      const res = await contract.reputation(address);
      const score = ethers.utils.formatUnits(res[0], 18);
      const cnt = ethers.utils.formatUnits(res[1], 'wei'); // Converts a BigNumber to a decimal string.

      console.log("score: " + score + " cnt: " + cnt);

      return Math.round(parseFloat(score) * 100) / 100; // round the score to two decimal places
    }
    catch (error) {
      return handleError(error, thunkAPI);

    }
  }
);

//GET balance
export const getBalance = createAsyncThunk(
  'blockchain/getBalance',
  async (address: string, thunkAPI) => {
    try {

      console.log("calling getBalance with args: " + "address: " + address);
      // Get the current state
      // Get the current state
      const state = thunkAPI.getState() as RootState;

      // Get the wallet from the state
      const privateKey = state.blockchain.privateKey;

      // Check if the wallet exists
      if (!privateKey) {
        throw new Error("Wallet not found");
      }

      //call  addScore
      const wallet = new ethers.Wallet(privateKey, provider);

      const tokencontract = new ethers.Contract(hub_addres, TokenABI, wallet);

      const res = await tokencontract.balanceOf(address);
      const balance = ethers.utils.formatUnits(res, 'wei'); // Converts a BigNumber to a decimal string.

      console.log("balance: " + balance);

      return parseFloat(balance)
    }
    catch (error) {
      return handleError(error, thunkAPI);

    }
  }
);





//getOwnerOfNft
export const getOwnerOfNft = createAsyncThunk(
  'blockchain/getOwnerOfNft',
  async (tokenId: string, thunkAPI) => {
    try {
      // Get the current state
      const state = thunkAPI.getState() as RootState;

      // Get the wallet from the state
      const privateKey = state.blockchain.privateKey;

      // Check if the wallet exists
      if (!privateKey) {
        throw new Error("Wallet not found");
      }

      //call  addScore
      const wallet = new ethers.Wallet(privateKey, provider);

      const contract = new ethers.Contract(parcelNFTSCAddress, parcelNFTSC_ABI, wallet);

      console.log("calling getOwnerOfNft with args: " + "tokenId: " + tokenId);
      const owner = await contract.ownerOf(tokenId) as string;

      console.log("owner: " + owner);

      return owner;

    }
    catch (error) {
      return handleError(error, thunkAPI);
    }
  }
);
//getNftDetails
export const getNftDetails = createAsyncThunk(
  'blockchain/getNftDetails',
  async (tokenId: string, thunkAPI): Promise<{ parcelId: string, sender: string, receiver: string }> => {
    try {
      // Get the current state
      const state = thunkAPI.getState() as RootState;

      // Get the wallet from the state
      const privateKey = state.blockchain.privateKey;

      // Check if the wallet exists
      if (!privateKey) {
        throw new Error("Wallet not found");
      }

      //call  addScore
      const wallet = new ethers.Wallet(privateKey, provider);

      const contract = new ethers.Contract(parcelNFTSCAddress, parcelNFTSC_ABI, wallet);

      console.log("calling getNftDetails with args: " + "tokenId: " + tokenId);
      const {
        parcelId,
        sender,
        receiver
      } = await contract.boxes(tokenId) as { parcelId: string, sender: string, receiver: string };




      console.log("details: " + JSON.stringify({
        parcelId,
        sender,
        receiver
      }));



      return {
        parcelId,
        sender,
        receiver
      };

    }
    catch (error) {
      return handleError(error, thunkAPI);
    }
  }
);

function objToQueryString(obj: any) {
  const keyValuePairs = [];
  for (let i = 0; i < Object.keys(obj).length; i += 1) {
    const key = encodeURIComponent(Object.keys(obj)[i]);
    const value = encodeURIComponent(Object.values(obj)[i] as string);
    keyValuePairs.push(`${key}=${value}`);
  }
  console.log("keyValuePairs: " + keyValuePairs);
  console.log("keyValuePairs.join('&'): " + keyValuePairs.join('&'));
  return keyValuePairs.join('&');
}

export const runApp = createAsyncThunk(
  'blockchain/runApp',
  async ({ tokenId, dataset, price }: { tokenId: string, dataset: string, price: number }, thunkAPI): Promise<{ dealId: string, volume: number, txHash: string, tasks: string[] }> => {
    try {


      const state = thunkAPI.getState() as RootState;

      // Get the wallet from the state
      const privateKey = state.blockchain.privateKey;

      // Check if the wallet exists
      if (!privateKey) {
        throw new Error("Wallet not found");
      }

      const wallet = new ethers.Wallet(privateKey, provider);


      //fetch appOrder of DLMDApp

      const query = {
        "chainId": chainId,
        "app": DLMDApp,
        "dataset": dataset,
        "workerpool": "0xdb214a4A444D176e22030bE1Ed89dA1b029320f2", //debug workerpool
        "requester": wallet.address,
        "minTag": "0x0000000000000000000000000000000000000000000000000000000000000003",
        "maxTag": "0x0000000000000000000000000000000000000000000000000000000000000003"
      }

      const GETappOrder = await fetch(marketplaceURL + '/apporders?' + objToQueryString(query), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!GETappOrder.ok) {
        console.log(GETappOrder);
        throw new Error("Error fetching appOrder");
      }

      let appOrder = await GETappOrder.json()
      appOrder = appOrder.orders[0] && appOrder.orders[0].order;

      if (!appOrder) {
        throw new Error("No appOrder found");
      }


      console.log("appOrderJson: " + JSON.stringify(appOrder));


      //fetch datasetOrder of dataset

      const GETdatasetOrder = await fetch(marketplaceURL + '/datasetorders?' + objToQueryString(query), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!GETdatasetOrder.ok) {
        console.log(GETdatasetOrder);
        throw new Error("Error fetching datasetOrder");
      }

      let datasetOrder = await GETdatasetOrder.json()
      datasetOrder = datasetOrder.orders[0] && datasetOrder.orders[0].order;

      if (!datasetOrder) {
        throw new Error("No datasetOrder found");
      }



      console.log("datasetOrderJson: " + JSON.stringify(datasetOrder));


      //fetch workerpoolOrder of workerpool
      let workpool_query = { ...query, "category": "0" }


      console.log("workpool_query: " + JSON.stringify(workpool_query));

      const GETworkerpoolOrder = await fetch(marketplaceURL + '/workerpoolorders?' + objToQueryString(workpool_query), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!GETworkerpoolOrder.ok) {
        console.log(GETworkerpoolOrder);
        throw new Error("Error fetching workerpoolOrder");
      }

      let { orders: workerpoolOrder } = await GETworkerpoolOrder.json()

      if (!workerpoolOrder) {
        throw new Error("No workerpoolOrder found");
      }

      console.log("workerpoolOrderJson: " + JSON.stringify(workerpoolOrder));
      //get the first workerpoolOrder with status open

      const firstOpenworkerpoolOrder = workerpoolOrder.find((order: any) => order.status === 'open'); //TODO not the SDK WAY they call smartcontract and check
      //they increment category too to find the next workerpoolOrder



      if (!firstOpenworkerpoolOrder) {
        throw new Error("No open workerpoolOrder found");
      }

      console.log("firstOpenworkerpoolOrder: " + JSON.stringify(firstOpenworkerpoolOrder));

      const salt = hexlify(randomBytes(32));


      const salted_iexecRequestOrder = {

        "app": DLMDApp,
        "appmaxprice": 0,
        "dataset": dataset,
        "datasetmaxprice": 0,
        "workerpool": "0xdb214a4A444D176e22030bE1Ed89dA1b029320f2", //TODO REMOVE HARDCODE
        "workerpoolmaxprice": 0,
        "requester": wallet.address,
        "volume": 1,
        "tag": "0x0000000000000000000000000000000000000000000000000000000000000003",
        "category": 0,
        "trust": 0,
        "beneficiary": wallet.address,
        "callback": "0x0000000000000000000000000000000000000000", //todo explore beneficiary and callback
        "params": '{"iexec_args": "' + tokenId + '","iexec_result_storage_provider": "ipfs","iexec_result_storage_proxy": "https://result.v8-bellecour.iex.ec"}',
        "salt": salt,
      }

      const typess = {
        'RequestOrder': [
          { name: 'app', type: 'address' },
          { name: 'appmaxprice', type: 'uint256' },
          { name: 'dataset', type: 'address' },
          { name: 'datasetmaxprice', type: 'uint256' },
          { name: 'workerpool', type: 'address' },
          { name: 'workerpoolmaxprice', type: 'uint256' },
          { name: 'requester', type: 'address' },
          { name: 'volume', type: 'uint256' },
          { name: 'tag', type: 'bytes32' },
          { name: 'category', type: 'uint256' },
          { name: 'trust', type: 'uint256' },
          { name: 'beneficiary', type: 'address' },
          { name: 'callback', type: 'address' },
          { name: 'params', type: 'string' },
          { name: 'salt', type: 'bytes32' },
        ]
      };

      const tokencontract = new ethers.Contract(hub_addres, TokenABI, wallet);

      //call .domain on the contract to get the EIP712Domain for signing the order
      const domainn = await tokencontract.domain();

      const EIP712Domainn = {
        name: domainn.name,
        version: domainn.version,
        chainId: domainn.chainId.toString(),
        verifyingContract: domainn.verifyingContract,
      };
      console.log("EIP712Domain: " + JSON.stringify(EIP712Domainn));

      const signer = wallet;

      const sign = await signer._signTypedData(EIP712Domainn, typess, salted_iexecRequestOrder);

      const hash = await _TypedDataEncoder.hash(EIP712Domainn, typess, salted_iexecRequestOrder);
      console.log("hash: " + hash);

      //call .verifySignature on the contract
      const isVerified = await tokencontract.verifySignature(wallet.address, hash, sign);
      console.log("isVerified: " + isVerified);
      console.log("salted_iexecRequestOrder: " + sign);

      const iexecRequestOrder = { ...salted_iexecRequestOrder, sign };
      console.log("iexecRequestOrder: " + JSON.stringify(iexecRequestOrder));




      const appOrderStruct = signedOrderToStruct(
        APP_ORDER,
        appOrder);

      const datasetOrderStruct = signedOrderToStruct(
        DATASET_ORDER,
        datasetOrder,
      );
      const workerpoolOrderStruct = signedOrderToStruct(
        WORKERPOOL_ORDER,
        firstOpenworkerpoolOrder.order,
      );
      const requestOrderStruct = signedOrderToStruct(
        REQUEST_ORDER,
        iexecRequestOrder,
      );

      console.log("appOrderStruct: " + JSON.stringify(appOrderStruct));
      console.log("datasetOrderStruct: " + JSON.stringify(datasetOrderStruct));
      console.log("workerpoolOrderStruct: " + JSON.stringify(workerpoolOrderStruct));
      console.log("requestOrderStruct: " + JSON.stringify(requestOrderStruct));




      const iexecContract = new ethers.Contract(hub_addres, TokenABI, wallet);
      const tx = await
        iexecContract.matchOrders(
          appOrderStruct,
          datasetOrderStruct,
          workerpoolOrderStruct,
          requestOrderStruct,
          { gasLimit: 1000000 },

        );

      const receipt = await tx.wait(1);

      //check for  'OrdersMatched';

      const OrdersMatchedEvent = receipt.events.find((event: { event: string; }) => event.event === 'OrdersMatched');

      if (!OrdersMatchedEvent) {
        throw new Error("No OrdersMatched event found");
      }

      console.log("OrdersMatchedEvent: " + JSON.stringify(OrdersMatchedEvent));

      //get args names and values
      const { dealid, volume }: { dealid: string, volume: string } = OrdersMatchedEvent.args;

      console.log("dealid: " + dealid);
      console.log("volume: " + volume);

      //bignumber to int
      const volumeInt = parseInt(volume, 10);

      //console.log("receipt: " + JSON.stringify(receipt));

      //call viewDeal
      const deal = await iexecContract.viewDeal(dealid);

      const dealExists =
        deal && deal.app && deal.app.pointer && deal.app.pointer !== NULL_ADDRESS;

      if (!dealExists) {
        throw new Error("Deal not found");
      }

      console.log("deal: " + JSON.stringify(deal));

      const computeTaskId = async (
        dealid: any,
        taskIdx: any
      ) => {
        try {
          const encodedTypes = ['bytes32', 'uint256'];
          const values = [
            dealid,
            taskIdx
          ];
          const encoded = defaultAbiCoder.encode(encodedTypes, values);
          return keccak256(encoded);
        } catch (error) {
          throw error;
        }
      };


      const tasksIdx = [...Array(deal.botSize.toString()).keys()].map((n) => n + deal.botFirst.toString());
      const tasks = await Promise.all(tasksIdx.map((idx) => computeTaskId(dealid, idx)));




      return { dealId: dealid, volume: volumeInt, txHash: receipt.transactionHash, tasks: tasks };














    }
    catch (error) {
      return handleError(error, thunkAPI);
    }
  }
);

export const TASK_STATUS_MAP = {
  0: 'UNSET',
  1: 'ACTIVE',
  2: 'REVEALING',
  3: 'COMPLETED',
  4: 'FAILED',
  timeout: 'TIMEOUT',
};

export type TaskData = {
  taskId: string;
  statusName: string;
  taskTimedOut: boolean;
  results: any; // replace 'any' with the actual type of your result
  replicateStatus: {
    status: string;
    date: Date;

  }[]
};


// export const getTaskDataOffChain = createAsyncThunk(
//   'blockchain/getTaskDataOffChain',




//thunk for checking progress of tasks
export const monitorTaskProgress = createAsyncThunk(
  'blockchain/monitorTaskProgress',
  async ({ tasks }: { tasks: string[] }, thunkAPI): Promise<{ tasksCompleted: number, tasksFailed: number, tasksTimeout: number, tasksData: TaskData[] }> => {
    try {

      // Get the current state
      const state = thunkAPI.getState() as RootState;

      // Get the wallet from the state
      const privateKey = state.blockchain.privateKey;

      // Check if the wallet exists
      if (!privateKey) {
        throw new Error("Wallet not found");
      }



      const decodeTaskResult = (results: any) => {
        try {
          if (results !== NULL_BYTES) {
            return JSON.parse(
              Buffer.from(results.substr(2), 'hex').toString('utf8'),
            );
          }
        } catch (e) {
          // nothing to do
        }
        return { storage: 'none' };
      };


      const wallet = new ethers.Wallet(privateKey, provider);

      const iexecContract = new ethers.Contract(hub_addres, TokenABI, wallet);

      console.log("monitoring tasks with ids: " + tasks);

      const tasksProgress = await Promise.all(tasks.map(async (task) => {
        const taskData = await iexecContract.viewTask(task);
        console.log("taskData: " + JSON.stringify(taskData));

        const now = Math.floor(Date.now() / 1000);
        const consensusTimeout = parseInt(taskData.finalDeadline, 10);
        const taskTimedOut = taskData.status !== 3 && now >= consensusTimeout && consensusTimeout !== 0;
        const decodedResult = decodeTaskResult(taskData.results);


        //get offchain data from api 
        const GETtask = await fetch(workerpoolApiUrl + '/tasks/' + task, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        let replicateStatus;
        if (!GETtask.ok) {
          console.log(GETtask);

        } else {



          let taskDataOffChain = await GETtask.json()

          console.log("taskDataOffChain: " + JSON.stringify(taskDataOffChain));
          if (taskDataOffChain.replicates && taskDataOffChain.replicates.length > 0) {
            replicateStatus = taskDataOffChain.replicates[0].statusUpdateList
          }
          console.log("replicateStatus: " + JSON.stringify(replicateStatus));
        }


        return {
          taskId: task,
          //data:JSON.stringify(taskData),
          statusName:
            taskData.status < 3 && taskTimedOut ? TASK_STATUS_MAP.timeout
              : TASK_STATUS_MAP[taskData.status as keyof typeof TASK_STATUS_MAP],
          taskTimedOut,
          results: decodedResult,
          replicateStatus: replicateStatus ? replicateStatus : [{ status: "INITIALIZING", date: new Date().toISOString() }]
        };

      }));


      const tasksCompleted = tasksProgress.filter((task) => task.statusName === 'COMPLETED' && task.replicateStatus && task.replicateStatus[task.replicateStatus.length - 1].status === 'COMPLETED');
      const tasksFailed = tasksProgress.filter((task) => task.statusName === 'FAILED' || task.replicateStatus && task.replicateStatus[task.replicateStatus.length - 1].status === 'ABORTED');
      const tasksTimeout = tasksProgress.filter((task) => task.statusName === 'TIMEOUT');



      return { tasksCompleted: tasksCompleted.length, tasksFailed: tasksFailed.length, tasksTimeout: tasksTimeout.length, tasksData: tasksProgress };
    }
    catch (error) {
      return handleError(error, thunkAPI);
    }
  }
);

















// //order reqest-execution
// export const orderRequestExecution = createAsyncThunk(
//   'blockchain/orderRequestExecution',
//   async ({ dataset, price }: { dataset: string, price: number }, thunkAPI) => {
//     try {


//       // Get the current state
//       const state = thunkAPI.getState() as RootState;

//       // Get the wallet from the state
//       const privateKey = state.blockchain.privateKey;

//       // Check if the wallet exists
//       if (!privateKey) {
//         throw new Error("Wallet not found");
//       }

//       const wallet = new ethers.Wallet(privateKey, provider);

//       const salt = hexlify(randomBytes(32));


//       const salted_iexecRequestOrder = {

//         "app": DLMDApp,
//         "appmaxprice": 0,
//         "dataset": dataset,
//         "datasetmaxprice": 0,
//         "workerpool": "0xdb214a4A444D176e22030bE1Ed89dA1b029320f2", //TODO REMOVE HARDCODE
//         "workerpoolmaxprice": 0,
//         "requester": wallet.address,
//         "volume": 1,
//         "tag": "0x0000000000000000000000000000000000000000000000000000000000000003",
//         "category": 0,
//         "trust": 0,
//         "beneficiary": wallet.address,
//         "callback": "0x0000000000000000000000000000000000000000", //todo explore beneficiary and callback
//         "params": '{"iexec_args": "","iexec_result_storage_provider": "ipfs","iexec_result_storage_proxy": "https://result.v8-bellecour.iex.ec"}',
//         "salt": salt,
//       }

//       const typess = {
//         'RequestOrder': [
//           { name: 'app', type: 'address' },
//           { name: 'appmaxprice', type: 'uint256' },
//           { name: 'dataset', type: 'address' },
//           { name: 'datasetmaxprice', type: 'uint256' },
//           { name: 'workerpool', type: 'address' },
//           { name: 'workerpoolmaxprice', type: 'uint256' },
//           { name: 'requester', type: 'address' },
//           { name: 'volume', type: 'uint256' },
//           { name: 'tag', type: 'bytes32' },
//           { name: 'category', type: 'uint256' },
//           { name: 'trust', type: 'uint256' },
//           { name: 'beneficiary', type: 'address' },
//           { name: 'callback', type: 'address' },
//           { name: 'params', type: 'string' },
//           { name: 'salt', type: 'bytes32' },
//         ]
//       };

//       const tokencontract = new ethers.Contract(hub_addres, TokenABI, wallet);

//       //call .domain on the contract to get the EIP712Domain for signing the order
//       const domainn = await tokencontract.domain();

//       const EIP712Domainn = {
//         name: domainn.name,
//         version: domainn.version,
//         chainId: domainn.chainId.toString(),
//         verifyingContract: domainn.verifyingContract,
//       };
//       console.log("EIP712Domain: " + JSON.stringify(EIP712Domainn));

//       const signer = wallet;

//       const sign = await signer._signTypedData(EIP712Domainn, typess, salted_iexecRequestOrder);

//       //get hash
//       const hash = await _TypedDataEncoder.hash(EIP712Domainn, typess, salted_iexecRequestOrder);
//       console.log("hash: " + hash);

//       //call .verifySignature on the contract
//       const isVerified = await tokencontract.verifySignature(wallet.address, hash, sign);
//       console.log("isVerified: " + isVerified);
//       console.log("salted_iexecRequestOrder: " + sign);

//       const iexecMarketOrder = { ...salted_iexecRequestOrder, sign };
//       console.log("iexecMarketOrder: " + JSON.stringify(iexecMarketOrder));


//       //sell dataset
//       const iexecMarketChallenge = await getIExecMarketChallenge(wallet.address, chainId);
//       console.log("iexecMarketChallenge: " + iexecMarketChallenge);

//       const typedData = iexecMarketChallenge.data || iexecMarketChallenge;
//       const { domain, message } = typedData || {};
//       const { EIP712Domain, ...types } = typedData.types || {};

//       const signature = await wallet._signTypedData(domain, types, message);
//       const hash2 = hashEIP712(typedData);
//       const separator = '_'
//       const iexecMarketSignature = hash2
//         .concat(separator)
//         .concat(signature)
//         .concat(separator)
//         .concat(wallet.address);

//       console.log("final: " + iexecMarketSignature);


//       console.log("iexecMarketSignature: " + iexecMarketSignature);

//       const ordr = { order: iexecMarketOrder };

//       const sell_res = await postRequestOrder(ordr, chainId, iexecMarketSignature);

//       console.log("reqest_order_res: " + JSON.stringify(sell_res));

//       return sell_res;



//     } catch (error) {
//       return handleError(error, thunkAPI);
//     }
//   }
// );











const handleError = (error: any, thunkAPI: any) => {
  if (error instanceof Error) {
    // If the error is an instance of Error, handle it
    return thunkAPI.rejectWithValue(error.message);
  } else {
    console.log("error: " + error);
    // If the error is not an instance of Error, handle it differently
    return thunkAPI.rejectWithValue('An unknown error occurred');
  }
};






//blockchain in api del sta skoraj cisto locena api samo whitelista naslove ki lahko klicejo blockchain

//import IExec from 'iexec';
//check if user can write DLMD contract.

//14. whitelist → function whitelist(address _address) call it 

//ipfs ko bo.
//sharani encrypetd key lokalno
//Push encryption key to the SMS (da ga lahko docker masina dekriptira)


//__uuid -- neki unique karkil lahko  parcel id 
//courir mint 2. mint __uuid 
//courirer si na svoj addres naredi nft


//getIdFromUUID()
//pred update box klici approve(0xDD2EBb698bfCcD711E3Cc352a9E3C17b484fB339, getIdFromUUID())
//ko courier odpre avto je prvi dataset ki sporoci da se odpre
//ko se zapre je drugi dataset ki sporoci da se zapre in nek dodaten parmeter ki 10. updateBox → transferownership true
//update box klice samo owner nftja

//client(reciver) je zdaj owner nftja in lahko odpira box spet klice dvakrat updatebox    // ko odpre in zapre 



const blockchainSlice = createSlice({
  name: 'blockchain',
  initialState: {
    connected: false,
    balance: null as number | null,
    reputation: null as number | null,
    privateKey: null,
  },
  reducers: {

    setPrivateKey: (state, action) => {
      console.log("setPrivateKey: " + action.payload);
      state.privateKey = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getBalance.fulfilled, (state, action) => {
      console.log("getBalance.fulfilled: " + action.payload);
      state.balance = action.payload;
    });
    builder.addCase(getBalance.rejected, (state, action) => {
      console.log("getBalance.rejected: " + action.payload);
      state.balance = -1;
    }
    );
    builder.addCase(getReputation.fulfilled, (state, action) => {
      console.log("getReputation.fulfilled: " + action.payload);
      state.reputation = action.payload;

    }
    );
    builder.addCase(getReputation.rejected, (state, action) => {
      console.log("getReputation.rejected: " + action.payload);
      state.reputation = -1;
    }
    );


  },
});

export const { setPrivateKey } = blockchainSlice.actions;

export default blockchainSlice.reducer;




//za dataset rabimo file
//Prepare encrypted dataset 

// const encrypted = await iexec.dataset.encrypt(fileBytes, key);
// const checksum = await iexec.dataset.computeEncryptedFileChecksum(
//   encrypted
// );

// datasetsEncryptOutput.innerText = "Uploading encrypted file to IPFS";
// const ipfs = create("/dns4/ipfs-upload.iex.ec/https/");
// const uploadResult = await ipfs.add(encrypted);
// const { cid } = uploadResult;
// const multiaddr = `ipfs/${cid.toString()}`;
// const publicUrl = `https://ipfs.iex.ec/${multiaddr}`;

// datasetsEncryptOutput.innerText = "Checking file on IPFS";
// await fetch(publicUrl).then((res) => {
//   if (!res.ok) {
//     throw Error(`Failed to load uploaded file at ${publicUrl}`);
//   }
// });

//zdaj mamo na ipfs  encrypted file in dobim link do fila 
//


//2. Deploy dataset
//Dataset name 
// https:::bitbucket.org:theluka:pbd2023-lab-9:
// Dataset url/ipfs 
// ipfs/QmNmg67ehHQrNt7SivsmgvMSLRcqevqMBqg7ERpKnvQUhN
// Dataset checksum 
// 0x15d67caed6eb13d6b8ea9ac1c80db256e706fbd3862be2aca7693f891f2f7501

//rezultat Dataset deployed at address 0x23F08F97B90733876CA04bc05D61204d9F33509f

//3.Push encryption key to the SMS

//4.Sell dataset
//Restrict to app 0x00000000000

//5 .get dataset problematicno poglej iexec api https://explorer.iex.ec/bellecour/dataset/0xF21719618F1c842a9da4e62989FC3715716fB528








