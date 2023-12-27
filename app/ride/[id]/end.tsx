import database from '@react-native-firebase/database';
import firestore from '@react-native-firebase/firestore';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { LocationObject } from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Linking, StyleSheet } from 'react-native';
import PagerView from 'react-native-pager-view';
import { ActivityIndicator, Avatar, Button, Subheading, Title, useTheme } from 'react-native-paper';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import Toast from 'react-native-root-toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authenticate, connectDeviceById, disconnectDevice, getChallenge, keyBotCommand, subscribeToEvents } from '../../../ble/bleSlice';
import { KeyBotCommand, KeyBotState } from '../../../ble/bleSlice.contracts';
import ScreenIndicators from '../../../components/ScreenIndicators';
import StepCard from '../../../components/StepCard';
import { View } from '../../../components/Themed';
import { Box, ParcelData, PreciseLocation, getErrorMessage, isErrorWithMessage, useDepositParcelMutation, useGetParcelByIdQuery, useLazyGetBoxAccessKeyQuery, useLazyGetBoxPreciseLocationQuery, useLazyGetBoxQuery, useUpdateParcelByIdMutation } from '../../../data/api';
import { ApproveTransfer, ApproveTransferResponse, CreateDatasetResponse, Metadata, UploadMetadataToIPFSResponse, approveTransfer, callCreateDataset, callPushToSMS, callSellDataset, updateBox, uploadMetadataToIPFS } from '../../../data/blockchain';
import { useAppDispatch, useAppSelector } from '../../../data/hooks';
import { getLocation } from '../../../utils/getlocation';
import CryptoES from 'crypto-es';

export default function ConnectToTheBox() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const dispatch = useAppDispatch();
  const ble = useAppSelector((state) => state.ble);

  const [page, setPage] = useState(0);
 

  const [KeyBot, setKeyBot] = useState<any>(undefined);
  const [ride, setRide] = useState<any>(undefined);

  const [location, setLocation] = React.useState<LocationObject | null>(null);


  const parcelNFTSCAddress = Constants?.expoConfig?.extra?.parcelNFTSCAddress;
  const flatListRef = React.useRef<FlatList>(null);




  const theme = useTheme();

  const [activeStep, setActiveStep] = useState(0);
  const [errorStep, setErrorStep] = useState<number | null>(null);
 
  const pagerRef = useRef<PagerView>(null);


  const fetchRide = async () => {
    try {
      let rideRef = database().ref('Rides').child(String(params.id));
      rideRef.on('value', snapshot => {
        const ride = {
          id: snapshot.key,
          ...snapshot.val()
        };
        setRide(ride);
      });
      // Unsubscribe from the listener when it's no longer needed
      return () => rideRef.off();
    } catch (error) {
      console.error("Error fetching ride: ", error);
      // Handle the error as you need here
    }
  }

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
    fetchRide();

    return () => {
      // Cleanup logic here if needed
    }
  }, []);

  useEffect(() => {
    if (ride) {
      fetchKeyBot(ride.keybotId);
    }
  }, [ride]);






  useEffect(() => {
    if (flatListRef.current) {
      if (activeStep == 0) {
        return;
      }
      flatListRef.current.scrollToIndex({
        index: activeStep - 1, animated: true, viewPosition: 0,
      });
      console.log("scrolling to index", activeStep - 1);
    }
  }, [activeStep]);

  const nextStep = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };
  const handleError = (step: number, error: any) => {
    console.log("Error at step " + step + ": " + JSON.stringify(error, null, 2));
    setErrorStep(step);



  };

  useEffect(() => {

    //refetch();

    (async () => {

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Toast.show("You need to grant location permissions to use this feature.", {
          duration: Toast.durations.LONG,
          position: Toast.positions.BOTTOM,
          shadow: true,
          animation: true,
          hideOnPress: true,
          delay: 0,
          backgroundColor: theme.colors.error,
        });

        return;
      }

      let location = await getLocation()
      setLocation(location);
    })();
  }, [])


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


      //check if location is null
      if (location == null) {
        throw new Error("Location service is not enabled please enable it");
      }


      //3. get location of the user
      console.log(location?.coords.latitude);
      console.log(location?.coords.longitude);
      console.log(location?.coords.accuracy);
      console.log(location?.timestamp);


      if (location?.coords.latitude == undefined || location?.coords.longitude == undefined || location?.coords.accuracy == undefined) {
        throw new Error("Location service is not enabled please enable it");

      }

      const preciseLocation: PreciseLocation = {
        latitude: location?.coords.latitude!,
        longitude: location?.coords.longitude!,
        inaccuracy: location?.coords.accuracy!,
      }

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

        }
        else {
          console.log(error);
        }

      }
      );
  }
  //start ride //set the realtime propertires 
  const endRide = async () => {
    try {
      //set the realtime properties
      let rideRef = database().ref('Rides').child(String(params.id));
      rideRef.update({
        startTime: database.ServerValue.TIMESTAMP,
        status: "Completed",
        
        currentLocation: {
          latitude: location?.coords.latitude,
          longitude: location?.coords.longitude,
        },
        endLocation: {
          latitude: location?.coords.latitude,
          longitude: location?.coords.longitude,
        }
      });


      //update Car status
      let carRef = firestore().collection('Cars').doc(ride.carId);
      carRef.update({
        status: "Available",
        current_rideId: null,
        current_userId: null,

        location: {
          latitude: location?.coords.latitude,
          longitude: location?.coords.longitude,
        }

      });







      //disconect from keybor
      BleDisconnect();


      // Unsubscribe from the listener when it's no longer needed
      return () => rideRef.off();
    } catch (error) {
      console.error("Error fetching ride: ", error);
      alert("Error fetching ride: " + error);
      // Handle the error as you need here
    }
  }

 




  return (
    <View style={{ flex: 1 }}>
      <Animated.View
        entering={FadeInUp.duration(1000).springify()}
        style={{ flex: 10, }}
      >
        {KeyBot && location && ride ? (
          <PagerView style={{
            flex: 1,

          }} initialPage={page} onPageSelected={(e) => {
            setPage(e.nativeEvent.position);
          }}
            ref={pagerRef}

          >
            <View key="0" style={styles.page}>

              {ble.connectedDevice?.id === KeyBot.mac
                && ble.deviceConnectionState.status === 'ready'

                ? (
                  <><Avatar.Icon size={56} icon="cube" /><><Title style={styles.title} >Connected</Title><Subheading>{ble.connectedDevice?.name}</Subheading><Subheading>{ble.connectedDevice?.id}</Subheading></></>

                ) : (
                  <>
                    <Avatar.Icon size={56} icon="cube" style={{ backgroundColor: "grey" }}

                    />
                    <Title style={styles.title}

                    >Connect to the Vehicle (KeyBot)</Title>
                    <Title style={styles.subtitle}>
                    {ble.connectedDevice?.id}
                      To Lock the Vehicle, you need to connect to the KeyBot first.

                    </Title>

                    <Button icon="bluetooth" mode="contained" contentStyle={{ height: 80, width: 200 }}

                      onPress={() => {
                        console.log('Connecting to Box ' + KeyBot?.mac);
                        BleConnect(KeyBot);
                      }}>
                      {ble.deviceConnectionState.status}
                    </Button>
                  </>
                )}
              <Button mode="contained" onPress={() => BleDisconnect()} style={{ margin: 20 }} contentStyle={{ height: 60, width: 150 }}>
                disconnect
              </Button>


            </View>
            <View key="1" style={styles.page}>

              <Avatar.Icon
                size={56}
                icon="car"
                style={{
                  backgroundColor:
                    ble.keyBotState.status === KeyBotState.KEYBOT_PRESSING_LEFT || ble.keyBotState.status === KeyBotState.KEYBOT_PRESSING_RIGHT
                      ? "yellow" : theme.colors.primary
                }}
              />
              <Title style={styles.title}
              >Lock the Vehicle</Title>
              <Title
                style={styles.subtitle}
              >{ble.keyBotState.status === KeyBotState.KEYBOT_PRESSING_LEFT || ble.keyBotState.status === KeyBotState.KEYBOT_PRESSING_RIGHT ?
                "Locking the Vehicle..."
                : "Press the lock button"


                }</Title>


              <Button
                icon=""
                mode="contained"
                contentStyle={{ height: 80, width: 200 }}
                loading={ble.keyBotState.status === KeyBotState.KEYBOT_PRESSING_LEFT || ble.keyBotState.status === KeyBotState.KEYBOT_PRESSING_RIGHT}
                disabled={ble.keyBotState.status === KeyBotState.KEYBOT_PRESSING_LEFT || ble.keyBotState.status === KeyBotState.KEYBOT_PRESSING_RIGHT}
                onPress={() =>
                  dispatch(keyBotCommand({ command: KeyBotCommand.KEYBOT_PRESS_RIGHT}))
                }

              >
                Lock
              </Button>

            </View>
            <View key="2" style={styles.page}>
              <Avatar.Icon size={56} icon="car" />
              <Title style={styles.title}
              >End ride</Title>
              <Title style={styles.subtitle}
              >
                That's it! See you next time!

              </Title>
              <Button mode="contained"
                icon="check"
                contentStyle={{ height: 80, width: 200 }}
                onPress={() => {
                  console.log('End ride')
                  endRide();

                  //navigate to ride progress
                  router.replace("/client/");

                }}>
                
                OK
              </Button>
              <Button 
                icon="close"
                style={{ marginTop: 20 }}
                contentStyle={{ height: 80, width: 200, }}
                onPress={() => {
                  console.log('Cancelled parcel placement in the Vehicle')
                  //navigate back to where we came from
                  router.back();

                }}>
                Cancel
              </Button>

            </View>
            
            
         

          </PagerView>
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="large" />
          </View>
        )}
      </Animated.View>
      <View style={{
        flex: 1

      }}>
        <Animated.View
          entering={FadeInDown.delay(200).duration(1000).springify()}
        >
          <ScreenIndicators count={3} activeIndex={page} />
        </Animated.View>

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
    fontWeight: "bold", fontSize: 22, marginTop: 20
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
