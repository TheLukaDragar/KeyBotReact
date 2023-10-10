/**
 * @jest-environment jsdom
 */
import 'whatwg-fetch';
import React, { ComponentType } from 'react'

import { act, fireEvent, screen, waitFor, renderHook } from '@testing-library/react'
// We're using our own custom render function and not RTL's render.
import { renderWithProviders } from '../utils/test-utils'
import TestComponent, { getUserDataPassed, loginPassed } from './test_component'
import '@testing-library/jest-dom';
import "whatwg-fetch"

import { KeyChainData, loadDemoClientWallet, loadDemoCourierWallet } from '../data/secure';
import { useLoginWalletMutation, useLazyGetAuthMsgQuery, useLazyGetMeQuery, User, AuthResponse, ParcelData, CreateParcelByWallet, useCreateParcelByWalletMutation, useLazyGetBoxAccessKeyQuery, useLazyGetBoxesQuery, useLazyGetDoesUserHavePermissionToBoxQuery, PreciseLocation, useSetBoxPreciseLocationMutation, useLazyGetBoxPreciseLocationQuery, isFetchBaseQueryError, isErrorWithMessage, useDepositParcelMutation, useLazyGetParcelByIdQuery, useLazyGetBoxQuery, useWithdrawParcelMutation, RateTransactionDto, RatingType, useRateTransactionMutation, GetBoxesResponse, BoxItem } from '../data/api';
import { useAppDispatch, useAppSelector } from '../data/hooks';
import { AsyncThunk } from '@reduxjs/toolkit';
import { Dispatch, AnyAction } from 'redux';
import { Provider } from 'react-redux';
import { ethers } from 'ethers';
import { authenticate, connectDeviceById, demoDevice, getChallenge, setDemoMode } from '../ble/bleSlice';
import { setupAndLoadUser, testClientGetsBoxes, testConnectToDeviceAndGetAccessKey, testCreateParcelByWallet, testDepositParcel, testFindBoxByDID, testGetBox, testGetBoxPreciseLocation, testGetParcelById, testRateTransaction, testUpdateBoxLocation, testUpdateParcel, testWithdrawParcel } from './backend_utility';


jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('react-native-ble-plx', () => ({
  BleManager: jest.fn(() => ({
    createClient: jest.fn(),
  })),
}));
jest.mock('expo-constants', () => require('./mockExpoConstants.js'));



describe('Backend Test Scenario', () => {


    let courierComponent: any, courierResult: any, clientComponent: any, clientResult: any, courierUserData: any, clientUserData: any;

    const demo_box_did = "BOX_000000000000";
    let boxes : GetBoxesResponse
    let box : BoxItem | undefined;
    const car_location = {
      latitude: 45.767,
      longitude: 4.833,
      inaccuracy: 10,
    } as PreciseLocation;
    const courier_loocation1 = {
      latitude: 45.767,
      longitude: 4.833,
      inaccuracy: 10,
    } as PreciseLocation;

    let parcel : ParcelData 
    let boxLocation : PreciseLocation


    beforeAll(async () => {
        const courierData = await setupAndLoadUser(loadDemoCourierWallet);
        courierComponent = courierData.component;
        courierResult = courierData.loginResult;
        courierUserData = courierResult.profile;

        const clientData = await setupAndLoadUser(loadDemoClientWallet);
        clientComponent = clientData.component;
        clientResult = clientData.loginResult;
        clientUserData = clientResult.profile;

        boxes = await testClientGetsBoxes(clientComponent);
    },20000);


   

    it('(PDC Parcel pickup) Client gets a list of Boxes', async () => {
        boxes = await testClientGetsBoxes(clientComponent);
        expect(boxes).toBeTruthy();
    });

    it('(PDC Parcel pickup) Client sees DEMO Box in the list', async () => {
        box = await testFindBoxByDID(boxes, demo_box_did);
        expect(box).toBeTruthy();
        expect(box?.did).toBe(demo_box_did);
    });

    it('(PDC Parcel pickup) Client updates Box location to car location', async () => {
        return await testUpdateBoxLocation(clientComponent, box!, car_location);
    });

    it('(PDC Parcel pickup) Courier create a parcel', async () => {
       parcel = await testCreateParcelByWallet(courierComponent, courierUserData, clientUserData, demo_box_did, courier_loocation1,"0x00000","1")
       expect(parcel).toBeTruthy();

    });
    //najprej je nft id 0topem nareis parce lpotem klics smart contract in UPDATAS NFT ID na parcelu
    it('(PDC Parcel pickup) Courier updates parcel', async () => {

      parcel= {
        ...parcel,
        nftId: "1"
      }

      parcel = await testUpdateParcel(courierComponent, parcel)
      expect(parcel).toBeTruthy();

   });
    

    it('(PDC Parcel pickup) Courier gets Box precise location', async () => {
       boxLocation = await testGetBoxPreciseLocation(courierComponent, box?.id!);
      expect(boxLocation).toBeTruthy();
    });
    it('(OpenBox) Courier connects to Box and with access key from API', async () => {
      const accessKey = await testConnectToDeviceAndGetAccessKey(courierComponent, demoDevice.id, box?.id!, boxLocation);
      expect(accessKey).toBeTruthy();
    });

    it('(PDC Parcel pickup) Courier deposits a parcel', async () => {
      const depositParcelResponse = await testDepositParcel(courierComponent, parcel.id);
      expect(depositParcelResponse).toBeTruthy();
    });


    it('(PDC Parcel pickup) Client gets a parcel by ID', async () => {
      const parcel_response = await testGetParcelById(clientComponent, parcel.id);
      expect(parcel_response).toBeTruthy();
    });

    it('(PDC Parcel pickup) Client gets Box precise location', async () => {
      const box_location_client = await testGetBoxPreciseLocation(clientComponent, box?.id!);
      expect(box_location_client).toBeTruthy();
    });

    it('(PDC Parcel pickup) Client gets Box details', async () => {
      const box_details = await testGetBox(clientComponent, box?.id!);
      expect(box_details).toBeTruthy();
    });

    it('(Open Box)Client connects to box and with access key from API', async () => {
      const accessKey = await testConnectToDeviceAndGetAccessKey(clientComponent, demoDevice.id, box?.id!, boxLocation);
      expect(accessKey).toBeTruthy();
    });

    it('(PDC Parcel pickup) Client rates the courier', async () => {
      const rating_courier: RateTransactionDto = {
        rating: 5,
        recipient_id: courierUserData.id, //for now only recipient can rate
        parcel_id: parcel.id,
        ratingType: RatingType.COURIER,
      };
    
      const rateTransactionResponse = await testRateTransaction(clientComponent, rating_courier, clientUserData.id);
      expect(rateTransactionResponse).toBeTruthy();
    
    });

    it('(PDC Parcel pickup) Client rates the box', async () => {
      const rating_box: RateTransactionDto = {
        rating: 5,
        recipient_id: box?.id!, //for now only recipient can rate
        parcel_id: parcel.id,
        ratingType: RatingType.SMART_BOX,
      };

      const rateTransactionResponse = await testRateTransaction(clientComponent, rating_box, clientUserData.id);
      expect(rateTransactionResponse).toBeTruthy();
    });

    it('(PDC Parcel pickup) Client withdraws the parcel', async () => {
      const withdrawParcelResponse = await testWithdrawParcel(clientComponent, parcel.id);
      expect(withdrawParcelResponse).toBeTruthy();
    });



    


    
    



    













    // The functions testClientGetsBoxes, testFindBoxByDID and testUpdateBoxLocation would be the same as in the previous example.
});


  
  
  
  
































// describe('Test Scenario', () => {
//   test('Courier - Client full scenario', async () => {
//     const { component: courierComponent, loginResult: courierResult } = await setupAndLoadUser(loadDemoCourierWallet);
//     const { component: clientComponent, loginResult: clientResult } = await setupAndLoadUser(loadDemoClientWallet);
//     const courierUserData = courierResult.profile;
//     const clientUserData = clientResult.profile;

//     const demo_box_did = "KeyBot_000000000000"
    


//     //client get boxes that he can access

//     //get list of boxes from api
//     const { result: boxesResult } = renderHook(() => useLazyGetBoxesQuery(), {
//       wrapper: ({ children }) => <Provider store={clientComponent.store}>{children}</Provider>,
//     });

//     const boxes = await act(async () => await boxesResult.current[0]().unwrap());
//     expect(boxes).not.toBeUndefined();
//     expect(boxes.items).not.toBeUndefined();
//     expect(boxes.total).not.toBeUndefined();
//     expect(boxes.items.length).toBeGreaterThan(0);
//     expect(boxes.total).toBeGreaterThan(0);

//     //find the box with the right did
//     const box = boxes.items.find((box) => box.did === demo_box_did);
//     expect(box).not.toBeUndefined();

//     //confirm client can access the box useLazyGetDoesUserHavePermissionToBoxQuery
//     // const { result: doesUserHavePermissionToBox } = renderHook(() => useLazyGetDoesUserHavePermissionToBoxQuery(), {
//     //   wrapper: ({ children }) => <Provider store={clientComponent.store}>{children}</Provider>,
//     // });


//     //TODO
//     // const boxAccess = await act(async () => await doesUserHavePermissionToBox.current[0](box!.id).unwrap());
//     // expect(boxAccess).not.toBeUndefined();

//     //update box location
//     const car_location = {
//       latitude: 45.767,
//       longitude: 4.833,
//       inaccuracy: 10,
//     } as PreciseLocation;

//     //SetBoxPreciseLocation
//     const { result: setBoxPreciseLocationResult } = renderHook(() => useSetBoxPreciseLocationMutation(), {
//       wrapper: ({ children }) => <Provider store={clientComponent.store}>{children}</Provider>,
//     });

//     try {
//       const setBoxPreciseLocationResponse = await act(async () => {
//         const result = await setBoxPreciseLocationResult.current[0]({
//           boxId: box!.id,
//           preciseLocation: car_location,
//         }).unwrap();
//         console.log("setBoxPreciseLocationResponse: ", result);
//         return result;
//       });

//       expect(setBoxPreciseLocationResponse).not.toBeUndefined();
//       expect(setBoxPreciseLocationResponse.id).not.toBeUndefined();
//       expect(setBoxPreciseLocationResponse.isPrecise).toBe(true);
//     } catch (err) {
//       if (isFetchBaseQueryError(err)) {
//         const errMsg = 'error' in err ? err.error : JSON.stringify(err.data);
//         console.log('fetch error', err);
//         //check if status PRECISE_LOCATION_EXISTS and if so, ignore
//         if (err.status === 422) {
//           console.log('PRECISE_LOCATION_EXISTS');
//         } else {
//           throw err;
//         }




//       } else if (isErrorWithMessage(err)) {
//         console.log('error with message, ', err);

//       }
//     }

//     const courier_loocation1 = {
//       latitude: 45.767,
//       longitude: 4.833,
//       inaccuracy: 10,
//     } as PreciseLocation;



//     // blockchain create parcel
//     const parcel = {
//       nftId: "1",
//       transactionHash: "0x1234567890",
//       recipient_addr: clientUserData.crypto[0].wallet,
//       courier_addr: courierUserData.crypto[0].wallet,
//       box_did: demo_box_did,
//       preciseLocation: courier_loocation1,
//     } as CreateParcelByWallet;

//     const { result: createParcelResult } = renderHook(() => useCreateParcelByWalletMutation(), {
//       wrapper: ({ children }) => <Provider store={courierComponent.store}>{children}</Provider>,
//     });

//     const parcel_respose = await act(async () => {
//       const result = await createParcelResult.current[0](parcel).unwrap();
//       console.log("create parcel result: ", result);
//       return result;
//     });

//     expect(parcel_respose).not.toBeUndefined();
//     expect(parcel_respose.id).not.toBeNull();


//     // 2. courer deposits the parcel in the box

//     // get location of box
//     // getBoxPreciseLocation
//     const { result: getBoxPreciseLocationResult } = renderHook(() => useLazyGetBoxPreciseLocationQuery(), {
//       wrapper: ({ children }) => <Provider store={courierComponent.store}>{children}</Provider>,
//     });

//     const box_location = await act(async () => {
//       const result = await getBoxPreciseLocationResult.current[0](box!.id).unwrap();
//       console.log("box location: ", result);
//       return result;
//     });

//     //check that they are not null
//     expect(box_location.latitude).not.toBeNull();
//     expect(box_location.longitude).not.toBeNull();
//     expect(box_location.inaccuracy).not.toBeNull();

//     //connect to the box

//     const mac_addres = demoDevice.id;

//     const ble_Device = await courierComponent.store.dispatch(connectDeviceById({
//       id: mac_addres,
//     }) as unknown as AnyAction).unwrap();

//     expect(ble_Device).not.toBeUndefined();
//     expect(ble_Device.id).not.toBeUndefined();

//     //get challenge from the box
//     const challenge = await courierComponent.store.dispatch(getChallenge() as unknown as AnyAction).unwrap();
//     //expect string
//     expect(challenge).not.toBeUndefined();
//     expect(typeof challenge).toBe("string");

//     //solve the challenge with the call to the api
//     const { result: solveChallengeResult } = renderHook(() => useLazyGetBoxAccessKeyQuery(), {
//       wrapper: ({ children }) => <Provider store={courierComponent.store}>{children}</Provider>,
//     });


//     const access_key = await act(async () => {
//       const result = await solveChallengeResult.current[0]({
//         challenge: challenge as unknown as string,
//         boxId: box?.id || -1,
//         //courier has to be in the box location
//         preciseLocation: {
//           longitude: box_location.longitude,
//           latitude: box_location.latitude,
//           inaccuracy: box_location.inaccuracy,
//         },

//       }).unwrap();
//       console.log("access key result: ", result);
//       return result;
//     }
//     );

//     expect(access_key).not.toBeUndefined();
//     expect(access_key.accessKey).not.toBeUndefined();
//     expect(access_key.accessKey).not.toBeNull();


//     //authenticate with the box
//     const auth_result = await courierComponent.store.dispatch(authenticate({ solved_challenge: access_key.accessKey }) as unknown as AnyAction).unwrap();
//     expect(auth_result).not.toBeUndefined();
//     expect(auth_result).toBe(true);

//     //unlock the box .. 

//     //useDepositParcelMutation
//     const { result: depositParcelResult } = renderHook(() => useDepositParcelMutation(), {
//       wrapper: ({ children }) => <Provider store={courierComponent.store}>{children}</Provider>,
//     });

//     const depositParcelResponse = await act(async () => {
//       const result = await depositParcelResult.current[0](box?.id || -1).unwrap();
//       console.log("deposit parcel result: ", result);
//       return result;
//     }
//     );

//     expect(depositParcelResponse).not.toBeUndefined(); //can be null it musnt throw an error


//     //USER SIDE

//     //get the parcel useLazyGetParcelByIdQuery
//     const { result: getParcelResult } = renderHook(() => useLazyGetParcelByIdQuery(), {
//       wrapper: ({ children }) => <Provider store={clientComponent.store}>{children}</Provider>,

//     });

//     const parcel_response = await act(async () => {
//       const result = await getParcelResult.current[0](parcel_respose.id).unwrap();
//       console.log("get parcel result: ", result);
//       return result;
//     }
//     );

//     expect(parcel_response).not.toBeUndefined();
//     expect(parcel_response.id).not.toBeUndefined();
//     expect(parcel_response.id).not.toBeNull();


//     //get box location
//     const { result: getBoxPreciseLocationResult_client } = renderHook(() => useLazyGetBoxPreciseLocationQuery(), {
//       wrapper: ({ children }) => <Provider store={clientComponent.store}>{children}</Provider>,
//     });

//     const box_location_client = await act(async () => {
//       const result = await getBoxPreciseLocationResult_client.current[0](box!.id).unwrap();
//       console.log("box location: ", result);
//       return result;
//     }
//     );

//     //check that they are not null
//     expect(box_location_client.latitude).not.toBeNull();
//     expect(box_location_client.longitude).not.toBeNull();
//     expect(box_location_client.inaccuracy).not.toBeNull();

//     //get box details lAZYgetBox
//     const { result: getBoxResult } = renderHook(() => useLazyGetBoxQuery(), {
//       wrapper: ({ children }) => <Provider store={clientComponent.store}>{children}</Provider>,
//     });

//     const box_client = await act(async () => {
//       const result = await getBoxResult.current[0](parseInt(parcel_response.box_id)).unwrap();
//       console.log("box result: ", result);
//       return result;
//     });

//     expect(box_client).not.toBeUndefined();
//     expect(box_client.id).not.toBeUndefined();
//     expect(box_client.id).not.toBeNull();


//     //connect to the box


//     const ble_Device_client = await clientComponent.store.dispatch(connectDeviceById({
//       id: mac_addres,
//     }) as unknown as AnyAction).unwrap();

//     expect(ble_Device_client).not.toBeUndefined();
//     expect(ble_Device_client.id).not.toBeUndefined();

//     //get box access key
//     const { result: getBoxAccessKeyResult } = renderHook(() => useLazyGetBoxAccessKeyQuery(), {
//       wrapper: ({ children }) => <Provider store={clientComponent.store}>{children}</Provider>,
//     });

//     const challenge2 = await clientComponent.store.dispatch(getChallenge() as unknown as AnyAction).unwrap();
//     //expect string
//     expect(challenge2).not.toBeUndefined();
//     expect(typeof challenge2).toBe("string");


//     const access_key_client = await act(async () => {
//       const result = await getBoxAccessKeyResult.current[0]({
//         challenge: challenge2 as unknown as string,
//         boxId: box_client?.id || -1,
//         //courier has to be in the box location
//         preciseLocation: {
//           longitude: box_location_client.longitude,
//           latitude: box_location_client.latitude,
//           inaccuracy: box_location_client.inaccuracy,
//         },
//       }).unwrap();
//       console.log("access key result: ", result);
//       return result;
//     }
//     );

//     expect(access_key_client).not.toBeUndefined();
//     expect(access_key_client.accessKey).not.toBeUndefined();
//     expect(access_key_client.accessKey).not.toBeNull();

//     //authenticate with the box
//     const auth_result_client = await clientComponent.store.dispatch(authenticate({ solved_challenge: access_key_client.accessKey }) as unknown as AnyAction).unwrap();
//     expect(auth_result_client).not.toBeUndefined();
//     expect(auth_result_client).toBe(true);

//     //unlock the box ..

//     //REPUTATION

//     //rate the box
//     const rating_courier: RateTransactionDto = {
//       rating: 5,
//       recipient_id: courierUserData.id, //for now only recipient can rate
//       parcel_id: parcel_respose.id,
//       ratingType: RatingType.COURIER,
//     };

//     const { result: rateTransactionResult } = renderHook(() => useRateTransactionMutation(), {
//       wrapper: ({ children }) => <Provider store={clientComponent.store}>{children}</Provider>,
//     });

//     const rateTransactionResponse = await act(async () => {
//       const result = await rateTransactionResult.current[0](rating_courier).unwrap();
//       console.log("rate transaction result: ", result);
//       return result;
//     }
//     );

//     expect(rateTransactionResponse).not.toBeUndefined();
//     expect(rateTransactionResponse.rating).not.toBeUndefined();
//     expect(rateTransactionResponse.rating).not.toBeNull();

//     expect(rateTransactionResponse.author_id).not.toBeUndefined();
//     expect(rateTransactionResponse.author_id).not.toBeNull();
//     expect(rateTransactionResponse.author_id).toBe(clientUserData.id);




//     const rating_client: RateTransactionDto = {
//       rating: 5,
//       recipient_id: box_client.id,
//       parcel_id: parcel_respose.id,
//       ratingType: RatingType.SMART_BOX,
//     };

//     const { result: rateTransactionResult_client } = renderHook(() => useRateTransactionMutation(), {
//       wrapper: ({ children }) => <Provider store={clientComponent.store}>{children}</Provider>,
//     });

//     const rateTransactionResponse_client = await act(async () => {
//       const result = await rateTransactionResult_client.current[0](rating_client).unwrap();
//       console.log("rate transaction result: ", result);
//       return result;
//     }
//     );

//     expect(rateTransactionResponse_client).not.toBeUndefined();
//     expect(rateTransactionResponse_client.rating).not.toBeUndefined();
//     expect(rateTransactionResponse_client.rating).not.toBeNull();

//     expect(rateTransactionResponse_client.author_id).not.toBeUndefined();
//     expect(rateTransactionResponse_client.author_id).not.toBeNull();
//     expect(rateTransactionResponse_client.author_id).toBe(clientUserData.id);



//     //withdraw parcel
//     const { result: withdrawParcelResult } = renderHook(() => useWithdrawParcelMutation(), {
//       wrapper: ({ children }) => <Provider store={clientComponent.store}>{children}</Provider>,
//     });

//     const withdrawParcelResponse = await act(async () => {
//       const result = await withdrawParcelResult.current[0](parcel_response.id).unwrap();
//       console.log("withdraw parcel result: ", result);
//       return result;
//     }
//     );

//     expect(withdrawParcelResponse).not.toBeUndefined(); 
//     //expect empyt object
//     expect(withdrawParcelResponse).toEqual({});
//   }, 20000);
// });








//     // //getme
//     // const { result: getMeResult } = renderHook(() => useLazyGetMeQuery(), {
//     //   wrapper: ({ children }) => <Provider store={courierComponent.store}>{children}</Provider>,
//     // });

//     // await act(async () => {
//     //   const getMeResultData = await getMeResult.current[0]().unwrap();
//     //   console.log("get me result: ", getMeResultData);
//     // });












