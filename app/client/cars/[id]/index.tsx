import Slider from '@react-native-community/slider';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { LocationObject } from 'expo-location';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Button, Divider, IconButton, TextInput, Title, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Switch from 'react-native-switch-toggles';
import { Text, View, getTheme } from '../../../../components/Themed';
import { BoxStatus } from '../../../../constants/Auth';
import { Box, PreciseLocation, UpdateBoxDto, getErrorMessage, useLazyGetBoxQuery, useSetBoxPreciseLocationMutation, useUpdateBoxMutation } from '../../../../data/api';
import { uploadToFirebase } from "../../../../firebaseConfig";
import firestore from '@react-native-firebase/firestore';
import { get } from 'react-native/Libraries/TurboModule/TurboModuleRegistry';
import Icon from 'react-native-paper/lib/typescript/src/components/Icon';
import { useAuth } from '../../../../auth/provider';
import database from '@react-native-firebase/database';


export default function KeyBotDetails() {

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id = -1 } = useLocalSearchParams();
  const navigation = useNavigation();



  // const [getBoxDetails, { isLoading, data: initialBoxDetails, isFetching, isSuccess }] = useLazyGetBoxQuery();

  // const [updateBox, { isLoading: isUpdating }] = useUpdateBoxMutation();
  // const [setBoxPreciseLocation, { isLoading: isSettingLocation }] = useSetBoxPreciseLocationMutation();


  const [Car, setBoxDetails] = useState<any | undefined>(undefined);
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

  const [isUploading, setUploading] = useState(false);
  const [visible, setVisible] = React.useState(false);
  const [isEnabled, setIsEnabled] = React.useState(false);

  const isFirstRender = useRef(true);
  const mapRef = React.useRef<MapView>(null);
  const textColor = getTheme().text;
  const { user } = useAuth();




  const handleUploadImage = async () => {
    // let pickerResult = await ImagePicker.launchCameraAsync({
    //   allowsEditing: true,
    //   aspect: [4, 3],
    // });

    //ceck permission
    if (permission?.status !== ImagePicker.PermissionStatus.GRANTED) {
      requestPermission();

    }
    if (libpermission?.status !== ImagePicker.PermissionStatus.GRANTED) {
      requestLibPermission();
    }


    let pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!pickerResult.canceled) {
      uploadImageAsync(pickerResult.assets[0].uri, `image_${id}.jpg`);
    }
  };

  const uploadImageAsync = async (uri: string, imageName: string) => {
    setUploading(true);

    try {
      const uploadedImage = await uploadToFirebase(uri, imageName, (progress: any) => {
        console.log(`Upload progress: ${progress}%`);
      });

      if (Car) {
        setBoxDetails({ ...Car, imageURL: uploadedImage.downloadUrl });
        console.log("set imageUrl", uploadedImage.downloadUrl);

      }

    } catch (error) {
      console.error('Error uploading image:', error);
    }


    setUploading(false);
  };




  useEffect(() => {
    async function get_car_details() {
      try {
        const car_details = await firestore().collection('Cars').doc(id).get();

        


        console.log("car_details", car_details.data());

        setBoxDetails({ ...car_details.data(), id: id });


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

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    })();
    get_car_details()
  }, [id]);

  const handleLicensePlateChange = (text: string) => {
    text = text.replace(/\s/g, '');

    if (!licensePlateRegex.test(text)) {
      setLicensePlateError('Invalid license plate');
    } else {
      setLicensePlateError('');
      if (Car) {
        setBoxDetails({ ...Car, licensePlate: text });
      }
    }
  }



  const handleDetailsChange = (text: string) => {
    if (Car) {
      setBoxDetails({ ...Car, description: text });
    }
  }


  const haveBoxDetailsChanged = (newDetails: Box, initialDetails: Box): boolean => {
    const relevantKeys: (keyof Box)[] = ['licensePlate', 'imageURL', 'availability', 'location', 'description']; // Add any other keys that are relevant

    const changed = relevantKeys.some((key: keyof Box) => {
      if (typeof newDetails[key] === 'object' && newDetails[key] !== null) {
        return JSON.stringify(newDetails[key]) !== JSON.stringify(initialDetails[key]);
      }

      return newDetails[key] !== initialDetails[key];
    });
    console.log("haveBoxDetailsChanged", changed);
    return changed;
  };

  const handleBoxStatusChange = (value: boolean) => {
    console.log("handleBoxStatusChange", value);
    //check that all fields are filled like location, license plate, image, reputation threshold 

    if (value === true) {
      setIsEnabled(false);
    }
    // if (BoxDetails) {


    //   const isBoxDetailsFilled = BoxDetails?.licensePlate !== "" && BoxDetails?.imageUrl !== "" && BoxDetails?.reputationThreshold !== 0 && BoxDetails?.preciseLocation !== null;


    //   console.log("isBoxDetailsFilled", isBoxDetailsFilled);

    //   if (!isBoxDetailsFilled && value) {
    //     //setBoxDetails({ ...BoxDetails, boxStatus: BoxStatus.NOT_READY });
    //     console.log("seting switch to false");
    //     setIsEnabled(!value);


    //   } else {

    //     console.log("seting switch to x");
    //     setIsEnabled(value)
    //   }
    //   // setBoxDetails({ ...BoxDetails, boxStatus: value ? BoxStatus.READY : BoxStatus.NOT_READY });

    //   //setSwitchValue(!switchValue);








    // } else {
    //   console.log("BoxDetails is undefined");
    //   setIsEnabled(value)
    // }



  }







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
      if (d < 1000) {
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




      const newRide = {
        inprogress: false,
        userId: user.uid,
        carId: car.id,
        fleetId: fleetId,
        startLocation: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        endLocation: {
          latitude: 0,
          longitude: 0,
        },
        currentLocation: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
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


        //open start ride page
        router.push("ride/" + rideRef.key + "/start");






     
  



      } else {
        console.log("Car is not available!", carDoc.data());
        throw 'Car is not available!';
      }
    });
  } catch (e) {
    console.log(e);
    alert("Error booking a car: " + e);
  }
};




  return (

    <View style={styles.container}>



      <ScrollView contentContainerStyle={styles.scrollViewContainer}>




        <View style={styles.imageContainer}>
          {
            Car?.imageURL ? (
              <Image source={{ uri: Car.imageURL }} style={styles.image} />
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
                fontSize: 30, fontWeight: "800", color: textColor,
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

            disabled={getDistance(Car).rawDistance > 1000}

            contentStyle={{ height: 60, width: 120 }}
            mode='contained'
            icon='car'
            onPress={() => {
              rideCar(Car)
            }}>
            Unlock
          </Button>






        </View>



        <Divider  />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 10 }}>
          <Text

            style={{
              fontSize: 20, fontWeight: "600", color: textColor, marginLeft: 10, borderRadius: 30,
            }}

          >

            {
              getDistance(Car).rawDistance < 1000 ? (
                <Text style={{ textAlign: 'center' }}

                > {getDistance(Car).formattedDistance} away</Text>
              ) : (
                <Text style={{ textAlign: 'center' }}

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
    top: 0,
    right: 0,
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