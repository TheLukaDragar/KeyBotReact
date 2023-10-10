import { StyleSheet } from 'react-native';

import { useRouter } from 'expo-router';
import { Button, Snackbar, TextInput } from 'react-native-paper';
import { Text, View } from '../../components/Themed';
import { useAppDispatch, useAppSelector } from '../../data/hooks';

import React, { useEffect } from 'react';
import { isErrorWithMessage, isFetchBaseQueryError, useConnectBoxMutation, useLazyGetAuthMsgQuery, useLoginWalletMutation } from '../../data/api';



export default function ConnectBox() {

  const router = useRouter();

  const secure = useAppSelector((state) => state.secure);
  const dispatch = useAppDispatch();

  const [ConnectBox, { isLoading: isLoading }] = useConnectBoxMutation();
  const [macAddress, setMacAddress] = React.useState("E8:6C:AB:36:64:D1");
  const [did, setDid] = React.useState("KeyBot_000000000001");
  const [result, setResult] = React.useState("result");

  const [ErrorMessage, setError] = React.useState("");




  useEffect(() => {

    //console.log(secure.userData);








  }, [])

  async function connectBox() {
    try {
      ///const msg = await getMessageToSign().unwrap();

      //call connect box api

      



      const response = await ConnectBox({
        did: did,
        macAddress: macAddress,
      }).unwrap();

    console.log(response, "response");

    setResult(JSON.stringify(response));


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

      <Text style={styles.title}>Connect Box to user</Text>


      <TextInput
        label="Mac Address"
        value={macAddress}
        onChangeText={text => setMacAddress(text)}
        mode="outlined"
        autoCapitalize="none"
        autoComplete="username"
        style={{ marginBottom: 16, width: 300 }}

        /> 

        <TextInput
        label="DID"
        value={did}
        onChangeText={text => setDid(text)}
        mode="outlined"
        autoCapitalize="none"
        autoComplete="username"
        style={{ marginBottom: 16, width: 300 }}
        /> 

      
    

      <Text>
        wallet:
        {secure.keyChainData.privateKey == null ? "null" : secure.keyChainData.privateKey}

      </Text>

      <Text>
        token:
        {secure.userData.token == null ? "null" : secure.userData.token}

      </Text>

        <Text>
        result:
        {result == null ? "null" : result}

        </Text>


      <Button
        onPress={() => connectBox()}
        loading={isLoading}
        mode="contained"
        contentStyle={{ padding: 20, width: 300 }}
        style={{ marginTop: 20 }}>

        Claim Box
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
