import { StyleSheet } from 'react-native';

import '@ethersproject/shims';
import { ethers } from 'ethers';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Button, Snackbar } from 'react-native-paper';
import { Text, View } from '../../components/Themed';
import { UserType2 } from '../../constants/Auth';
import { isErrorWithMessage, isFetchBaseQueryError, useLazyGetAuthMsgQuery, useLoginWalletMutation } from '../../data/api';
import { useAppDispatch, useAppSelector } from '../../data/hooks';
import { loadDemoClientWallet, loadDemoCourierWallet, setUserType } from '../../data/secure';



export default function TabTwoScreen() {

  const router = useRouter();

  const secure = useAppSelector((state) => state.secure);
  const dispatch = useAppDispatch();

  const [Login, { isLoading: isLoginIn }] = useLoginWalletMutation();

  const [getMessageToSign, { isLoading: IsLoadingMsg }] = useLazyGetAuthMsgQuery();

  const [ErrorMessage, setError] = React.useState("");



  useEffect(() => {

    //console.log(secure.userData);








  }, [])

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

      await dispatch(setUserType(result.profile.userType as UserType2)).unwrap()

      console.log(result);
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

  async function demo_client_login() {
    try {


      const secure_data = await dispatch(loadDemoClientWallet()).unwrap()



      const msg = await getMessageToSign().unwrap();


      console.log(secure_data.keyChainData?.privateKey!, "private key");
      console.log(msg?.message!, "message");
      const signer = new ethers.Wallet(secure_data.keyChainData?.privateKey!);
      const signature = await signer.signMessage(msg?.message!);

      const recoveredAddress = ethers.utils.verifyMessage(msg?.message!, signature);

      console.log(recoveredAddress === signer.address, "recovered address === wallet address");

      const result = await Login({
        wallet: signer.address,
        signature: signature,
        timestamp: msg?.timestamp!,
      }).unwrap();

      await dispatch(setUserType(result.profile.userType as UserType2
      )).unwrap()

      console.log(result);
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

  async function demo_courier_login() {
    try {



      const secure_data = await dispatch(loadDemoCourierWallet()).unwrap()

      //here we use the outut of the dispatch direclt because the secure state is updated asyncronously

      const msg = await getMessageToSign().unwrap();

      console.log(secure_data.keyChainData?.privateKey!, "private key");
      console.log(msg?.message!, "message");
      const signer = new ethers.Wallet(secure_data.keyChainData?.privateKey!);
      const signature = await signer.signMessage(msg?.message!);

      const recoveredAddress = ethers.utils.verifyMessage(msg?.message!, signature);

      console.log(recoveredAddress === signer.address, "recovered address === wallet address");

      const result = await Login({
        wallet: signer.address,
        signature: signature,
        timestamp: msg?.timestamp!,
      }).unwrap();

      await dispatch(setUserType(result.profile.userType as UserType2
      )).unwrap()

      console.log(result);
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
    <View style={styles.container}>

      <Text style={styles.title}>Welcome to DLMD</Text>

      {/* <Text>
        wallet:
        {secure.keyChainData.privateKey == null ? "null" : secure.keyChainData.privateKey}

      </Text>

      <Text>
        token:
        {secure.userData.token == null ? "null" : secure.userData.token}

      </Text> */}



      <Button
        onPress={() => router.push('auth/step_1_choose_role')}
        mode="contained"
        contentStyle={{ padding: 20, width: 300 }}
        style={{ marginTop: 20 }}>

        Begin
      </Button>
      <Button
        onPress={() => demo_client_login()}
        mode="contained"
        contentStyle={{ padding: 20, width: 300 }}
        style={{ marginTop: 20 }}>
        Client (Demo)
      </Button>
      <Button
        onPress={() => demo_courier_login()}
        mode="contained"
        contentStyle={{ padding: 20, width: 300 }}
        style={{ marginTop: 20 }}>

        Courier (Demo)
      </Button>

      <Button
        onPress={() => login()}
        loading={isLoginIn || IsLoadingMsg}
        mode="contained"
        contentStyle={{ padding: 20, width: 300 }}
        style={{ marginTop: 20 }}>

        Login
      </Button>

      <Button
        onPress={() => router.push('auth/intro_1')}
        mode="contained"
        contentStyle={{ padding: 20, width: 300 }}
        style={{ marginTop: 20 }}>

        Intro
      </Button>

      <Snackbar
        visible={ErrorMessage != ""}
        onDismiss={() => { setError(""); }}
        action={{
          label: 'Ok',
          onPress: () => {
            // Do something

            setError("");

          },
        }}>
        {ErrorMessage}
      </Snackbar>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
});
