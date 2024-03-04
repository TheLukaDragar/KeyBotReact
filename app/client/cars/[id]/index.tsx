import database from '@react-native-firebase/database';
import firestore from '@react-native-firebase/firestore';
import CryptoES from 'crypto-es';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { LocationObject } from 'expo-location';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Avatar, Button, Divider, IconButton, Title, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../../auth/provider';
import { authenticate, connectDeviceById, getChallenge, subscribeToEvents } from '../../../../ble/bleSlice';
import { Text, View, getTheme } from '../../../../components/Themed';
import { getErrorMessage } from '../../../../data/api';
import { useAppDispatch, useAppSelector } from '../../../../data/hooks';
import { getLocation } from '../../../../utils/getlocation';
import React = require('react');
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';


export default function KeyBotDetails() {

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id = -1 } = useLocalSearchParams();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const ble = useAppSelector((state) => state.ble);





  // const [getBoxDetails, { isLoading, data: initialBoxDetails, isFetching, isSuccess }] = useLazyGetBoxQuery();

  // const [updateBox, { isLoading: isUpdating }] = useUpdateBoxMutation();
  // const [setBoxPreciseLocation, { isLoading: isSettingLocation }] = useSetBoxPreciseLocationMutation();


  const [Car, setCarDetails] = useState<any | undefined>(undefined);
  const [KeyBot, setKeyBotDetails] = useState<any | undefined>(undefined);
  const [initialBoxDetails, setInitialBoxDetails] = useState<any | undefined>(undefined);
  //isUpdating
  const [isUpdating, setIsUpdating] = useState(false);



  const [errorMessage, setError] = useState("");
  const [status, setStatus] = useState(false);
  const [licensePlateError, setLicensePlateError] = useState("");

  const licensePlateRegex = /^[A-Z]{2}[A-Z0-9\s]{3,7}$/;
  const theme = useTheme();
  const [address, setAddress] = useState("");
  const [location, setLocation] = React.useState<LocationObject | null>(null);

  const [permission, requestPermission] = ImagePicker.useCameraPermissions();
  const [libpermission, requestLibPermission] = ImagePicker.useMediaLibraryPermissions();


  const mapRef = React.useRef<MapView>(null);
  const textColor = getTheme().text;
  const { user } = useAuth();

  const [isLoading, setLoading] = useState(false);


  const [favouriteCars, setFavouriteCars] = useState<any[]>([]);







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
      //do nothing for now 
      console.log(err);

    }




  }




  useEffect(() => {
    async function get_car_details() {
      try {

        //set favourite cars from user.favouriteCars
        let favouriteCars = await firestore().collection('Users').doc(user.uid).get().then(doc => doc.data()?.favourite_cars);

        if (!favouriteCars || favouriteCars.length === 0) {
          // Handle case where no favorite cars are there
          // For example, display a message or perform some other action
          setFavouriteCars([]);
        } else {
          setFavouriteCars(favouriteCars);
        }

        console.log("favouriteCars", favouriteCars);



        const car_details = await firestore().collection('Cars').doc(id).get();

        //get keybot
        const keybot = await car_details.data().keybotId.get().then(doc => doc.data());
        console.log("keybot", keybot);
        setKeyBotDetails(keybot);


        //check if device already connected
        if (ble.connectedDevice?.id === keybot?.id && ble.deviceConnectionState.status === 'ready') {
          //already connected do nothing
        }
        else {
          //connect to device in the background to make it ready for use 
          BleConnect(keybot);


        }






        // console.log("car_details", car_details.data());

        setCarDetails({ ...car_details.data(), id: id });


        console.log("set license plate", car_details.data().licensePlate);
        console.log("set imageUrl", car_details.data().imageURL);



        const geocodeResult = await Location.reverseGeocodeAsync({
          latitude: car_details.data().location.latitude,
          longitude: car_details.data().location.longitude,
        });

        if (geocodeResult && geocodeResult.length > 0) {
          const geocodedAddress = geocodeResult[0];
          setAddress(`${geocodedAddress.street}, ${geocodedAddress.city}, ${geocodedAddress.region}, ${geocodedAddress.postalCode}`);
        } else {
          setAddress("No address found");
        }



      } catch (err) {
        setError(getErrorMessage(err));
      }
    }
    (async () => {

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission to access location was denied');

        return;
      }

      let location = await getLocation(true);
      setLocation(location);
    })();
    get_car_details()
  }, [id]);












  function distance(loc1, loc2) {
    const R = 6371e3; // metres
    const φ1 = loc1.latitude * Math.PI / 180; // φ, λ in radians
    const φ2 = loc2.latitude * Math.PI / 180;
    const Δφ = (loc2.latitude - loc1.latitude) * Math.PI / 180;
    const Δλ = (loc2.longitude - loc1.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const d = R * c; // in metres



    return d;
  }

  const getDistance = (car) => {
    if (location && location.coords && car && car.location) {
      let d = distance(location.coords, car.location);

      let formattedDistance;
      if (d < 100) {
        formattedDistance = d.toFixed(2) + "m";
      } else {
        formattedDistance = (d / 1000).toFixed(2) + "km";
      }

      return {
        formattedDistance,
        rawDistance: d
      };
    }
    return {
      formattedDistance: "N/A",
      rawDistance: 0
    };
  }
  //funct for booking
  const rideCar = async (car) => {
    console.log("rideCar", car);
    try {
      const carRef = firestore().collection('Cars').doc(car.id);
      await firestore().runTransaction(async transaction => {
        const carDoc = await transaction.get(carRef);
        if (!carDoc.exists) {
          throw 'Car does not exist!';
        }

        //create a new ride object in realtime database

        //         rideId: String (unique identifier)
        // userId: String (Reference to users/userId)
        // driverId: String (Reference to drivers/driverId)
        // carId: String (Reference to cars/carId)
        // fleetId: String (Reference to fleets/fleetId)
        // startLocation: Object
        // latitude: Float
        // longitude: Float
        // endLocation: Object
        // latitude: Float
        // longitude: Float
        // startTime: Timestamp
        // endTime: Timestamp
        // status: Enum ('Requested', 'Ongoing', 'Completed', 'Canceled')
        // cost: Float
        // distance: Float (in miles or km)
        // route: Array of Objects
        // latitude: Float
        // longitude: Float
        // keybotId: String (Reference to keybots/keybotId)
        // accessKey: String

        //realtime database


        //get keybot details note keybotId is reference  KeyBots/ETq5y9pE5irNlAxEitZF
        const keybotRef = await carRef.get();
        const keybotId = await keybotRef.data().keybotId.get().then(doc => doc.id);
        console.log("keybot", keybotId);

        const fleetId = await carRef.get().then(doc => doc.data().fleetId.get().then(doc => doc.id));

        console.log("fleetId", fleetId);


        const car_loc = keybotRef.data().location;


        // let { status } = await Location.requestForegroundPermissionsAsync();
        // if (status !== 'granted') {
        //   alert('Permission to access location was denied');
        //   return;
        // }

        // let location = await getLocation(true);
        // setLocation(location);

        // if (!location) {
        //   throw 'Problem getting your location. Please try again';
        // }

        const newRide = {
          inprogress: false,
          userId: user.uid,
          carId: car.id,
          fleetId: fleetId,
          startLocation: {
            latitude: car_loc.latitude,
             //location.coords.latitude,
            longitude:  car_loc.longitude,
            //location.coords.longitude,
          },
          endLocation: {
            latitude: 0,
            longitude: 0,
          },
          currentLocation: {
            latitude:  car_loc.latitude,
            //location.coords.latitude,
            longitude: car_loc.longitude,
            // location.coords.longitude,
          },
          createdAt: firestore.Timestamp.now(),
          startTime: 0,
          endTime: 0,
          status: "Initialised",
          cost: 0,
          distance: 0,
          keybotId: keybotId
        };

        console.log("newRide", newRide);

        //create a new ride object in realtime database

        const rideRef = database().ref('Rides').push();
        await rideRef.set(newRide).then(() => {
          console.log('Ride added!');
        });


        if (carDoc.data()?.current_userId === null || carDoc.data()?.current_userId === undefined) {
          transaction.update(carRef, {
            current_userId: user.uid,
            current_rideId: rideRef.key,
            status: 'In use',

          });

          setLoading(false);


          //open start ride page
          router.replace("ride/" + rideRef.key + "/start");











        } else {
          setLoading(false);
          console.log("Car is not available!", carDoc.data());
          throw 'Car is not available!';
        }
      });
    } catch (e) {
      setLoading(false);
      console.log(e);
      alert("Error booking a car: " + e);
    }
  };


  function StatusIcon({ status }: { status: string }) {
    let iconName = "" as "sync" | "circle" | "alert-circle";
    let iconColor = "";

    //searching,connecting,authenticated,ready,disconnected
  
    if (status === "searching" || status === "connecting" || status === "authenticating") {
      iconName = "sync";
      iconColor = "#FFFF33";  // Electric Yellow
    } else if (status === "ready") {
      iconName = "circle";
      iconColor = "#39FF14";  // Neon Green
    } else {
      iconName = "alert-circle";
      iconColor = "#FF0033";  // Electric Red
    }
  
  
    return <MaterialCommunityIcons name={iconName} color={iconColor} size={12} style={{ marginRight: 40, paddingBottom: 12 }} />;
  }

  return (

    <View style={styles.container}>



      <ScrollView contentContainerStyle={styles.scrollViewContainer}>




        <View style={styles.imageContainer}>
          <IconButton
            style={styles.overlayText}
            icon="bookmark"
            size={40}
            iconColor={
              favouriteCars.includes(Car?.id) ? theme.colors.primary : theme.colors.onSurface
            }

            onPress={
              () => {
                //update favourite cars in user
                firestore().collection('Users').doc(user.uid).update({
                  favourite_cars: favouriteCars.includes(Car?.id) ? firestore.FieldValue.arrayRemove(Car?.id) : firestore.FieldValue.arrayUnion(Car?.id)
                }).then(() => {
                  console.log("favourite cars updated");
                  setFavouriteCars(favouriteCars.includes(Car?.id) ? favouriteCars.filter(item => item !== Car?.id) : [...favouriteCars, Car?.id]);
                });

              }
            }
          />


          {
            Car?.imageURL ? (
              <><Image source={{ uri: Car.imageURL }} style={styles.image} /><View style={{ position: 'absolute', top:0, left:0, backgroundColor: 'transparent', borderRadius: 10, marginTop:30,marginLeft:10}}>
                <StatusIcon status={ble.deviceConnectionState.status} />
              </View></>

              
            ) : (
              <Text>No image uploaded</Text>
            )
          }

        </View>

        <View style={{
          flexDirection: 'row', justifyContent: 'space-between', marginVertical: 10

        }}>
          <View style={{ flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start' }}>


            <Title
              style={{
                fontSize: 25, fontWeight: "800", color: textColor,
                borderRadius: 30,
                marginLeft: 10,

              }}
            >
              {Car?.make} {Car?.model}
            </Title>
            <Text
              style={{
                fontSize: 20, fontWeight: "800", color: textColor, marginLeft: 10, borderRadius: 30,
              }}
            >
              {Car?.year}
            </Text>

          </View>



          <Button
            style={{
              marginRight: 10,
              justifyContent: 'center',
              alignItems: 'center',
            }}

            // disabled={getDistance(Car).rawDistance > 1000}

            contentStyle={{ height: 60, width: 120 }}
            mode='contained'
            icon='car'
            // Remove the unnecessary code causing the type mismatch error
            loading={isLoading}
            onPress={() => {
              setLoading(true);
              rideCar(Car)
            }}>
            Unlock
          </Button>






        </View>



        <Divider />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 10 }}>
          <Text

            style={{
              fontSize: 20, fontWeight: "600", color: textColor, marginLeft: 10, borderRadius: 30,
            }}

          >

            {
              getDistance(Car).rawDistance < 1000 ? (
                <Text style={{
                  textAlign: 'center', fontWeight: 'normal', fontSize: 18
                }}

                > {getDistance(Car).formattedDistance} away</Text>
              ) : (
                <Text style={{ textAlign: 'center', fontWeight: 'normal', fontSize: 18 }}

                >{getDistance(Car).formattedDistance} away please move closer to unlock</Text>
              )

            }



          </Text>
         

        </View>












        {Car?.location?.latitude && Car?.location?.longitude ? (
          <MapView
            style={styles.map}
            ref={mapRef}
            initialRegion={{
              latitude: Car?.location?.latitude,
              longitude: Car?.location?.longitude,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421
            }}
            camera={
              {
                center: {
                  latitude: Car?.location?.latitude,
                  longitude: Car?.location?.longitude,
                },
                zoom: 18,
                pitch: 0,
                heading: 0,
                altitude: 0,

              }


            }
            userLocationAnnotationTitle="Box Location"
            followsUserLocation={true}
            showsUserLocation={true}
          >
            <Marker
              coordinate={{
                latitude: Car?.location?.latitude,
                longitude: Car?.location?.longitude,
              }}
            />
          </MapView>
        ) : (
          <Text style={{
            ...styles.map, textAlign: 'center'

          }}>
            No location set
          </Text>
        )}

        <Divider style={{ margin: 10 }} />


        {
          Car?.description ? (

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 10 }}>
              <Text

                style={{
                  fontSize: 20, fontWeight: "600", color: textColor, marginLeft: 10, borderRadius: 30,
                }}

              >
                {Car?.description}

              </Text>
            </View>

          ) : null
        }

        <Divider style={{ marginTop: 10 }} />


        <View style={{ flexDirection: 'row', justifyContent: 'space-evenly' }}>
          <View style={{ alignItems: 'center' }}>
            <IconButton icon="door" size={35} />
            <Text style={styles.specsText}
            >{Car?.specs?.doors
              } Doors</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <IconButton icon="seat" size={35} />
            <Text style={styles.specsText}

            >{Car?.specs?.seats
              } Seats</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <IconButton icon="car" size={35} />
            <Text style={styles.specsText}

            >{Car?.specs?.transmission
              }</Text>
          </View>
        </View>







      </ScrollView>




    </View>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',


  },

  specsText: {
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: -10,
  },
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 0.35,
    height: 250,

    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlayText: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    zIndex: 1,
    margin: 0,
  },
  map: {
    flex: 0.25,
    height: 200,



  },
  inputContainer: {
    flex: 0.25,
    paddingHorizontal: 10,

  },
  licensePlateInput: {





  },
  switchContainer: {

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchLabel: {
    marginRight: 10,
  },

  address: {

    paddingHorizontal: 10,


    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
  },
  saveButtons: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '30%',
    alignSelf: 'center',
    marginBottom: 20,
    marginTop: 20,
  },
  updateLocationContainer: {

    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  updateLocationButton: {
    marginVertical: 10,
    width: '50%',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',


  },
  scrollViewContainer: {
    paddingBottom: 20,  // Adjust as needed
  },

  detailsInput: {
    minHeight: 120,  // Adjust as needed
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  reputation: {
    width: '100%',
    marginBottom: 20,

  },




});