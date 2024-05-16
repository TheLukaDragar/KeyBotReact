import database from '@react-native-firebase/database';
import firestore from '@react-native-firebase/firestore';
import CryptoES from 'crypto-es';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { ActivityIndicator, Button, Paragraph, Title, useTheme } from 'react-native-paper';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import Toast from 'react-native-root-toast';
import { authenticate, connectDeviceById, disconnectDevice, getChallenge, keyBotCommand, subscribeToEvents } from '../../../ble/bleSlice';
import { ConnectionState, KeyBotCommand, KeyBotState } from '../../../ble/bleSlice.contracts';
import { View } from '../../../components/Themed';
import { getErrorMessage, isErrorWithMessage } from '../../../data/api';
import { useAppDispatch, useAppSelector } from '../../../data/hooks';
import { getLocation } from '../../../utils/getlocation';


export default function StartRide() {
  const [KeyBot, setKeyBot] = useState(null);
  const [ride, setRide] = useState(null);
  const [location, setLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');
  const params = useLocalSearchParams();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const theme = useTheme();
  const ble = useAppSelector((state) => state.ble);



  const [keySensed, setKeySensed] = useState(false);


  useEffect(() => {
    const fetchRideData = async () => {
      try {
        const rideRef = database().ref('Rides').child(String(params.id));
        rideRef.on('value', snapshot => {
          const rideData = { id: snapshot.key, ...snapshot.val() };
          setRide(rideData);
        });
        return () => rideRef.off();
      } catch (error) {
        console.error("Error fetching ride: ", error);
      }
    };

    fetchRideData();

    return () => {
      // Cleanup logic here if needed
    };
  }, []);

  useEffect(() => {
    if (ride) {
      const fetchKeyBotData = async (keybotId) => {
        try {
          const keybotRef = firestore().collection('KeyBots').doc(keybotId);
          keybotRef.onSnapshot(docSnapshot => {
            const keybotData = { id: docSnapshot.id, ...docSnapshot.data() };
            setKeyBot(keybotData);
           
          });
        } catch (error) {
          console.error("Error fetching keybot: ", error);
        }
      };

      fetchKeyBotData(ride.keybotId);
    }
  }, [ride]);

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          throw new Error("Location permissions not granted.");
        }
        const userLocation = await getLocation();
        setLocation(userLocation);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching location: ", error);
        setIsLoading(false);
        setStatusMessage("Error fetching location. Please check your permissions.");
        // Toast.show("Error fetching location: " + error.message, {
        //   duration: Toast.durations.LONG,
        //   position: Toast.positions.BOTTOM,
        //   shadow: true,
        //   animation: true,
        //   hideOnPress: true,
        //   delay: 0,
        //   backgroundColor: theme.colors.error,
        // });
      }
    };

    fetchLocation();
  }, []);

  useEffect(() => {
    if (KeyBot && ride) {
      if (!checkConnection(KeyBot.mac)) {
        BleConnect(KeyBot);
      }
    }
  }, [KeyBot, ride]);

  async function BleConnect(keybot) {
    try {
      setStatusMessage("Connecting to the keybot...");
      const connectResult = await dispatch(connectDeviceById({ id: keybot.mac })).unwrap();
      console.log("connectResult", connectResult);

      setStatusMessage("Authenticating...");
      const challenge = await dispatch(getChallenge()).unwrap();
      console.log("challenge", challenge);

      const key = keybot.key;
      const key128Bits = CryptoES.enc.Utf8.parse(key);
      const encrypted = CryptoES.AES.encrypt(challenge, key128Bits, { mode: CryptoES.mode.ECB, padding: CryptoES.pad.NoPadding });
      let solved_challenge = encrypted.ciphertext.toString(CryptoES.enc.Hex).toUpperCase();
      console.log("encrypted: " + solved_challenge);


      const auth = await dispatch(authenticate({ solved_challenge })).unwrap();
      console.log(auth);


      if (auth) {
        console.log("Authentication successful");
        const events = await dispatch(subscribeToEvents()).unwrap();

      } else {
        setStatusMessage("Authentication failed");
        console.log("Authentication failed");

        throw new Error("Authentication failed");
      }
    } catch (err) {
      console.error("Error connecting to the keybot: ", err);
      setStatusMessage("Failed to connect to the keybot.");
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
  }

  function checkConnection(mac: string) {
    console.log("ble.deviceConnectionState.status", ble.deviceConnectionState.status);
    console.log("ble.conected device", ble.connectedDevice?.id);
    console.log("mac", mac);

    if (ble.deviceConnectionState.status === ConnectionState.READY && ble.connectedDevice?.id === mac) {
      return true;
    }
    return false;
  }


  function unlockCar(switchUnlockDirection = false) {
    setStatusMessage("Unlocking the car...");
    console.log("unlocking the car switchUnlockDirection", switchUnlockDirection);
    setKeySensed(false);
    if (switchUnlockDirection) {
      dispatch(keyBotCommand({ command: KeyBotCommand.KEYBOT_PRESS_LEFT }));
      console.log("pressing left");
    } else {
      dispatch(keyBotCommand({ command: KeyBotCommand.KEYBOT_PRESS_RIGHT }));
      console.log("pressing right");
    }
  }

  //listen for state changes



  //remember previous state
  const prevKeyBotState = useAppSelector((state) => state.ble.keyBotState);

  // useEffect(() => {
  //   //if status goes from   KEYBOT_PRESSING_LEFT = '1',
  //   // KEYBOT_PRESSING_RIGHT = '2',
  //   // KEYBOT_RETURNING_TO_CENTER_FROM_LEFT = '3',
  //   // KEYBOT_RETURNING_TO_CENTER_FROM_RIGHT = '4',

  //   //its a success
  //   if ((prevKeyBotState.status === KeyBotState.KEYBOT_PRESSING_LEFT || prevKeyBotState.status === KeyBotState.KEYBOT_PRESSING_RIGHT) && (ble.keyBotState.status === KeyBotState.KEYBOT_RETURNING_TO_CENTER_FROM_LEFT || ble.keyBotState.status === KeyBotState.KEYBOT_RETURNING_TO_CENTER_FROM_RIGHT)) {
  //     console.log("Sensed key");
  //     setKeySensed(true);
  //   }



    
  // }
  //   , [ble.keyBotState.status]);


  useEffect(() => {
    if (statusMessage === "Unlocking the car..." && (ble.keyBotState.status === KeyBotState.KEYBOT_STATE_IDLE || ble.keyBotState.status === KeyBotState.KEYBOT_RETURNING_TO_CENTER_FROM_LEFT || ble.keyBotState.status === KeyBotState.KEYBOT_RETURNING_TO_CENTER_FROM_RIGHT)) {
      setStatusMessage("Looks good, did the car unlock?");
    }

    else if (statusMessage === "Unlocking the car..." && (ble.keyBotState.status === KeyBotState.KEYBOT_ERROR_PRESSING_LEFT || ble.keyBotState.status === KeyBotState.KEYBOT_ERROR_PRESSING_RIGHT || ble.keyBotState.status === KeyBotState.KEYBOT_ERROR_RETURNING_TO_CENTER_FROM_RIGHT || ble.keyBotState.status === KeyBotState.KEYBOT_ERROR_RETURNING_TO_CENTER_FROM_LEFT)) {
      setStatusMessage("Something is off, did the car unlock?");
    }
  }
    , [ble.keyBotState.status]);


  useEffect(() => {
    if (KeyBot) {
      if (checkConnection(KeyBot.mac)) {
        console.log("connected to the keybot");
        setStatusMessage("Connected to the keybot.");

        //unlock car if keybot is connected and keybot state is idle

        unlockCar(KeyBot.unlockDirection || false);


      }
    }

  }, [KeyBot, ble.deviceConnectionState.status, ble.connectedDevice?.id]);


  //

  const cancelride = async () => {
    try {
      //set the realtime properties
      let rideRef = database().ref('Rides').child(String(params.id));
      rideRef.update({
        startTime: database.ServerValue.TIMESTAMP,
        status: "Cancelled",

      });


      //update Car status
      let carRef = firestore().collection('Cars').doc(ride.carId);
      carRef.update({
        status: "Available",
        current_rideId: null,
        current_userId: null,

        // location: {
        //   latitude: location?.coords.latitude,
        //   longitude: location?.coords.longitude,
        // }

      });

      //disconect from keybor
      BleDisconnect();

      //navigate to main



      // Unsubscribe from the listener when it's no longer needed
      return () => rideRef.off();
    } catch (error) {
      console.error("Error fetching ride: ", error);
      alert("Error fetching ride: " + error);
      // Handle the error as you need here
    }
  }



  async function BleDisconnect() {
    try {
      setStatusMessage("Disconnecting...");
      const result = await dispatch(disconnectDevice()).unwrap();
      console.log(result);
      setStatusMessage("Disconnected.");
    } catch (error) {
      console.error("Error disconnecting from the device: ", error);
      setStatusMessage("Error: " + error.message);
      if (isErrorWithMessage(error)) {
        console.log(error.message);
      } else {
        console.log(error);
      }
    }
  }

  const startRide = async () => {
    try {
      setStatusMessage("Starting ride...");
      const rideRef = database().ref('Rides').child(String(params.id));
      await rideRef.update({
        startTime: database.ServerValue.TIMESTAMP,
        status: "In progress",
        startLocation: {
          latitude: location?.coords.latitude,
          longitude: location?.coords.longitude,
        },
        currentLocation: {
          latitude: location?.coords.latitude,
          longitude: location?.coords.longitude,
        }
      });

      BleDisconnect();
      return () => rideRef.off();
    } catch (error) {
      console.error("Error starting ride: ", error);
      setStatusMessage("Error: " + error.message);
      alert("Error starting ride: " + error);

    }
  }


  return (
    <View style={{ flex: 1 }}>
      <Animated.View
        entering={FadeInUp.duration(1000).springify()}
        style={{ flex: 10 }}
      >
        {isLoading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size='large' />
            <Title style={styles.title}>Loading...</Title>
          </View>
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>

            {(isLoading) || (ble.deviceConnectionState.status !== ConnectionState.READY && ble.deviceConnectionState.status !== ConnectionState.ERROR) || (ble.keyBotState.status === KeyBotState.KEYBOT_PRESSING_LEFT || ble.keyBotState.status === KeyBotState.KEYBOT_PRESSING_RIGHT) && (

              <><ActivityIndicator size='large' /></>

            )}



            {(statusMessage !== "Looks good, did the car unlock?" && statusMessage !== "Something is off, did the car unlock?") && (
              <Title style={[styles.title, { opacity: 1 }]}>{statusMessage}</Title>
            )}

            {(ble.deviceConnectionState.status === ConnectionState.ERROR  || statusMessage === "Failed to connect to the keybot.") && (
              <><TouchableOpacity onPress={() => {
                BleConnect(KeyBot);
              
              }
              }>
                <Paragraph style={{ margin: 20, color: theme.colors.primary }}>
                  Try again
                </Paragraph>

              </TouchableOpacity>

              </>
            )}



            {/* <Title style={[styles.title, { opacity: 1 }]}>{ble.deviceConnectionState.status}</Title> */}

            {(statusMessage === "Looks good, did the car unlock?" || statusMessage === "Something is off, did the car unlock?") && (
              <Animated.View
                entering={FadeIn.duration(1000).springify()}
                style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
              >

                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                  <Title style={styles.title}>{statusMessage}</Title>


                  <TouchableOpacity onPress={() => {
                    unlockCar(KeyBot.unlockDirection || false);
                  }
                  }>
                    <Paragraph style={{ margin: 20, color: theme.colors.primary }}>
                      No, try again
                    </Paragraph>
                  </TouchableOpacity>

                </View>


                {/* <Paragraph style={{ marginTop: 10 }}>
                  {ble.keyBotState.text}
                </Paragraph> */}
                <Button
                  mode="contained"

                  icon="check"

                  onPress={() => {
                    startRide();
                    if (ride) {
                      //navigate to ride progress
                      router.replace("/ride/" + ride.id + "/progress");
                    }
                  }
                  }
                  contentStyle={{ height: 80, width: 200 }}
                  style={{ marginTop: 50 }}
                >
                  Yes
                </Button>
              </Animated.View>
            )}
          </View>
        )}
      </Animated.View>
      <View style={{ flex: 2 }}>
        {statusMessage === "Error fetching location. Please check your permissions." && (
          <Button mode="contained" onPress={() => router.back()} style={{ margin: 20 }}>
            Go back
          </Button>
        )}
  
        <Button  onPress={() => {
          cancelride();
          router.replace("/client");
        }
        } style={{ margin: 20 }}>

          Cancel
        </Button>
      </View>
    </View>
  );
}



const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',

  },
  page_flatlist: {
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',



  },
  title: {
    textAlign: "center", marginBottom: 10, //bold
    fontWeight: "bold", fontSize: 23, marginTop: 20
  },
  titlesmall: {
    textAlign: "center", marginBottom: 0, //bold
    fontWeight: "bold", marginTop: 0
  },
  subtitle: {
    textAlign: "center", marginBottom: 40, marginHorizontal: 30
  },
  subtitle_small: {
    textAlign: "center", marginBottom: 10, marginHorizontal: 30
  },



});
