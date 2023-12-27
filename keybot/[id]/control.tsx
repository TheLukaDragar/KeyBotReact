import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Button, Snackbar } from 'react-native-paper';
import { Text, View } from '../../../../components/Themed';
import { RootTabScreenProps } from '../../../../types';
//import store from redux-toolkit store
//import secureReducer, { getMnemonic , setMnemonic} from '../../data/secure';
import { ActivityIndicator, MD2Colors } from 'react-native-paper';
import { useAppDispatch, useAppSelector } from '../../../../data/hooks';
//bleslice
//import {setLog, setPeriphiralID, setStatus } from '../../ble/bleSlice';
//bleservice
//import  { BLEServiceInstance } from '../../ble/BLEService';
import * as Location from 'expo-location';
import { LocationObject } from 'expo-location';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import {
  authenticate,
  connectDeviceById,
  disconnectDevice, getChallenge,
  keyBotCommand,
  manualMotorControl,
  subscribeToEvents
} from '../../../../ble/bleSlice';
import { KeyBotCommand, ManualMotorControlCommand } from '../../../../ble/bleSlice.contracts';
import { isErrorWithMessage, isFetchBaseQueryError, useLazyGetBoxAccessKeyQuery, useLazyGetBoxPreciseLocationQuery } from '../../../../data/api';
import { callDatasetContract } from '../../../../data/blockchain';
import { getLocation } from '../../../../utils/getlocation';

export default function TabOneScreen({ navigation }: RootTabScreenProps<'TabOne'>,) {
  const user = useAppSelector((state) => state.user);
  const dispatch = useAppDispatch();
  const loading = useAppSelector((state) => state.loading);
  const secure = useAppSelector((state) => state.secure);
  const ble = useAppSelector((state) => state.ble);
  //const bleService =  BLEServiceInstance;
  const [calibMode, setCalibMode] = useState(false);
  const params = useLocalSearchParams();

  const [getBoxPreciseLocation] = useLazyGetBoxPreciseLocationQuery();


  const [getBoxAccessKey, { isLoading: isLoading, error: error }] = useLazyGetBoxAccessKeyQuery();



  const [location, setLocation] = React.useState<LocationObject | null>(null);
  const [ErrorMessage, setError] = React.useState("");
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [ble.logs]);
  //dispatch(setMnemonic(pin));

  useEffect(() => {

    //console.log(secure.userData);




    console.log(secure);

    (async () => {

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission to access location was denied');

        return;
      }
      let location = await getLocation();
      setLocation(location);
    })();

    // (async () => {
    //   await dispatch(loadDemoClientWallet()).unwrap().then((result) => {
    //     console.log(result);
    //   }).catch((error) => {
    //     console.log(error);
    //   });
    // })();


  }, [])

  async function test() {

    const args = {
      name: "cv.pdf",
      multiaddr: "ipfs/QmUZxd6edNcwQEgjpvTNjmLDgzZxSjwDSMKwRrHEcKnUyM",
      checksum: '0x82fe3d68048079af009667e5800223f37d1d9adaf1402b2e5723c93ebcf3a749',
      testingEnv: false
    };





    let result = await dispatch(callDatasetContract(args)).unwrap().then((result) => {
      console.log(result);
      return result;
    }).catch((error) => {
      console.log(error);
      return error;
    });
  }

  async function BleConnect() {
    try {

      const preciseLocationBox = await getBoxPreciseLocation(parseInt(String(params.boxId))).unwrap();
      console.log("preciseLocationBox", preciseLocationBox);

      // 1. Connect to device
      const connectResult = await dispatch(connectDeviceById({ id: String(params.id) })).unwrap();
      console.log("connectResult", connectResult);

      // 2. Get the challenge
      const challenge = await dispatch(getChallenge()).unwrap();
      console.log("challenge", challenge);


      // //check if location is null
      // if (location == null) {
      //   throw new Error("Location service is not enabled please enable it");
      // }


      // //3. get location of the user
      // console.log(location?.coords.latitude);
      // console.log(location?.coords.longitude);
      // console.log(location?.coords.accuracy);
      // console.log(location?.timestamp);


      // if (location?.coords.latitude == undefined || location?.coords.longitude == undefined || location?.coords.accuracy == undefined) {
      //   throw new Error("Location service is not enabled please enable it");

      // }

      // const preciseLocation: PreciseLocation = {
      //   latitude: location?.coords.latitude!,
      //   longitude: location?.coords.longitude!,
      //   inaccuracy: location?.coords.accuracy!,
      // }
      // 3. Get solution from api 
      const response = await getBoxAccessKey({ challenge: challenge, preciseLocation: preciseLocationBox, boxId: parseInt(String(params.boxId)) }).unwrap();



      //   console.log("challenge: " + challenge);
      // //solve here 
      //   let key = "cQfTjWnZr4u7x!z%"
      //   const key128Bits = CryptoES.enc.Utf8.parse(key);
      //   //ecb mode
      //   const encrypted = CryptoES.AES.encrypt(challenge, key128Bits, { mode: CryptoES.mode.ECB, padding: CryptoES.pad.NoPadding });
      //   //to hex
      //   let encryptedHex = encrypted.ciphertext.toString(CryptoES.enc.Hex);
      //   //to uppercase
      //   encryptedHex = encryptedHex.toUpperCase();
      //   console.log("encrypted: " + encryptedHex);
      //   let solved_challenge = encryptedHex




      // const response = {
      //   boxId:1,
      //   accessKey:solved_challenge
      // }
      console.log("getBoxAccessKey", response.accessKey);

      // 4. Authenticate
      const auth = await dispatch(authenticate({ solved_challenge: response.accessKey })).unwrap();
      console.log(auth);

      if (auth) {
        console.log("authenticated");

        // 5. Subscribe to events and init commands

        const events = await dispatch(subscribeToEvents()).unwrap();


      } else {
        console.log("not authenticated");
      }


    } catch (err) {
      //diconect
      if (isFetchBaseQueryError(err)) {
        const errMsg = 'error' in err ? err.error : JSON.stringify(err.data)
        console.log("fetch error", err);
        setError(errMsg);
      } else if (isErrorWithMessage(err)) {
        console.log("error with message , ", err.message);
        //console.log("error", err);
        setError(err.message);
      } else {
        console.log("error", err);
        setError(JSON.stringify(err));
      }
    }




    // try {
    //   dispatch(setStatus('connecting'));
    //   let challenge = await bleService.connect(ble.periphiralID!);
    //   bleService.onDisconnect(() => {
    //     console.log('disconnected UI');
    //     dispatch(setStatus('disconnected'));
    //   });
    //   dispatch(setStatus('connected'));
    //   console.log(challenge);
    //   let solution = bleService.solveChallenge(challenge!);
    //   dispatch(setStatus('authenticating'));
    //   let auth = await bleService.authenticate(solution);
    //   console.log(auth);
    //   if (auth) {
    //     dispatch(setStatus('authenticated'));
    //     dispatch(setStatus('ready'));
    //     //read calibration mode
    //     let calib = await bleService.readCalibrationMode();
    //     console.log("mode :",calib);
    //     if (calib == '1') {
    //       setCalibMode(true);
    //     }else{
    //       setCalibMode(false);
    //     }
    //     bleService.onCalibrationChange((error,state) => {
    //       if (error) {
    //         console.log(error);
    //       }else{
    //         console.log(state);
    //       }
    //     });
    //     bleService.onLog((error,log) => {
    //       if (error) {
    //         console.log(error);
    //       }
    //       else{
    //         //custom log with yellow color
    //        console.log("BLE LOG:"+ log);
    //        dispatch(setLog(log!));
    //       }
    //     });
    //   }else{
    //     await bleService.disconnect();
    //     dispatch(setStatus('disconnected'));
    //   }
    // }
    // catch (e) {
    //   alert(e);
    //   if (e == 'Error: Already connected') {
    //     dispatch(setStatus('connected'));
    //   }
    // }
  }
  async function BleDisconnect() {
    let result =
      await dispatch(disconnectDevice()).unwrap().then((result) => {
        console.log(result);
        return result;
      }
      ).catch((error) => {
        if (isErrorWithMessage(error)) {
          console.log(error.message);
          setError(error.message);
        }
        else {
          console.log(error);
        }

      }
      );
  }
  async function BleWriteCalibrationMode(): Promise<void> {
    // try {
    //   await bleService.writeCalibrationMode(calibMode? '0' : '1');
    //   //setCalibMode(!calibMode);
    //   console.log('calibration mode set to: ' + calibMode);
    //   let calib = await bleService.readCalibrationMode();
    //   console.log("mode :",calib);
    //   setCalibMode(!(calib == '0'));
    // }
    // catch (e) {
    //   alert(e);
    // }
  }
  return (
    <View style={styles.container}>
      <ActivityIndicator animating={loading} color={MD2Colors.blue500} />{
        <Button icon="bluetooth" mode="contained" onPress={() => BleConnect()} style={{ marginTop: 10, padding: 10 }}
        >
          {ble.deviceConnectionState.status}
        </Button>}
      <Button mode="contained" onPress={() => BleDisconnect()} style={{ marginTop: 10, }}
      >
        disconnect
      </Button>
      <Text> {ble.connectedDevice?.name}</Text>
      <Text> {ble.sensorStatus.status}</Text>

      {/* <Text>S1: {ble.midSensorsStatus.sensor_1_status}</Text> */}
      <Text>S2: {ble.midSensorsStatus.sensor_2_status}</Text>
      <Text>State: {ble.keyBotState.text}</Text>
      <Text>Battery {ble.batteryLevel.text}</Text>
      <View style={{ flexDirection: 'row' }}>
        {/* <Button
          icon=""
          mode="outlined"
          onPress={() =>
            dispatch(
              manualMotorControl({ command: ManualMotorControlCommand.MOTOR1_FORWARD }),
            )
          }
          style={styles.buttonStyle}
        >
          Motor 1 Forward
        </Button> */}
        {/* <Button
          icon=""
          mode="outlined"
          onPress={() =>
            dispatch(
              manualMotorControl({ command: ManualMotorControlCommand.MOTOR1_BACKWARD }),
            )
          }
          style={styles.buttonStyle}
        >
          Motor 1 Backward
        </Button> */}
      </View>
      <View style={{ flexDirection: 'row' }}>
        <Button
          icon=""
          mode="outlined"
          onPress={() =>
            dispatch(
              manualMotorControl({ command: ManualMotorControlCommand.MOTOR2_FORWARD }),
            )
          }
          style={styles.buttonStyle}
        >
          Motor Forward
        </Button>
        <Button
          icon=""
          mode="outlined"
          onPress={() =>
            dispatch(
              manualMotorControl({ command: ManualMotorControlCommand.MOTOR2_BACKWARD }),
            )
          }
          style={styles.buttonStyle}
        >
          Motor Backward
        </Button>
      </View>
      <View style={{ flexDirection: 'row', marginVertical: 10 }}>
        <Button
          icon=""
          mode="contained"
          contentStyle={{ height: 50, width: 150 }}
          onPress={() =>
            dispatch(keyBotCommand({ command: KeyBotCommand.KEYBOT_PRESS_LEFT }))
          }
          style={styles.buttonStyle}
        >
          press left
        </Button>
        <Button
          icon=""
          mode="contained"
          contentStyle={{ height: 50, width: 150 }}
          onPress={() =>
            dispatch(keyBotCommand({ command: KeyBotCommand.KEYBOT_PRESS_RIGHT }))
          }
          style={styles.buttonStyle}
        >
          press right
        </Button>
      </View>
      <View style={{ flexDirection: 'row' }}>
        <Button
          icon=""
          mode="outlined"
          onPress={() =>
            dispatch(keyBotCommand({ command: KeyBotCommand.KEYBOT_EMERGENCY_STOP }))
          }
          style={styles.buttonStyle}
        >
          emergency stop
        </Button>
        <Button
          icon=""
          mode="outlined"
          onPress={() =>
            dispatch(keyBotCommand({ command: KeyBotCommand.KEYBOT_CENTER }))
          }
          style={styles.buttonStyle}
        >
          center
        </Button>

      </View>
      <View style={styles.logSection}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.logContainer}
        >
          {ble.logs.map((log, index) => (
            <View key={index} style={styles.logWrapper}>
              <Text style={styles.log}>{log}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

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
    paddingBottom: 20,
  },
  buttonStyle: {
    margin: 5,
  },
  logContainer: {
    flexGrow: 1,
    padding: 10,
    width: '100%',

  },
  logWrapper: {
    backgroundColor: '#007AFF',
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginBottom: 8,
    alignSelf: 'flex-start',
    maxWidth: '80%',
  },
  log: {
    fontSize: 15,

  },
  logSection: {
    flex: 1,  // take up remaining space
    width: '100%',
  },
});