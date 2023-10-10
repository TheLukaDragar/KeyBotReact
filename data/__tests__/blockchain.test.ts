/**
 * @jest-environment jsdom
 */
import "whatwg-fetch";

import { configureStore } from '@reduxjs/toolkit';
import { ethers } from "ethers";
import Constants from "expo-constants";
import { AnyAction } from 'redux';
import blockchainSlice, { ApproveTransfer, CreateDatasetResponse, Metadata, MintBox, MintBoxResponse, UpdateBox, UploadMetadataToIPFSResponse, getBoxDatasets } from '../blockchain';
import { approveTransferAndCheck, checkWhitelistedStatus, createDatasetAndCheck, downloadMetadataFromIPFS_, getOwnerOfNft_, make_newDatasetAndCheck, mintBoxAndCheck, monitorTaskProgress_, pushToSMSAndCheck, pushWeb2Secret_, runApp_, sellDataset, setPrivateKeyAndCheckIt, updateBoxAndCheck, uploadMetadataAndCheck } from "./blockchain_utility";

jest.mock('expo-constants', () => require('../../tests/mockExpoConstants'));

const reputationSCAddress = Constants?.expoConfig?.extra?.reputationSCAddress;
const parcelNFTSCAddress = Constants?.expoConfig?.extra?.parcelNFTSCAddress;





describe('blockchainSlice', () => {
    let store: ReturnType<typeof configureStore>;

    const privateKey_Courier = "0x6a3c63737cd800c0367abfb24d6f845de550907257ef1e3786583534c1440d1f";
    const privateKey_Client = "0xdbaa334fb6984b34062ff704300dd7dc47b6101f0feaf875d361dbe7e5f07786";
    const privateKey_UnWhitelisted = "0x143c63737cd805c0367abfb24d6f845de550907257ef1e3786583534c1440d1f";


    let metadata: Metadata;
    let uploadToIPFS_Result: UploadMetadataToIPFSResponse;
    let createDataset_Result: CreateDatasetResponse;

    let mintBox_Result: MintBoxResponse;
    let datasets: string[] = [];
    let dealId: string;
    let taskIds: string[] = [];
    let results: { storage: string; location: string; }[] = [];




    beforeEach(() => {
        // setup blockchain slice
        store = configureStore({
            reducer: {
                blockchain: blockchainSlice,
            },
        });
    });



    it('sets the private key correctly in the store', async () => {
        await setPrivateKeyAndCheckIt(privateKey_Client, store);
    });


    it('confirms that a whitelisted client is recognized as whitelisted', async () => {
        await checkWhitelistedStatus(privateKey_Client, true, store);
    });

    it('confirms that a whitelisted courier is recognized as whitelisted', async () => {
        await checkWhitelistedStatus(privateKey_Courier, true, store);
    });

    it('confirms that an unwhitelisted address is recognized as not whitelisted', async () => {
        await checkWhitelistedStatus(privateKey_UnWhitelisted, false, store);
    });


    //push web2 secret to sms
    it('push web2 secret to sms', async () => {

        await checkWhitelistedStatus(privateKey_Courier, true, store);

        await pushWeb2Secret_("iexec-result-iexec-ipfs-token", store);

        console.log("pushed web2 secret to sms successfully");
    }, 1000000);


    //upload to ipfs
    it('upload MetaData to IPFS', async () => {

        //call uploadToIPFS
        await checkWhitelistedStatus(privateKey_Courier, true, store);


        metadata = {
            location: {
                latitude: 0,
                longitude: 0,
                inaccuracy: 0,

            },
            parcel_id: 0,
            user_id: 0,
            action: "parcel created",
            timestamp: Date.now().toString(),
            testingEnv: true,
        }

        uploadToIPFS_Result = await uploadMetadataAndCheck(metadata, store);
        console.log("metadata uploaded successfully");
        console.log(uploadToIPFS_Result);

    }, 1000000);

    //create dataset nft
    it('create Dataset', async () => {

        await checkWhitelistedStatus(privateKey_Courier, true, store);


        createDataset_Result = await createDatasetAndCheck(uploadToIPFS_Result, store);
        console.log("dataset created successfully");
        console.log(createDataset_Result);

    }, 1000000);

    //callPushToSMS
    it('push secret to SMS', async () => {

        await checkWhitelistedStatus(privateKey_Courier, true, store);


        await pushToSMSAndCheck(createDataset_Result.datasetAddress, createDataset_Result.aesKey, store);
        console.log("pushed to sms successfully");

    }, 1000000);

    //sell dataset
    it('sell Dataset', async () => {

        await checkWhitelistedStatus(privateKey_Courier, true, store);



        let res = await sellDataset(createDataset_Result, 0, store);

        console.log("dataset sold successfully");
        console.log(res);

    }, 1000000);

    it('(Mint Parcel NFT) mint the NFT', async () => {

        await checkWhitelistedStatus(privateKey_Courier, true, store);



        //fakers lib za uuid

        const id = Math.floor(Math.random() * 10000).toString()   //use timestamp as id for parcel //p[arcel id je lahko isti vedno
        console.log(id);


        const args: MintBox = {
            reciever_address: new ethers.Wallet(privateKey_Client).address,
            dataset: createDataset_Result.datasetAddress,
            parcel_id: "1",
        }


        mintBox_Result = await mintBoxAndCheck(args, store);

        datasets.push(createDataset_Result.datasetAddress); //store created dataset addresses for later use
        console.log("minted NFT successfully");
        console.log(mintBox_Result);

    }, 1000000);

    //confirms that is the owner of the NFT
    it('confirm Courier is the owner of the NFT', async () => {

        await checkWhitelistedStatus(privateKey_Courier, true, store);

        const owner = await getOwnerOfNft_(mintBox_Result.tokenId, store);
        expect(owner).toBe(new ethers.Wallet(privateKey_Courier).address);





    }, 1000000);



    it('Approve transfer of NFT', async () => {

        await checkWhitelistedStatus(privateKey_Courier, true, store);

        const args: ApproveTransfer = {
            to: parcelNFTSCAddress.toString(),
            tokenId: mintBox_Result.tokenId,
        }
        const res = await approveTransferAndCheck(args, store);

        console.log("approved transfer of NFT successfully");
        console.log(res);

    }, 1000000);

    // it('Updates MetaData when opening the Box', async () => {

    //     await checkWhitelistedStatus(privateKey_Courier, true, store);

    //     const newMetadata: Metadata = {
    //         location: "test2",
    //         timestamp: Date.now().toString(),
    //         testingEnv: true,
    //     }
    //     const newDataset = await make_newDatasetAndCheck(newMetadata, store);

    //     const args: UpdateBox = {
    //         tokenId: mintBox_Result.tokenId,
    //         dataset: newDataset,
    //         transferOwnership: false,
    //     }
    //     const res = await updateBoxAndCheck(args, store);
    //     console.log("updated box successfully");
    //     console.log(res);

    //     datasets.push(newDataset);



    // }, 1000000);





    it('Updates MetaData when closing the Box and transfers  NFT ownership', async () => {

        await checkWhitelistedStatus(privateKey_Courier, true, store);



        const newMetadata: Metadata = {
            location: {
                latitude: 0,
                longitude: 0,
                inaccuracy: 0,

            },
            parcel_id: 0,
            user_id: 0,
            action: "Courier delivered parcel",
            timestamp: Date.now().toString(),
            testingEnv: true,
        }
        const newDataset = await make_newDatasetAndCheck(newMetadata, store);

        const args: UpdateBox = {
            tokenId: mintBox_Result.tokenId,
            dataset: newDataset,
            transferOwnership: true,
        }
        const res = await updateBoxAndCheck(args, store);
        console.log("updated box successfully");
        console.log(res);

        datasets.push(newDataset);



    }, 1000000);

    //get box datasets
    it('(Read audit trail datasets) get box datasets', async () => {

        await checkWhitelistedStatus(privateKey_Courier, true, store);



        //call callGetBoxDatasets
        const res = await store.dispatch(getBoxDatasets(
            mintBox_Result.tokenId,
        ) as unknown as AnyAction).unwrap();

        console.log("got box datasets successfully");
        console.log(res);

        //rs sqould equal to datasets array
        expect(res).not.toBeUndefined();
        expect(res).not.toBeNull();
        expect(res).not.toBe("");

        expect(res).toEqual(datasets);


    }, 1000000);


    it('(Get decrypted audit trail) runs DLMD App for MetaData decryption', async () => {

        await checkWhitelistedStatus(privateKey_Courier, true, store);

        let { dealId: d, volume, txHash, tasks } = await runApp_(mintBox_Result.tokenId, datasets[0], store);
        dealId = d;
        expect(dealId).toBeDefined();
        expect(volume).toBeDefined();
        expect(txHash).toBeDefined();
        expect(tasks).toBeDefined();

        expect(dealId).not.toBeNull();
        expect(volume).not.toBeNull();
        expect(txHash).not.toBeNull();
        expect(tasks).not.toBeNull();

        expect(tasks.length).toBeGreaterThan(0);
        taskIds = tasks;

        console.log("dealId: ", dealId);
        console.log("volume: ", volume);
        console.log("txHash: ", txHash);
        console.log("tasks: ", tasks);


        console.log("ran app successfully");
    }, 1000000);

    it('(Get decrypted audit trail) waits for task to complete succesfully', async () => {

        await checkWhitelistedStatus(privateKey_Courier, true, store);

        const completedTasks = await monitorTaskProgress_(taskIds, store);

        expect(completedTasks).toBeDefined();
        expect(completedTasks).not.toBeNull();
        expect(completedTasks.length).toBeGreaterThan(0);
        //expect all to have statusName COMPLETED
        completedTasks.forEach((task: { statusName: any; }) => {
            expect(task.statusName).toBe("COMPLETED");
        });

        //get result
        let res = completedTasks.map((task: {
            results: {
                storage: string;
                location: string;
            };
        }) => task.results);

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
    it('(Get decrypted audit trail) downloads MetaData from IPFS', async () => {

        //call downloadMetadataFromIPFS_
        let file = await downloadMetadataFromIPFS_(results[0].location, store);

        console.log("downloaded metadata from ipfs successfully");
        console.log("file: ", file);
        let decrypted_metadata = JSON.parse(file);

        expect(decrypted_metadata).toBeDefined();
        expect(decrypted_metadata).not.toBeNull();

        //expect object to equal to metadata
        expect(decrypted_metadata).toEqual(metadata);

    }, 1000000);










    //reqest decrypted data orderRequestExecutionAndCheck
    // it('request decrypted data', async () => {

    //         await checkWhitelistedStatus(privateKey_Courier, true, store);

    //         //orderRequestExecutionAndCheck
    //         const res = await orderRequestExecutionAndCheck(
    //             datasets[0],
    //             0,
    //             store
    //         );

    //         console.log("requested decrypted data successfully");
    //         console.log(res);

    // }, 1000000);

















});





