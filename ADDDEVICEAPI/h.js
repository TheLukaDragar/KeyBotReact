//opmort ethers and make a wallet and save it 
const ethers = require('ethers');
const fs = require('fs');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// const wallet = ethers.Wallet.createRandom();

//use await to make sure it is done before continuing



async function createWallet() {

const pin = "1234";

try {
    console.log('createWallet');
    const mnemonic = ethers.utils.entropyToMnemonic(
        ethers.utils.randomBytes(32)
    )
    console.log('createWallet',"random done");
    const wallet = ethers.Wallet.fromMnemonic(mnemonic)
    const encryptedWallet = await wallet.encrypt(pin, { scrypt: { N: 2 ** 1 } }) //TODO: change N to 2 ** 18

    console.log('createWallet',"saving wallet");
    
    //store in secure store

    let wall = {
        mnemonicPhrase: wallet.mnemonic.phrase,
        keyChainData: { //only used for updating the state
        wallet: encryptedWallet,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic.phrase,
        pin: pin} 
    }

    //save to file
    fs.writeFileSync('./ADDDEVICEAPI/wallet.json', JSON.stringify(wall, null, 2));



    } catch (error) {
    return thunkAPI.rejectWithValue(error)
    }

}

async function loadWallet() {
    try {
        console.log('loadWallet');
        //read object fom file
        const wallet = JSON.parse(fs.readFileSync('./ADDDEVICEAPI/wallet.json', 'utf8'));
        console.log('loadWallet', wallet);
        //decrypt wallet

        const signer = new ethers.Wallet(wallet.keyChainData.privateKey);
        console.log('loadWallet', signer.address);

        //get message to sign fromapi https://4gkntp89fl.execute-api.eu-central-1.amazonaws.com/development/
        const url = "https://4gkntp89fl.execute-api.eu-central-1.amazonaws.com/development/auth/wallet-auth-msg"
        const response = await fetch(url);
        const data = await response.json();
        console.log('loadWallet', data);
        const signature = await signer.signMessage(data.message);
        console.log('loadWallet', signature);

        topost = {
            "wallet": signer.address,
            "signature": signature,
            "timestamp": data.timestamp,
            "email": "add_box@gmail.com",
            "username": "add_box_admin"
        }
        console.log('postinglogin', topost);

        const url2 = "https://4gkntp89fl.execute-api.eu-central-1.amazonaws.com/development/auth/login/wallet"
        const response2 = await fetch(url2, {
            method: 'POST',
            body: JSON.stringify(topost),
            headers: { 'Content-Type': 'application/json' }
        });
        const data2 = await response2.json();
        console.log('loadWallet', data2);

        const token = data2.authToken.data
        console.log('token', token);

        //get my data
        const url3 = "https://4gkntp89fl.execute-api.eu-central-1.amazonaws.com/development/users/me"
        const response3 = await fetch(url3, {
            method: 'GET',
            headers: { 'Authorization': token }
        });
        const data3 = await response3.json();
        console.log('my data', data3);

       let keyy="cQfTjWnZr4u7x!z%"

       //convert to hex string
         let keyhex = ethers.utils.formatBytes32String(keyy);

         //0x635166546a576e5a7234753778217a25
         //remove 0x
            keyhex = keyhex.substring(2);
            //remove last 32 bytes
            keyhex = keyhex.substring(0, keyhex.length - 32);


        //call create box
        const url4 = "https://4gkntp89fl.execute-api.eu-central-1.amazonaws.com/development/box/create"
        newbox = {
            "did":"BOX_000000000010",
            "macAddress":"EF:14:D4:70:B6:29",//"FF:FF:AB:36:64:D8",//"F9:E0:C3:CE:C3:14",
            "key":keyhex,
            "boxStatus":1,
        }

        console.log('newbox', newbox);

        const response4 = await fetch(url4, {
            method: 'POST',
            body: JSON.stringify(newbox),
            headers: { 'Content-Type': 'application/json', 'Authorization': token }
        });
        const data4 = await response4.json();
        console.log('create box', data4);

        boxId =1;

        //call get all boxes
        const url5 = "https://4gkntp89fl.execute-api.eu-central-1.amazonaws.com/development/box/"+boxId+"/data"
        //add params boxId = 1
        

        const response5 = await fetch(url5, {
            method: 'GET',
            headers: { 'Authorization': token }
    
        });
        console.log('token', token);
        const data5 = await response5.json();
        console.log('get all boxes', data5);

        //call get box 
        const url6 = "https://4gkntp89fl.execute-api.eu-central-1.amazonaws.com/development/box"
        //get
        const response6 = await fetch(url6, {
            method: 'GET',
            headers: { 'Authorization': token }

        });
        const data6 = await response6.json();
        console.log('get boxes', data6);





        return wallet;
    } catch (error) {
        console.log('loadWallet', error);
        return null;
    }

}

//createWallet();
loadWallet();


