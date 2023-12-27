import { StyleSheet } from 'react-native';

import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Avatar, Button, Caption, Card, Paragraph, Title, useTheme } from 'react-native-paper';
import { Text, View } from '../../../components/Themed';
import { useAppDispatch, useAppSelector } from '../../../data/hooks';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { BoxItem, getErrorMessage, isErrorWithMessage, isFetchBaseQueryError, useGetBoxesQuery, useGetMeQuery, useLazyGetBoxAccessKeyQuery, useLazyGetBoxPreciseLocationQuery } from '../../../data/api';

import '@ethersproject/shims';




import { LocationObject } from 'expo-location';
import PagerView from 'react-native-pager-view';
import { authenticate, connectDeviceById, disconnectDevice, getChallenge, subscribeToEvents } from '../../../ble/bleSlice';
import BLEDeviceList from '../../../components/BleDeviceList';
import ScreenIndicators from '../../../components/ScreenIndicators';
import { BoxPermissionLevel, BoxStatus } from '../../../constants/Auth';
import { getLocation } from '../../../utils/getlocation';




export default function KeyBot() {



  const router = useRouter();

  const dispatch = useAppDispatch();
  const ble = useAppSelector((state) => state.ble);

  const { data: user } = useGetMeQuery(undefined);
  const { data: Boxes, error, isLoading, isFetching, isError, refetch

  } = useGetBoxesQuery({
    owner_id: user?.id,
  });

  const [selectedBox, setSelectedBox] = useState<BoxItem | undefined>(undefined);
  const [scanning, setScanning] = useState(false);

  const [location, setLocation] = React.useState<LocationObject | null>(null);
  const [ErrorMessage, setError] = React.useState("");

  const [getBoxAccessKey] = useLazyGetBoxAccessKeyQuery();
  //const [getBoxDetails] = useLazyGetBoxQuery();
  const [getBoxPreciseLocation] = useLazyGetBoxPreciseLocationQuery();
  const [pageIndex, setPageIndex] = useState(0);






  const theme = useTheme();


  useEffect(() => {

    //refetch();

    (async () => {

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission to access location was denied');

        return;
      }

      let location = await getLocation()
      console.log("location", location);
      setLocation(location);
    })();
  }, [])



  async function BleConnect(box: BoxItem) {
    try {

      //0.get more details about the box
      console.log("callin getBoxDetails with id", box.id);
      // const boxDetails = await getBoxDetails(box.id).unwrap();

      // console.log("boxDetails",boxDetails);

      const preciseLocationBox = await getBoxPreciseLocation(box.id).unwrap();
      console.log("preciseLocationBox", preciseLocationBox);




      // 1. Connect to device
      const connectResult = await dispatch(connectDeviceById({ id: box.macAddress })).unwrap();
      console.log("connectResult", connectResult);

      // 2. Get the challenge
      const challenge = await dispatch(getChallenge()).unwrap();
      console.log("challenge", challenge);


      //check if location is null
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

      //TODO REMOVE THIS HACK and use the real location



      // 3. Get solution from api 
      const response = await getBoxAccessKey({ challenge: challenge, preciseLocation: preciseLocationBox, boxId: box.id }).unwrap();



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



  //console.log("error", error, "isLoading", isLoading, "isFetching", isFetching, "isError", isError, "data", Boxes);



  if (isError) {

    return <View style={styles.container}>
      <Text>Error: {getErrorMessage(error)}</Text>
    </View>
  }
  else if (isLoading) {
    return <View style={styles.container}>
      <Text>Loading...</Text>
    </View>


  } else if (isFetching) {
    return <View style={styles.container}>
      <Text>Updating...</Text>
    </View>

  }
  else if (Boxes) {

    function getPermissionText(permission: BoxPermissionLevel): string {
      switch (permission) {
        case BoxPermissionLevel.NONE:
          return 'None';
        case BoxPermissionLevel.OPEN:
          return 'Open';
        case BoxPermissionLevel.MANAGE:
          return 'Manage';
        case BoxPermissionLevel.OWNER:
          return 'Owner';
        default:
          return 'Unknown';
      }
    }

    return (
      <View style={styles.container}>
        <View style={styles.pagerContainer}>
          <PagerView style={styles.pagerView} initialPage={pageIndex} onPageSelected={(e) => {
            setPageIndex(e.nativeEvent.position);
          }}>
            {Boxes.items.map((item: BoxItem, index: number) => (
              <View key={index} style={styles.page}>
                <Card style={styles.card} onPress={
                  () => {
                    console.log("pressed", item);
                    router.push("client/keybot/" + item.id);
                  }

                }>




                  <Card.Content
                    style={{
                      backgroundColor: 'transparent'
                    }}

                  >

                    <View style={styles.titleRow}>
                      <Avatar.Icon size={60} icon="cube"
                        style={{

                          backgroundColor: item.boxStatus == null
                            ? theme.colors.error
                            : item.boxStatus === BoxStatus.READY
                              ? theme.colors.primary
                              : item.boxStatus === BoxStatus.NOT_READY
                                ? 'grey'
                                : 'grey',
                        }}
                      />

                      <Title style={styles.cardTitle}> {item.did}</Title>

                    </View>




                    <Paragraph>Reputation: {item.reputation}</Paragraph>
                    <Paragraph>Reputation threshold: {item.reputationThreshold ? item.reputationThreshold : "not set"}</Paragraph>
                    <Paragraph>Permission: {getPermissionText(item.permission)}</Paragraph>
                    <Paragraph>License plate: {item.licensePlate ? item.licensePlate : "not set"}</Paragraph>
                    {/* <Paragraph>Location: {item.preciseLocation_id}</Paragraph> */}






                  </Card.Content>

                  <Card.Actions>



                    <Caption style={styles.cardCaption}

                    >{
                        item.boxStatus == null
                          ? "missing dilivery info"
                          : item.boxStatus == BoxStatus.READY

                            ? "Ready for dilivery"
                            : item.boxStatus == BoxStatus.NOT_READY
                              ? "Not ready for dilivery"
                              : "Unknown"

                      }

                    </Caption>










                  </Card.Actions>



                </Card>
              </View>
            ))}
            <View style={styles.page}>
              <Card style={styles.addCard} onPress={() => { if (scanning) setScanning(false); else setScanning(true); }}>
                <Card.Content style={styles.addCardContent}>


                  {scanning ? <ActivityIndicator size={60} style={{ marginBottom: 5 }} color={theme.colors.primary} /> :
                    <MaterialCommunityIcons name={scanning ? "bluetooth" : "plus-circle"}
                      size={60} color={theme.colors.primary} style={{ marginBottom: 5 }}
                    />
                  }


                  <Title

                  > {scanning ? "Scanning for nearby devices..." : "Connect new box to your account"}</Title>
                </Card.Content>
              </Card>
            </View>

          </PagerView>



        </View>

        <View style={styles.screenContainers}>

          <ScreenIndicators count={Boxes.total + 1} activeIndex={pageIndex} />

        </View>



        {pageIndex < Boxes.total ? (
          <View style={styles.buttonContainer}>
            <Button icon="bluetooth" style={{ padding: 10 }} mode="contained" onPress={() => {
              console.log('Connecting to Box ' + Boxes.items[pageIndex].id);
              BleConnect(Boxes.items[pageIndex]);
            }}>
              {ble.deviceConnectionState.status}
            </Button>

            <Button mode="contained" onPress={() => BleDisconnect()} style={{ margin: 20 }}>
              disconnect
            </Button>

            <Button mode="contained" onPress={() => {
              router.push({
                pathname: "client/keybot/" + Boxes.items[pageIndex].macAddress + "/control",
                params: { boxId: Boxes.items[pageIndex].id }
              }

              );
            }} style={{ margin: 20 }}>
              control
            </Button>
            {/* <Text>S1: {ble.midSensorsStatus.sensor_1_status}</Text>
            <Text>S2: {ble.midSensorsStatus.sensor_2_status}</Text>
            <Text>State: {ble.keyBotState.text}</Text>
            <Text>Battery {ble.batteryLevel.text}</Text>
            <View style={{ flexDirection: 'row' }}>
              <Button
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
              </Button>
              <Button
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
              </Button>
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
                Motor 2 Forward
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
                Motor 2 Backward
              </Button>
            </View>
            <View style={{ flexDirection: 'row', marginVertical: 30 }}>
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
            </View> */}
          </View>
        ) : (
          <View style={styles.buttonContainer}>
            <BLEDeviceList shouldScan={scanning} onlineBoxes={Boxes.items}
              onDevicePress={(device) => {
                console.log("device pressed", device);
              }}
            />
          </View>
        )}




      </View>
    );


  }
  else {
    return <View style={styles.container}>
      <Text>Something went wrong</Text>
    </View>

  }


}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',

  },
  page: {

    flex: 1,
  },
  card: {
    justifyContent: 'center',
    height: '100%',

    margin: 10,
    flex: 1,

  },
  cardCaption: {


  },

  addCard: {
    justifyContent: 'center',
    height: '100%',

    margin: 10,
    flex: 1,
  },
  addCardContent: {

    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',


  },
  pagerContainer: {
    flex: 4,

    width: '100%',
  },
  pagerView: {
    flex: 1,



  },
  buttonContainer: {
    flex: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },

  screenContainers: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',


  },
  cardTitle: {
    fontSize: 20,
    marginLeft: 10, // To provide some spacing between the icon and the title
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center', // This aligns the icon and the title vertically
    backgroundColor: 'transparent',
    marginBottom: 10,
  },
  buttonStyle: {
    margin: 5,
  },
});