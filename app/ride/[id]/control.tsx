import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Button, Snackbar, useTheme } from 'react-native-paper';
import { Text, View } from '../../../components/Themed';
import { RootTabScreenProps } from '../../../types';
//import store from redux-toolkit store
//import secureReducer, { getMnemonic , setMnemonic} from '../../data/secure';
import { ActivityIndicator, MD2Colors } from 'react-native-paper';
import { useAppDispatch, useAppSelector } from '../../../data/hooks';
import firestore from '@react-native-firebase/firestore';

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
  motorTimeoutSetting,
  subscribeToEvents
} from '../../../ble/bleSlice';
import { KeyBotCommand, ManualMotorControlCommand, MotorTimeoutCommand } from '../../../ble/bleSlice.contracts';
import { PreciseLocation, getErrorMessage, isErrorWithMessage, isFetchBaseQueryError, useLazyGetBoxAccessKeyQuery, useLazyGetBoxPreciseLocationQuery } from '../../../data/api';
import { callDatasetContract } from '../../../data/blockchain';
import { getLocation } from '../../../utils/getlocation';
import Toast from 'react-native-root-toast';
import CryptoES from 'crypto-es';

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

  const theme = useTheme();

  const [KeyBot, setKeyBot] = useState<any>(undefined);

  const fetchKeyBot = async (keybotId: string) => {
    try {
      let keybotRef = firestore().collection('KeyBots').doc(keybotId);
      keybotRef.onSnapshot(docSnapshot => {
        const keybot = {
          id: docSnapshot.id,
          ...docSnapshot.data()
        };
        setKeyBot(keybot);
      });
    } catch (error) {
      console.error("Error fetching keybot: ", error);
      // Handle the error as you need here
    }
  }

  useEffect(() => {
    if (params.id) {
      fetchKeyBot(params.id);
    }

    return () => {
      // Cleanup logic here if needed
    }
  }, [params]);





  async function BleConnect(keybot: any) {
    try {

      //0.get more details about the box
      console.log("callin getKeyBot with id", keybot.id);
      // const KeyBot = await getKeyBot(box.id).unwrap();

      // console.log("KeyBot",KeyBot);



      // 1. Connect to device
      const connectResult = await dispatch(connectDeviceById({ id: keybot.mac })).unwrap();
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

      //For now we do this locally then we will do it on the server
      let key = keybot.key;
      const key128Bits = CryptoES.enc.Utf8.parse(key);
      //ecb mode
      const encrypted = CryptoES.AES.encrypt(challenge, key128Bits, { mode: CryptoES.mode.ECB, padding: CryptoES.pad.NoPadding });
      //to hex
      let encryptedHex = encrypted.ciphertext.toString(CryptoES.enc.Hex);
      //to uppercase
      encryptedHex = encryptedHex.toUpperCase();
      console.log("encrypted: " + encryptedHex);
      let solved_challenge = encryptedHex


      // 4. Authenticate
      const auth = await dispatch(authenticate({ solved_challenge: solved_challenge })).unwrap();
      console.log(auth);

      if (auth) {
        console.log("authenticated");

        // 5. Subscribe to events and init commands

        const events = await dispatch(subscribeToEvents()).unwrap();


      } else {
        console.log("not authenticated");
      }


    } catch (err) {
      Toast.show(getErrorMessage(err), {
        duration: Toast.durations.LONG,
        position: Toast.positions.BOTTOM,
        shadow: true,
        animation: true,
        hideOnPress: true,
        delay: 0,
        backgroundColor: theme.colors.error,

      });

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
        <Button icon="bluetooth" mode="contained" onPress={() => BleConnect(KeyBot)} style={{ marginTop: 10, padding: 10 }}
        >
          {ble.deviceConnectionState.status}
        </Button>}
      <Button mode="contained" onPress={() => BleDisconnect()} style={{ marginTop: 10, }}
      >
        disconnect
      </Button>
      {/* <Text> {ble.connectedDevice?.name}</Text> */}
      {/* <Text> {ble.sensorStatus.status}</Text> */}
      <Text>State: {ble.keyBotState.text} </Text>


      {/* <Text>S1: {ble.midSensorsStatus.sensor_1_status}</Text> */}
      <View style={{ flexDirection: 'row' }}>
      <Text>S2: {ble.midSensorsStatus.sensor_voltage} </Text>
      <Text>Battery {ble.batteryLevel.text}</Text>
      </View>
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
      <Text
        style={{ marginVertical: 10 }}


      >Motor movement limit:</Text>
      <View style={{ flexDirection: 'row' }}>


        <Button
          icon="minus"
          mode="outlined"
          onPress={() =>
            dispatch(motorTimeoutSetting({ command: MotorTimeoutCommand.MOTOR_TIMEOUT_DECREASE }))
          }
          style={styles.buttonStyle}
        >
          decrease
        </Button>
        <Button
          icon="plus"
          mode="outlined"
          onPress={() =>
            dispatch(motorTimeoutSetting({ command: MotorTimeoutCommand.MOTOR_TIMEOUT_INCREASE }))
          }
          style={styles.buttonStyle}
        >
          increase
        </Button>



      </View>

      <Button
        icon=""
        mode="outlined"
        onPress={() =>
          dispatch(motorTimeoutSetting({ command: MotorTimeoutCommand.MOTOR_TIMEOUT_RESET }))
        }
        style={styles.buttonStyle}
      >
        reset
      </Button>
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
    paddingTop: 0,
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