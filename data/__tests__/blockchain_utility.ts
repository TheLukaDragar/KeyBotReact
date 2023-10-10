import { AnyAction } from 'redux';
import { ApproveTransfer, ApproveTransferResponse, CreateDatasetResponse, Metadata, MintBox, MintBoxResponse, UpdateBox, UpdateBoxResponse, UploadMetadataToIPFSResponse, approveTransfer, callCreateDataset, callPushToSMS, callSellDataset, downloadMetadataFromIPFS, getOwnerOfNft, getReputation, isWhitelisted, mintBox, monitorTaskProgress, pushWeb2Secret, runApp, setPrivateKey, updateBox, uploadMetadataToIPFS } from '../blockchain';

export async function uploadMetadataAndCheck(metadata: Metadata, store: any) {
    const result = await store.dispatch(uploadMetadataToIPFS(metadata) as unknown as AnyAction).unwrap();

    expect(result).not.toBeUndefined();
    expect(result).not.toBeNull();
    expect(result.ipfsRes.Hash).not.toBeUndefined();
    expect(result.ipfsRes.Hash).not.toBeNull();
    expect(result.ipfsRes.Hash).not.toBe("");

    return result;
}

export async function createDatasetAndCheck(ipfsResult: UploadMetadataToIPFSResponse, store: any) {
    const createDataset_Result = await store.dispatch(callCreateDataset({
        ipfsRes: ipfsResult.ipfsRes,
        aesKey: ipfsResult.aesKey,
        checksum: ipfsResult.checksum,
    }) as unknown as AnyAction).unwrap();


    expect(createDataset_Result).not.toBeUndefined();
    expect(createDataset_Result).not.toBeNull();
    expect(createDataset_Result.datasetAddress).not.toBeUndefined();
    expect(createDataset_Result.datasetAddress).not.toBeNull();
    expect(createDataset_Result.datasetAddress).not.toBe("");
    expect(createDataset_Result.txHash).not.toBeUndefined();
    expect(createDataset_Result.txHash).not.toBeNull();
    expect(createDataset_Result.txHash).not.toBe("");

    return createDataset_Result;
}

export async function make_newDatasetAndCheck(metadata: Metadata, store: any): Promise<string> {
    //ipfs
    const ipfs: UploadMetadataToIPFSResponse = await uploadMetadataAndCheck(metadata, store);
    //dataset
    const dataset: CreateDatasetResponse = await createDatasetAndCheck(ipfs, store);
    //sms
    await pushToSMSAndCheck(dataset.datasetAddress, ipfs.aesKey, store);

    //sell dataset
    await sellDataset(dataset, 0, store);

    return dataset.datasetAddress;
}

export async function pushToSMSAndCheck(datasetAddress: string, aesKey: string, store: any) {
    await store.dispatch(callPushToSMS({
        dataset_address: datasetAddress,
        aesKey: aesKey,
    }) as unknown as AnyAction).unwrap();

    console.log("pushed to sms successfully");
}

export async function sellDataset(createDataset_Result: CreateDatasetResponse, price: number, store: any) {

    //call callSellDataset
    let res = await store.dispatch(callSellDataset({
        dataset_address: createDataset_Result.datasetAddress,
        price: 0,
    }
    ) as unknown as AnyAction).unwrap();

    return res;

}

export async function mintBoxAndCheck(args: MintBox, store: any): Promise<MintBoxResponse> {

    //call callSellDataset
    let res = await store.dispatch(mintBox(args) as unknown as AnyAction).unwrap();

    expect(res).not.toBeUndefined();
    expect(res).not.toBeNull();
    expect(res.tokenId).not.toBeUndefined();
    expect(res.tokenId).not.toBeNull();
    expect(res.tokenId).not.toBe("");



    return res;

}

export async function getOwnerOfNft_(tokenId: string, store: any): Promise<string> {

    //call callSellDataset
    let res = await store.dispatch(getOwnerOfNft(tokenId) as unknown as AnyAction).unwrap();

    return res;

}

export async function getReputation_(address: string, store: any): Promise<number> {

    //call callSellDataset
    let res = await store.dispatch(getReputation(address) as unknown as AnyAction).unwrap();

    return res;

}


export async function approveTransferAndCheck(args: ApproveTransfer, store: any): Promise<ApproveTransferResponse> {

    //call callSellDataset
    let res = await store.dispatch(approveTransfer(args) as unknown as AnyAction).unwrap();

    expect(res).not.toBeUndefined();
    expect(res).not.toBeNull();
    expect(res.txHash).not.toBeUndefined();
    expect(res.txHash).not.toBeNull();
    expect(res.txHash).not.toBe("");



    return res;

}

//updateBox
export async function updateBoxAndCheck(args: UpdateBox, store: any): Promise<UpdateBoxResponse> {
    //call callSellDataset
    let res = await store.dispatch(updateBox(args) as unknown as AnyAction).unwrap();
    expect(res).not.toBeUndefined();
    expect(res).not.toBeNull();
    expect(res).not.toBe("");
    return res;

}

export async function setPrivateKeyAndCheckIt(privateKey: string, store: any) {
    await store.dispatch(setPrivateKey(privateKey) as unknown as AnyAction);

    const state: any = store.getState();
    const privateKeyInStore = state.blockchain.privateKey;

    expect(privateKeyInStore).toBe(privateKey);
}


export async function checkWhitelistedStatus(privateKey: string, expectedStatus: boolean, store: any) {
    await store.dispatch(setPrivateKey(privateKey) as unknown as AnyAction);

    const result = await store.dispatch(isWhitelisted() as unknown as AnyAction).unwrap();

    expect(result).toBe(expectedStatus);
}


// //orderRequestExecution
// export async function orderRequestExecutionAndCheck(datasetAddress: string, price: number, store: any): Promise<string> {
//     //call callSellDataset
//     let res = await store.dispatch(orderRequestExecution({
//         dataset: datasetAddress,
//         price: price,
//     }) as unknown as AnyAction).unwrap();

//     expect(res).not.toBeUndefined();
//     expect(res).not.toBeNull();
//     expect(res).not.toBe("");
//     return res;

// }


export async function pushWeb2Secret_(secretName: string, store: any): Promise<string> {
    //call callSellDataset
    let res = await store.dispatch(pushWeb2Secret(secretName) as unknown as AnyAction).unwrap();

    expect(res).toBe(true);
    return res;

}

export async function runApp_(tokenId: string, dataset: string, store: any): Promise<{ dealId: string, volume: number, txHash: string, tasks: string[] }> {
    //call callSellDataset
    const res = await store.dispatch(runApp({
        tokenId: tokenId,
        dataset: dataset,
        price: 0,
    }) as unknown as AnyAction).unwrap();

    return res;

}

export async function monitorTaskProgress_(tasks: string[], store: any): Promise<any> {
    //call callSellDataset
    while (true) {
        const { tasksCompleted, tasksFailed, tasksTimeout, tasksData } = await store.dispatch(
            monitorTaskProgress({ tasks: tasks, }) as unknown as AnyAction
        ).unwrap();

        if (tasksCompleted === tasks.length || tasksFailed > 0 || tasksTimeout > 0) {
            console.log(`Tasks finished completed: ${tasksCompleted}/${tasks.length} failed: ${tasksFailed} timeout: ${tasksTimeout}`);
            console.log(`Tasks data: ${JSON.stringify(tasksData)}`);
            return tasksData;
        }
        console.log(`Tasks completed: ${tasksCompleted}/${tasks.length}`);
        console.log(`Tasks data: ${JSON.stringify(tasksData)}`);

        await new Promise(resolve => setTimeout(resolve, 5000));
    }

}

//downloadDataset
export async function downloadMetadataFromIPFS_(address: string, store: any): Promise<any> {
    //call callSellDataset
    let res = await store.dispatch(downloadMetadataFromIPFS(address) as unknown as AnyAction).unwrap();

    return res;

}



