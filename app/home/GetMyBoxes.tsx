import { StyleSheet } from 'react-native';

import { useRouter } from 'expo-router';
import { Button, Snackbar, TextInput } from 'react-native-paper';
import { Text, View } from '../../components/Themed';
import { useAppDispatch, useAppSelector } from '../../data/hooks';

import React, { useEffect } from 'react';
import { isErrorWithMessage, isFetchBaseQueryError, useConnectBoxMutation, useLazyGetAuthMsgQuery, useLazyGetBoxesQuery, useLoginWalletMutation } from '../../data/api';



export default function ConnectBox() {

  const router = useRouter();

  const secure = useAppSelector((state) => state.secure);
  const dispatch = useAppDispatch();

  const [getBoxes,{ isLoading: isLoadingGetBoxes }] = useLazyGetBoxesQuery();
  const [result, setResult] = React.useState("result");

  const [ErrorMessage, setError] = React.useState("");




  useEffect(() => {

    //console.log(secure.userData);








  }, [])

  async function call_GetBoxes() {
    try {
      ///const msg = await getMessageToSign().unwrap();

      //call connect box api

    
      const response = await getBoxes().unwrap();

    console.log("call_GetBoxes",response);

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

      <Text style={styles.title}>Fetch my owned Boxes</Text>
        <Text>
        result:
        {result == null ? "null" : result}

        </Text>


      <Button
        onPress={() => call_GetBoxes()}
        loading={isLoadingGetBoxes}
        mode="contained"
        contentStyle={{ padding: 20, width: 300 }}
        style={{ marginTop: 20 }}>

        Fetch My Boxes
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
