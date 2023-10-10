/**
 * @jest-environment jsdom
 */
import 'whatwg-fetch';

// We're using our own custom render function and not RTL's render.
import '@testing-library/jest-dom';
import "whatwg-fetch";

import { ethers } from 'ethers';
import Constants from 'expo-constants';
import { AnyAction } from 'redux';
import { demoDevice } from '../ble/bleSlice';
import { approveTransferAndCheck, checkWhitelistedStatus, createDatasetAndCheck, downloadMetadataFromIPFS_, getOwnerOfNft_, getReputation_, make_newDatasetAndCheck, mintBoxAndCheck, monitorTaskProgress_, pushToSMSAndCheck, pushWeb2Secret_, runApp_, sellDataset, updateBoxAndCheck, uploadMetadataAndCheck } from '../data/__tests__/blockchain_utility';
import { BoxItem, GetBoxesResponse, ParcelData, PreciseLocation, RateTransactionDto, RatingType } from '../data/api';
import { ApproveTransfer, CreateDatasetResponse, Metadata, MintBox, MintBoxResponse, UpdateBox, UploadMetadataToIPFSResponse, getBoxDatasets } from '../data/blockchain';
import { loadDemoClientWallet, loadDemoCourierWallet } from '../data/secure';
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

const parcelNFTSCAddress = Constants?.expoConfig?.extra?.parcelNFTSCAddress;


describe('Full Test Scenario', () => {


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

    const privateKey_Courier = "0x6a3c63737cd800c0367abfb24d6f845de550907257ef1e3786583534c1440d1f";
    const privateKey_Client = "0xdbaa334fb6984b34062ff704300dd7dc47b6101f0feaf875d361dbe7e5f07786";
    const privateKey_UnWhitelisted = "0x143c63737cd805c0367abfb24d6f845de550907257ef1e3786583534c1440d1f";


    let uploadToIPFS_Result: UploadMetadataToIPFSResponse;
    let createDataset_Result: CreateDatasetResponse;

    let mintBox_Result: MintBoxResponse;
    let datasets: string[] = [];
    let taskIds: string[] = [];
    let results: { storage: string; location: string; }[] = [];
    let metadata_audit_trail: Metadata[] = [];






    beforeAll(async () => {
        const courierData = await setupAndLoadUser(loadDemoCourierWallet);
        courierComponent = courierData.component;
        courierResult = courierData.loginResult;
        courierUserData = courierResult.profile;


        //check if courier is whitelisted and private key is set correctly
        checkWhitelistedStatus(privateKey_Courier, true, courierComponent.store);

        const clientData = await setupAndLoadUser(loadDemoClientWallet);
        clientComponent = clientData.component;
        clientResult = clientData.loginResult;
        clientUserData = clientResult.profile;

        checkWhitelistedStatus(privateKey_Client, true, clientComponent.store);

       //boxes = await testClientGetsBoxes(clientComponent);
    },200000);


   

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

    it('(PDC Parcel pickup) Courier creates a parcel', async () => {
       parcel = await testCreateParcelByWallet(courierComponent, courierUserData, clientUserData, demo_box_did, courier_loocation1,"0x00000","1")
       expect(parcel).toBeTruthy();

    });
    //najprej je nft id 0topem nareis parce lpotem klics smart contract in UPDATAS NFT ID na parcelu
     //upload to ipfs
    it('(Mint parcel NFT) Courier upload MetaData to IPFS', async () => {

      //call uploadToIPFS
      await checkWhitelistedStatus(privateKey_Courier, true, courierComponent.store);


      const metadata = {
          location: courier_loocation1,
          user_id: courierUserData.id,
          parcel_id: parcel.id,
          action: "Courier picked up the parcel",
          timestamp: Date.now().toString(),
          testingEnv: true,
      }

      uploadToIPFS_Result = await uploadMetadataAndCheck(metadata, courierComponent.store);
      console.log("metadata uploaded successfully");
      console.log(uploadToIPFS_Result);

      metadata_audit_trail.push(metadata);

  }, 200000 );

  //create dataset nft
    it('(Mint parcel NFT) Courier creates a Dataset', async () => {

      await checkWhitelistedStatus(privateKey_Courier, true, courierComponent.store);


      createDataset_Result = await createDatasetAndCheck(uploadToIPFS_Result, courierComponent.store);
      console.log("dataset created successfully");
      console.log(createDataset_Result);

    }, 200000 );

  //callPushToSMS
    it('(Mint parcel NFT) Courier pushes secret to SMS', async () => {

      await checkWhitelistedStatus(privateKey_Courier, true, courierComponent.store);

      await pushToSMSAndCheck(createDataset_Result.datasetAddress, createDataset_Result.aesKey, courierComponent.store);
      console.log("pushed to sms successfully");

    }, 200000 );

  //sell dataset
    it('(Mint parcel NFT) Courier sells the Dataset', async () => {

      await checkWhitelistedStatus(privateKey_Courier, true, courierComponent.store);


      let res = await sellDataset(createDataset_Result, 0, courierComponent.store);

      console.log("dataset sold successfully");
      console.log(res);

    }, 200000 );

    //mint
    it('(Mint parcel NFT) Courier mints parcel NFT', async () => {
      
      const args: MintBox = {
        reciever_address: clientUserData.crypto[0].wallet,
        dataset: createDataset_Result.datasetAddress,
        parcel_id: parcel.id.toString(),
    }


    mintBox_Result = await mintBoxAndCheck(args, courierComponent.store);

    datasets.push(createDataset_Result.datasetAddress); //store created dataset addresses for later use
    console.log("minted NFT successfully");
    console.log(mintBox_Result);

    }, 200000 );

    //update parcel nft id

    it('(PDC Parcel pickup) Courier updates parcel NFT ID', async () => {

      parcel = {
        ...parcel,
        nftId: mintBox_Result.tokenId

      }



      const updateNFTIDResponse = await testUpdateParcel(courierComponent, parcel);
      expect(updateNFTIDResponse).toBeTruthy();
    });

    it('(Check Client reputation) Courier checks Client reputation', async () => {
      await checkWhitelistedStatus(privateKey_Courier, true, courierComponent.store);

      const reputation = await getReputation_(new ethers.Wallet(privateKey_Client).address, courierComponent.store);
      console.log("reputation: ", reputation);
      expect(reputation).toBeGreaterThanOrEqual(0);
    }, 200000);


    

    it('(PDC Parcel pickup) Courier gets Box precise location', async () => {
       boxLocation = await testGetBoxPreciseLocation(courierComponent, box?.id!);
      expect(boxLocation).toBeTruthy();
    });

    it('(OpenBox) Courier confirms that he is the owner of the NFT', async () => {

      await checkWhitelistedStatus(privateKey_Courier, true, courierComponent.store);

      const owner = await getOwnerOfNft_(mintBox_Result.tokenId, courierComponent.store);
      expect(owner).toBe(new ethers.Wallet(privateKey_Courier).address);


    }, 200000);

    it('(OpenBox) Courier opens to Box and with access key from API', async () => {
      const accessKey = await testConnectToDeviceAndGetAccessKey(courierComponent, demoDevice.id, box?.id!, boxLocation);
      expect(accessKey).toBeTruthy();
    },200000);
    
    // it('(OpenBox) Courier Updates MetaData when opening the Box', async () => {

    //     await checkWhitelistedStatus(privateKey_Courier, true, courierComponent.store);

    //     const newMetadata: Metadata = {
    //         location: "test2",
    //         timestamp: Date.now().toString(),
    //         testingEnv: true,
    //     }
    //     const newDataset = await make_newDatasetAndCheck(newMetadata,courierComponent.store);

    //     const args: UpdateBox = {
    //         tokenId: mintBox_Result.tokenId,
    //         dataset: newDataset,
    //         transferOwnership: false,
    //     }
    //     const res = await updateBoxAndCheck(args, courierComponent.store);
    //     console.log("updated box successfully");
    //     console.log(res);

    //     datasets.push(newDataset);



    // }, 200000 );

    it('(CloseBox) Courier Approves transfer of NFT', async () => {

      await checkWhitelistedStatus(privateKey_Courier, true, courierComponent.store);

      const args: ApproveTransfer = {
          to: parcelNFTSCAddress.toString(),
          tokenId: mintBox_Result.tokenId,
      }
      const res = await approveTransferAndCheck(args, courierComponent.store);

      console.log("approved transfer of NFT successfully");
      console.log(res);

    }, 200000 );


    it('(CloseBox) Courier Updates MetaData when closing the Box and transfers NFT ownership', async () => {

        await checkWhitelistedStatus(privateKey_Courier, true, courierComponent.store);

        const newMetadata: Metadata = {
          location: car_location,
          user_id: courierUserData.id,
          parcel_id: parcel.id,
          action: "Courier delivered the parcel",
            timestamp: Date.now().toString(),
            testingEnv: true,
        }
        const newDataset = await make_newDatasetAndCheck(newMetadata, courierComponent.store);

        const args: UpdateBox = {
            tokenId: mintBox_Result.tokenId,
            dataset: newDataset,
            transferOwnership: true,
        }
        const res = await updateBoxAndCheck(args, courierComponent.store);
        console.log("updated box successfully");
        console.log(res);

        datasets.push(newDataset);
        metadata_audit_trail.push(newMetadata);



    }, 200000 );



    it('(PDC Parcel pickup) Courier deposits a parcel', async () => {
      const depositParcelResponse = await testDepositParcel(courierComponent, parcel.id);
      expect(depositParcelResponse).toBeTruthy();
    }, 200000 );

    it('(PDC Parcel pickup) Client gets a parcel by ID', async () => {
      const parcel_response = await testGetParcelById(clientComponent, parcel.id);
      expect(parcel_response).toBeTruthy();
    }, 200000 );

    it('(PDC Parcel pickup) Client gets Box precise location', async () => {
      const box_location_client = await testGetBoxPreciseLocation(clientComponent, box?.id!);
      expect(box_location_client).toBeTruthy();
    }, 200000 );

    it('(PDC Parcel pickup) Client gets Box details', async () => {
      const box_details = await testGetBox(clientComponent, box?.id!);
      expect(box_details).toBeTruthy();
    }, 200000 );

    it('(Open Box) Client opens the box and with access key from API', async () => {
      const accessKey = await testConnectToDeviceAndGetAccessKey(clientComponent, demoDevice.id, box?.id!, boxLocation);
      expect(accessKey).toBeTruthy();
    }, 200000 );

    it('(Open Box) Client Updates MetaData when opening the Box', async () => {

      await checkWhitelistedStatus(privateKey_Client, true, clientComponent.store);

      const newMetadata: Metadata = {
      location:car_location,
      user_id: clientUserData.id,
      parcel_id: parcel.id,
      action: "Client opened the box",
          timestamp: Date.now().toString(),
          testingEnv: true,
      }
      const newDataset = await make_newDatasetAndCheck(newMetadata, clientComponent.store);

      const args: UpdateBox = {
          tokenId: mintBox_Result.tokenId,
          dataset: newDataset,
          transferOwnership: false,
      }
      const res = await updateBoxAndCheck(args, clientComponent.store);
      console.log("updated box successfully");
      console.log(res);

      datasets.push(newDataset);
      metadata_audit_trail.push(newMetadata);



    }, 200000 );

    

    it('(PDC Parcel pickup) Client rates the courier', async () => {
      const rating_courier: RateTransactionDto = {
        rating: 5,
        recipient_id: courierUserData.id, //for now only recipient can rate
        parcel_id: parcel.id,
        ratingType: RatingType.COURIER,
      };
    
      const rateTransactionResponse = await testRateTransaction(clientComponent, rating_courier, clientUserData.id);
      expect(rateTransactionResponse).toBeTruthy();
    
    }, 200000 );

    it('(PDC Parcel pickup) Client rates the box', async () => {
      const rating_box: RateTransactionDto = {
        rating: 5,
        recipient_id: box?.id!, //for now only recipient can rate
        parcel_id: parcel.id,
        ratingType: RatingType.SMART_BOX,
      };

      const rateTransactionResponse = await testRateTransaction(clientComponent, rating_box, clientUserData.id);
      expect(rateTransactionResponse).toBeTruthy();
    }, 200000 );

    // it('(CloseBox) Client Updates MetaData when closing the Box', async () => {

    //   await checkWhitelistedStatus(privateKey_Client, true, clientComponent.store);

    //   const newMetadata: Metadata = {
    //       location: "test3",
    //       timestamp: Date.now().toString(),
    //       testingEnv: true,
    //   }
    //   const newDataset = await make_newDatasetAndCheck(newMetadata, clientComponent.store);

    //   const args: UpdateBox = {
    //       tokenId: mintBox_Result.tokenId, //TODO: can get this from contract and parcel
    //       dataset: newDataset,
    //       transferOwnership: false,
    //   }
    //   const res = await updateBoxAndCheck(args, clientComponent.store);
    //   console.log("updated box successfully");
    //   console.log(res);

    //   datasets.push(newDataset);



    // }, 200000 );


    it('(PDC Parcel pickup) Client withdraws the parcel', async () => {
      const withdrawParcelResponse = await testWithdrawParcel(clientComponent, parcel.id);
      expect(withdrawParcelResponse).toBeTruthy();
    }, 200000 );

    //get box datasets
    it('(Read audit trail datasets) Client gets Box datasets', async () => {

      await checkWhitelistedStatus(privateKey_Client, true, clientComponent.store);
      //call callGetBoxDatasets
      const res = await  clientComponent.store.dispatch(getBoxDatasets(
          parcel.nftId,
      ) as unknown as AnyAction).unwrap();

      console.log("got box datasets successfully");
      console.log(res);

      //rs sqould equal to datasets array
      expect(res).not.toBeUndefined();
      expect(res).not.toBeNull();
      expect(res).not.toBe("");

      expect(res).toEqual(datasets);


    }, 200000 );

    //push web2 secret to sms
    it('(Get decrypted audit trail) Client push/check Web2 secret to SMS', async () => {

      await checkWhitelistedStatus(privateKey_Client, true, clientComponent.store);

      await pushWeb2Secret_("iexec-result-iexec-ipfs-token", clientComponent.store);

      console.log("pushed web2 secret to sms successfully");
  }, 1000000);

  // it('(Get decrypted audit trail) Courier push/check Web2 secret to SMS', async () => {

  //   await checkWhitelistedStatus(privateKey_Courier, true, courierComponent.store);

  //   await pushWeb2Secret_("iexec-result-iexec-ipfs-token", courierComponent.store);

  //   console.log("pushed web2 secret to sms successfully");
  // }, 1000000);



  it('(Get decrypted audit trail) Client runs DLMD Apps for MetaData decryption', async () => {

      await checkWhitelistedStatus(privateKey_Client, true, clientComponent.store);

      for (let i = 0; i < datasets.length; i++) {
          const dataset = datasets[i];

          let {dealId, volume, txHash,tasks}= await runApp_(mintBox_Result.tokenId,dataset, clientComponent.store);
          
          expect(dealId).toBeDefined();
          expect(volume).toBeDefined();
          expect(txHash).toBeDefined();
          expect(tasks).toBeDefined();

          expect(dealId).not.toBeNull();
          expect(volume).not.toBeNull();
          expect(txHash).not.toBeNull();
          expect(tasks).not.toBeNull();

          expect(tasks.length).toBeGreaterThan(0);
          taskIds=taskIds.concat(tasks);

          console.log("dealId: ", dealId);
          console.log("volume: ", volume);
          console.log("txHash: ", txHash);
          console.log("tasks: ", tasks);

      }

          


      console.log("ran app successfully");
  }, 1000000);

  it('(Get decrypted audit trail) Client waits for tasks to complete succesfully', async () => {

      await checkWhitelistedStatus(privateKey_Client, true, clientComponent.store);

      const completedTasks = await monitorTaskProgress_(taskIds, clientComponent.store);

      expect(completedTasks).toBeDefined();
      expect(completedTasks).not.toBeNull();
      expect(completedTasks.length).toBeGreaterThan(0);
      //expect all to have statusName COMPLETED
      completedTasks.forEach((task: { statusName: any; }) => {
          expect(task.statusName).toBe("COMPLETED");
      });

      //get result
      let res = completedTasks.map((task: { results: {
          storage: string;
          location: string;
      }; }) => task.results);

      console.log("result: ", res);

      //expect all to have storage and location
      res.forEach((result: { storage: any; location: any; }) => {
          expect(result.storage).toBeDefined();
          expect(result.location).toBeDefined();
          expect(result.storage).not.toBeNull();
          expect(result.location).not.toBeNull();
          expect(result.storage.length).toBeGreaterThan(0);
          expect(result.location.length).toBeGreaterThan(0);

      });

      results = res;

  
      console.log("all tasks completed successfully");
  }, 1000000);

  //download from ipfs
  it('(Get decrypted audit trail) Client downloads the decrypted audit trail from IPFS', async () => {


      for (let i = 0; i < results.length; i++) {
          const result = results[i];
          

          //call downloadMetadataFromIPFS_
          let file = await downloadMetadataFromIPFS_(result.location, clientComponent.store);

          console.log("downloaded metadata from ipfs successfully");
          console.log("MetaData: ", file);
          let decrypted_metadata = JSON.parse(file);

          expect(decrypted_metadata).toBeDefined();
          expect(decrypted_metadata).not.toBeNull();
          
          //expect to find an equal object in metadata_audit_trail
          let found = metadata_audit_trail.find((metadata: any) => {
              return metadata.timestamp === decrypted_metadata.timestamp;
          }
          );

          console.log("found: ", found);
          console.log("decrypted_metadata: ", decrypted_metadata);

          expect(found).toBeDefined();
          expect(found).not.toBeNull();
          expect(found).toEqual(decrypted_metadata);

      }

      
  }, 1000000);













});

 
  
  
  
  
  
  
  
































  // function testMintParcelNFT(courierComponent: any, id: number) {
  //   throw new Error('Function not implemented.');
  // }
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
//   }, 200000 00);
// });








//     // //getme
//     // const { result: getMeResult } = renderHook(() => useLazyGetMeQuery(), {
//     //   wrapper: ({ children }) => <Provider store={courierComponent.store}>{children}</Provider>,
//     // });

//     // await act(async () => {
//     //   const getMeResultData = await getMeResult.current[0]().unwrap();
//     //   console.log("get me result: ", getMeResultData);
//     // });












