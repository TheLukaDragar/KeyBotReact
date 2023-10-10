
import { act, fireEvent, screen, waitFor, renderHook } from '@testing-library/react'
// We're using our own custom render function and not RTL's render.
import { renderWithProviders } from '../utils/test-utils'
import TestComponent, { getUserDataPassed, loginPassed } from './test_component'
import '@testing-library/jest-dom';
import "whatwg-fetch"

import { KeyChainData, loadDemoClientWallet, loadDemoCourierWallet } from '../data/secure';
import { useLoginWalletMutation, useLazyGetAuthMsgQuery, useLazyGetMeQuery, User, AuthResponse, ParcelData, CreateParcelByWallet, useCreateParcelByWalletMutation, useLazyGetBoxAccessKeyQuery, useLazyGetBoxesQuery, useLazyGetDoesUserHavePermissionToBoxQuery, PreciseLocation, useSetBoxPreciseLocationMutation, useLazyGetBoxPreciseLocationQuery, isFetchBaseQueryError, isErrorWithMessage, useDepositParcelMutation, useLazyGetParcelByIdQuery, useLazyGetBoxQuery, useWithdrawParcelMutation, RateTransactionDto, RatingType, useRateTransactionMutation, GetBoxesResponse, BoxItem, useUpdateParcelByIdMutation } from '../data/api';
import { useAppDispatch, useAppSelector } from '../data/hooks';
import { AsyncThunk } from '@reduxjs/toolkit';
import { Dispatch, AnyAction } from 'redux';
import { Provider } from 'react-redux';
import '@ethersproject/shims';

import { ethers } from 'ethers';
import { authenticate, connectDeviceById, demoDevice, getChallenge, setDemoMode } from '../ble/bleSlice';
import React, { ComponentType } from 'react'


export async function setupAndLoadUser(loadFunction: AsyncThunk<{ mnemonicPhrase: string; keyChainData: KeyChainData; }, void, { state?: unknown; dispatch?: Dispatch<AnyAction> | undefined; extra?: unknown; rejectValue?: unknown; serializedErrorType?: unknown; pendingMeta?: unknown; fulfilledMeta?: unknown; rejectedMeta?: unknown; }>) {
  const component = renderWithProviders(<TestComponent />);

  await act(async () => {
    const secureData = await loadFunction()(component.store.dispatch, component.store.getState, undefined).unwrap();
    expect(secureData).not.toBeUndefined();
  });

  // getMessageToSign hook
  const { result: msg } = renderHook(() => useLazyGetAuthMsgQuery(), {
    wrapper: ({ children }) => <Provider store={component.store}>{children}</Provider>,
  });
  const msgResult = await act(async () => await msg.current[0]().unwrap());

  const signer = new ethers.Wallet(component.store.getState().secure.keyChainData?.privateKey!);
  const signature = await signer.signMessage(msgResult?.message!);

  // useLoginWalletMutation
  const { result: login } = renderHook(() => useLoginWalletMutation(), {
    wrapper: ({ children }) => <Provider store={component.store}>{children}</Provider>,
  });
  const loginResult = await act(async () => await login.current[0]({
    wallet: signer.address,
    signature: signature,
    timestamp: msgResult?.timestamp!,
  }).unwrap());

  expect(loginResult).not.toBeUndefined();

  expect(loginResult).not.toBeUndefined();
  expect(loginResult.profile.crypto[0].wallet).not.toBeUndefined();
  const wallet = loginResult.profile.crypto[0].wallet;
  console.log("user wallet: ", wallet);
  console.log("user id: ", loginResult.profile.id);
  console.log("user token: ", component.store.getState().secure.userData.token);
  console.log("user: ", JSON.stringify(loginResult , null, 2));
  

  console.log("login passed");

  expect(component.store.getState().secure.userData.token).not.toBeUndefined();
  expect(component.store.getState().secure.userData.token).not.toBeNull();
  

  return { component, loginResult };
}


export async function testClientGetsBoxes(component:any) {
    const { result: boxesResult } = renderHook(() => useLazyGetBoxesQuery(), {
      wrapper: ({ children }) => <Provider store={component.store}>{children}</Provider>,
    });

    const boxes = await act(async () => await boxesResult.current[0]().unwrap());
    expect(boxes).not.toBeUndefined();
    expect(boxes.items).not.toBeUndefined();
    expect(boxes.total).not.toBeUndefined();
    expect(boxes.items.length).toBeGreaterThan(0);
    expect(boxes.total).toBeGreaterThan(0);

    return boxes;
  }

  export async function testFindBoxByDID(boxes: GetBoxesResponse, box_did: string) {
    const box = boxes.items.find((box) => box.did === box_did);
    expect(box).not.toBeUndefined();
    return box;
  }

  export async function testUpdateBoxLocation(component:any, box: BoxItem, car_location: PreciseLocation) {
    

    const { result: setBoxPreciseLocationResult } = renderHook(() => useSetBoxPreciseLocationMutation(), {
      wrapper: ({ children }) => <Provider store={component.store}>{children}</Provider>,
    });

    try {
      const setBoxPreciseLocationResponse = await act(async () => {
        const result = await setBoxPreciseLocationResult.current[0]({
          boxId: box.id,
          preciseLocation: car_location,
        }).unwrap();

        console.log("setBoxPreciseLocationResponse: ", result);
        return result;
      });

      expect(setBoxPreciseLocationResponse).not.toBeUndefined();
      expect(setBoxPreciseLocationResponse.id).not.toBeUndefined();
      expect(setBoxPreciseLocationResponse.isPrecise).toBe(true);
    } catch (err) {
      if (isFetchBaseQueryError(err)) {
        const errMsg = 'error' in err ? err.error : JSON.stringify(err.data);
        console.log('fetch error', err);
        //check if status PRECISE_LOCATION_EXISTS and if so, ignore
        if (err.status === 422) {
          console.log('PRECISE_LOCATION_EXISTS');
        } else {
          throw err;
        }
      } else if (isErrorWithMessage(err)) {
        console.log('error with message, ', err);
      }
    }
  
  }
  export async function testCreateParcelByWallet(
    courierComponent: any,
    courierUserData: User,
    clientUserData: User,
    box_did: string,
    preciseLocation: PreciseLocation,
    transactionHash: string,
    nfId: string
  ): Promise<ParcelData> {

    const parcel: CreateParcelByWallet = {
      nftId: nfId,
      transactionHash: transactionHash,
      recipient_addr: clientUserData.crypto[0].wallet,
      courier_addr: courierUserData.crypto[0].wallet,
      box_did: box_did,
      location: preciseLocation,
    };
  
    const { result: createParcelResult } = renderHook(() => useCreateParcelByWalletMutation(), {
      wrapper: ({ children }) => <Provider store={courierComponent.store}>{children}</Provider>,
    });
  
    const parcelResponse = await act(async () => {
      const result = await createParcelResult.current[0](parcel).unwrap();
      console.log("create parcel result: ", result);
      return result;
    });
  
    expect(parcelResponse).not.toBeUndefined();
    expect(parcelResponse.id).not.toBeNull();
  
    return parcelResponse;
  }

  export async function testUpdateParcel(courierComponent: any, parcel : ParcelData): Promise<ParcelData> {
    const { result: updateParcelResult } = renderHook(() => useUpdateParcelByIdMutation(), {
      wrapper: ({ children }) => <Provider store={courierComponent.store}>{children}</Provider>,
    });

    const parcelResponse = await act(async () => {
      const result = await updateParcelResult.current[0](parcel).unwrap();
      console.log("update parcel result: ", result);
      return result;
    }
    );

    expect(parcelResponse).not.toBeUndefined();
    expect(parcelResponse.id).not.toBeNull();
    expect(parcelResponse.id).toBe(parcel.id);
    expect(parcelResponse.nftId).toBe(parcel.nftId);


    return parcelResponse;
  }



  export async function testGetBoxPreciseLocation(
    courierComponent: any, 
    boxId: number
  ): Promise<PreciseLocation> {
    const { result: getBoxPreciseLocationResult } = renderHook(() => useLazyGetBoxPreciseLocationQuery(), {
      wrapper: ({ children }) => <Provider store={courierComponent.store}>{children}</Provider>,
    });
  
    const boxLocation = await act(async () => {
      const result = await getBoxPreciseLocationResult.current[0](boxId).unwrap();
      console.log("box location: ", result);
      return result;
    });
  
    expect(boxLocation.latitude).not.toBeNull();
    expect(boxLocation.longitude).not.toBeNull();
    expect(boxLocation.inaccuracy).not.toBeNull();
  
    return boxLocation;
  }

  export async function testConnectToDeviceAndGetAccessKey(
    courierComponent: any, 
    demoDeviceId: string,
    boxId: number,
    boxLocation: PreciseLocation
  ): Promise<string> {
  
    // Connect to device
    const bleDevice = await courierComponent.store.dispatch(
      connectDeviceById({ id: demoDeviceId }) as unknown as AnyAction
    ).unwrap();
  
    expect(bleDevice).not.toBeUndefined();
    expect(bleDevice.id).not.toBeUndefined();
  
    // Get challenge from the box
    const challenge = await courierComponent.store.dispatch(
      getChallenge() as unknown as AnyAction
    ).unwrap();
  
    expect(challenge).not.toBeUndefined();
    expect(typeof challenge).toBe("string");
  
    // Solve the challenge with the call to the API
    const { result: solveChallengeResult } = renderHook(() => useLazyGetBoxAccessKeyQuery(), {
      wrapper: ({ children }) => <Provider store={courierComponent.store}>{children}</Provider>,
    });
  
    const accessKey = await act(async () => {
      const result = await solveChallengeResult.current[0]({
        challenge: challenge as unknown as string,
        boxId: boxId,
        preciseLocation: boxLocation,
      }).unwrap();
  
      console.log("access key result: ", result);
      return result;
    });
  
    expect(accessKey).not.toBeUndefined();
    expect(accessKey.accessKey).not.toBeUndefined();
    expect(accessKey.accessKey).not.toBeNull();
  
    // Authenticate with the box
    const authResult = await courierComponent.store.dispatch(
      authenticate({ solved_challenge: accessKey.accessKey }) as unknown as AnyAction
    ).unwrap();
  
    expect(authResult).not.toBeUndefined();
    expect(authResult).toBe(true);
  
    return accessKey.accessKey;
  }

  export async function testDepositParcel(courierComponent: any, parcel_id: number): Promise<any> {

    // useDepositParcelMutation
    const { result: depositParcelResult } = renderHook(() => useDepositParcelMutation(), {
      wrapper: ({ children }) => <Provider store={courierComponent.store}>{children}</Provider>,
    });
  
    const depositParcelResponse = await act(async () => {
      const result = await depositParcelResult.current[0](parcel_id).unwrap();
      console.log("deposit parcel result: ", result);
      return result;
    });
  
    expect(depositParcelResponse).not.toBeUndefined();
  
    return depositParcelResponse;
  }

  export async function testGetParcelById(clientComponent: any, parcelId: number): Promise<any> {

    // useLazyGetParcelByIdQuery
    const { result: getParcelResult } = renderHook(() => useLazyGetParcelByIdQuery(), {
      wrapper: ({ children }) => <Provider store={clientComponent.store}>{children}</Provider>,
    });
  
    const parcel_response = await act(async () => {
      const result = await getParcelResult.current[0](parcelId).unwrap();
      console.log("get parcel result: ", result);
      return result;
    });
  
    expect(parcel_response).not.toBeUndefined();
    expect(parcel_response.id).not.toBeUndefined();
    expect(parcel_response.id).not.toBeNull();
  
    return parcel_response;
  }
  export async function testGetBox(clientComponent: any, boxId: number): Promise<any> {

    // useLazyGetBoxQuery
    const { result: getBoxResult } = renderHook(() => useLazyGetBoxQuery(), {
      wrapper: ({ children }) => <Provider store={clientComponent.store}>{children}</Provider>,
    });
  
    const box_client = await act(async () => {
      const result = await getBoxResult.current[0](boxId).unwrap();
      console.log("box result: ", result);
      return result;
    });
  
    expect(box_client).not.toBeUndefined();
    expect(box_client.id).not.toBeUndefined();
    expect(box_client.id).not.toBeNull();
  
    return box_client;
  }

  export async function testRateTransaction(
    clientComponent: any, 
    rateTransactionData: RateTransactionDto, 
    expectedAuthorId: string
  ): Promise<any> {
    
    // useRateTransactionMutation
    const { result: rateTransactionResult } = renderHook(() => useRateTransactionMutation(), {
      wrapper: ({ children }) => <Provider store={clientComponent.store}>{children}</Provider>,
    });
  
    const rateTransactionResponse = await act(async () => {
      const result = await rateTransactionResult.current[0](rateTransactionData).unwrap();
      console.log("rate transaction result: ", result);
      return result;
    });
  
    expect(rateTransactionResponse).not.toBeUndefined();
    expect(rateTransactionResponse.rating).not.toBeUndefined();
    expect(rateTransactionResponse.rating).not.toBeNull();
  
    expect(rateTransactionResponse.author_id).not.toBeUndefined();
    expect(rateTransactionResponse.author_id).not.toBeNull();
    expect(rateTransactionResponse.author_id).toBe(expectedAuthorId);
  
    return rateTransactionResponse;
  }

  export async function testWithdrawParcel(clientComponent: any, boxId: number): Promise<any> {
        //withdraw parcel
    const { result: withdrawParcelResult } = renderHook(() => useWithdrawParcelMutation(), {
      wrapper: ({ children }) => <Provider store={clientComponent.store}>{children}</Provider>,
    });

    const withdrawParcelResponse = await act(async () => {
      const result = await withdrawParcelResult.current[0](boxId).unwrap();
      console.log("withdraw parcel result: ", result);
      return result;
    }
    );

    expect(withdrawParcelResponse).not.toBeUndefined(); 
    //expect empyt object
    expect(withdrawParcelResponse).toEqual({});

    return withdrawParcelResponse;
  }

  
  
  