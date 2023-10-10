

import { useAppDispatch, useAppSelector } from '../data/hooks';
import '@ethersproject/shims';

import { ethers } from 'ethers';
import React, { useEffect } from 'react';
import { isErrorWithMessage, isFetchBaseQueryError, useCreateParcelByWalletMutation, useGetUserDetailsQuery, useLazyGetAuthMsgQuery, useLazyGetBoxQuery, useLazyGetMeQuery, useLoginWalletMutation } from '../data/api';




export const loginPassed = jest.fn((result) => {
  // Handle the login result in the test
  console.log('loginPassed result:', result);
  return result;
});
export const getUserDataPassed = jest.fn();
export const getBoxesPassed = jest.fn();
export const getBoxPassed = jest.fn();


export default function TestComponent() {


  const secure = useAppSelector((state) => state.secure);
  const dispatch = useAppDispatch();

  const [Login, { isLoading: isLoginIn }] = useLoginWalletMutation();

  const [getMessageToSign, { isLoading: IsLoadingMsg }] = useLazyGetAuthMsgQuery();
  const [getUserData, { isLoading: IsLoadingUserData }] = useLazyGetMeQuery();


  const [getBoxes, { isLoading: IsLoadingBoxes }] = useLazyGetBoxQuery();
  const [getBox, { isLoading: IsLoadingBox }] = useLazyGetBoxQuery();
  const [CreateParcelByWallet, { isLoading: isLoading }] = useCreateParcelByWalletMutation();












  const [ErrorMessage, setError] = React.useState("");


  useEffect(() => {

    //console.log(secure.userData);


  }, [])

  const test = async () => {
    console.log("test");
  }

  const handleQuery = async (query: any, onSuccess: (data: any) => void) => {
    try {
      const result = await query().unwrap();
      console.log(result);
      onSuccess(result);
    } catch (err) {
      if (isFetchBaseQueryError(err)) {
        const errMsg = 'error' in err ? err.error : JSON.stringify(err.data);
        console.log('fetch error', err);
        setError(errMsg);
      } else if (isErrorWithMessage(err)) {
        console.log('error with message , ', err);
        setError(err.message);
      }
    }
  };

  const handleMutation = async (mutation: any, onSuccess: (data: any) => void, mutationData: any) => {
    try {
      const result = await mutation(mutationData).unwrap();
      console.log(result);
      onSuccess(result);
    } catch (err) {
      if (isFetchBaseQueryError(err)) {
        const errMsg = 'error' in err ? err.error : JSON.stringify(err.data);
        console.log('fetch error', err);
        setError(errMsg);
      } else if (isErrorWithMessage(err)) {
        console.log('error with message, ', err);
        setError(err.message);
      }
    }
  };
  
  
  

  async function login() {
    try {
      const msg = await getMessageToSign().unwrap();

      if (secure.is_wallet_setup === false) {
        throw new Error("wallet not setup");
      }

      console.log(secure.keyChainData?.privateKey!, "private key");
      console.log(msg?.message!, "message");
      const signer = new ethers.Wallet(secure.keyChainData?.privateKey!);
      const signature = await signer.signMessage(msg?.message!);

      const recoveredAddress = ethers.utils.verifyMessage(msg?.message!, signature);

      console.log(recoveredAddress === signer.address, "recovered address === wallet address");

      const result = await Login({
        wallet: signer.address,
        signature: signature,
        timestamp: msg?.timestamp!,
      }).unwrap();

      console.log(result);

      loginPassed(result);


    } catch (err) {
      if (isFetchBaseQueryError(err)) {
        const errMsg = 'error' in err ? err.error : JSON.stringify(err.data)
        console.log("fetch error", err);
        setError(errMsg);

      } else if (isErrorWithMessage(err)) {
        console.log("error with message , ", err);
        setError(err.message);
      }

    }
  }


  return (
    <div>
      <span>Test Component</span>
      <button onClick={() => login()}>Login</button>
      <button onClick={() => handleQuery(getUserData, (result) => { getUserDataPassed(result) } )}>Get User Data</button>
      <button onClick={() => handleQuery(getBoxes, (result) => { getBoxesPassed(result) } )}>Get Boxes</button>



    </div>
  )



}


