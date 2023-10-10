import { StyleSheet } from 'react-native';

import { useRouter } from 'expo-router';
import { Button, Snackbar, TextInput } from 'react-native-paper';
import { PaperStyledText as Text, View } from '../../components/Themed';
import { useAppDispatch, useAppSelector } from '../../data/hooks';

import React, { useEffect } from 'react';
import '@ethersproject/shims';

import { ethers } from 'ethers';
import { isErrorWithMessage, isFetchBaseQueryError, useLazyGetAuthMsgQuery, useRegisterWalletMutation } from '../../data/api';
import { UserType2 } from '../../constants/Auth';




export default function Step_4_client_setup() {

  const router = useRouter();

  const secure = useAppSelector((state) => state.secure);
  const dispatch = useAppDispatch();

  const [email, setEmail] = React.useState('');
  const [username, setUsername] = React.useState('');

  const [emailError, setEmailError] = React.useState('');
  const [usernameError, setUsernameError] = React.useState('');
  const [ErrorMessage, setError] = React.useState("");


  const [getMessageToSign, { isLoading: IsLoadingMsg }] = useLazyGetAuthMsgQuery();

  const [RegisterWithWallet, { isLoading: isRegistering }] = useRegisterWalletMutation();





  const handleSubmit = async () => {
    try {
      if (validateEmail(email) && validateUsername(username)) {
        console.log('Email:', email);
        console.log('Username:', username);

        const msg = await getMessageToSign().unwrap();
        console.log(msg);

        console.log(secure.keyChainData?.privateKey!, "private key");
        const signer = new ethers.Wallet(secure.keyChainData?.privateKey!);
        console.log(signer.address, "signer");

        const signature = await signer.signMessage(msg?.message!)
        signature.replace('0x', '');
        console.log(signature, "signature");
        //remove 0x from signature


        // const wallet: Wallet = JSON.parse(secure.keyChainData?.wallet!);
        // console.log(wallet.address, "wallet address");

        const recoveredAddress = ethers.utils.verifyMessage(msg?.message!, signature);
        console.log(recoveredAddress, "recovered address");
        console.log(recoveredAddress === signer.address, "recovered address === wallet address");

        const payload = await RegisterWithWallet({
          wallet: signer.address,
          signature: signature,
          timestamp: msg?.timestamp!,
          ...(email !== '' && { email }),
          ...(username !== '' && { username }),
          userType:UserType2.RENTER
        }).unwrap();

        console.log(payload, "payload");
      } else {
        if (!validateEmail(email)) {
          setEmailError('Please enter a valid email address');
        }
        if (!validateUsername(username)) {
          setUsernameError('Username should not contain any special characters or spaces');
        }
      }
    } catch (err) {
      if (isFetchBaseQueryError(err)) {
        const errMsg = 'error' in err ? err.error : JSON.stringify(err.data);
        console.log("fetch error", err);
        setError(errMsg); // Replace setError with setEmailError or setUsernameError, as needed
      } else if (isErrorWithMessage(err)) {
        console.log("error with message , ", err);
        setError(err.message); // Replace setError with setEmailError or setUsernameError, as needed
      }
    }
  };

  const validateEmail = (email: string) => {
    const regex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
    return regex.test(email) || email.length === 0;
  };
  const validateUsername = (username: string) => {
    const regex = /^[a-zA-Z0-9]+$/;
    return regex.test(username) && username.length <= 20 || username.length == 0;
  };


  useEffect(() => {

    console.log("step 4");




  }, [])



  return (
    <View style={styles.container}>



      <Text
        style={{

          textAlign: 'center',
          marginBottom: 40,

        }}

      >
        enter a few details to get started

      </Text>

      {usernameError ? <Text style={{ color: 'red' }}>{usernameError}</Text> : null}


      <TextInput
        label="Username (required)"
        value={username}
        onChangeText={setUsername}
        onBlur={() => {
          if (username && !validateUsername(username)) {
            setUsernameError('Username should not contain any special characters or spaces');
          } else {
            setUsernameError('');
          }
        }}
        mode="outlined"
        autoCapitalize="none"
        autoComplete="username"
        error={Boolean(usernameError)}
        style={{ marginBottom: 16, width: 300 }}

      />

      {emailError ? <Text style={{ color: 'red' }}>{emailError}</Text> : null}



      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        onBlur={() => {
          if (email && !validateEmail(email)) {
            setEmailError('Please enter a valid email address');
          } else {
            setEmailError('');
          }
        }}
        mode="outlined"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        error={Boolean(emailError)}
        style={{ marginBottom: 16, width: 300 }}

      />


      <Button mode="contained" onPress={handleSubmit} style={{ marginTop: 80, alignSelf: 'center' }} contentStyle={{ flexDirection: 'row-reverse', width: 300, padding: 10 }}
        loading={isRegistering}
      >
        Submit
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
    flexDirection: 'column',
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
