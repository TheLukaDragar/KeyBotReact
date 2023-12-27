import Slider from '@react-native-community/slider';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { LocationObject } from 'expo-location';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Button, IconButton, TextInput, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Switch from 'react-native-switch-toggles';
import { Text, View } from '../../../../components/Themed';
import { BoxStatus } from '../../../../constants/Auth';
import { Box, PreciseLocation, UpdateBoxDto, getErrorMessage, useLazyGetBoxQuery, useSetBoxPreciseLocationMutation, useUpdateBoxMutation } from '../../../../data/api';
import { uploadToFirebase } from "../../../../firebaseConfig";


export default function KeyBotDetails() {

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id = -1 } = useLocalSearchParams();
  const navigation = useNavigation();


  const [getBoxDetails, { isLoading, data: initalBoxDetails, isFetching, isSuccess }] = useLazyGetBoxQuery();

  const [updateBox, { isLoading: isUpdating }] = useUpdateBoxMutation();
  const [setBoxPreciseLocation, { isLoading: isSettingLocation }] = useSetBoxPreciseLocationMutation();


  const [BoxDetails, setBoxDetails] = useState<Box | undefined>(undefined);



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

      if (BoxDetails) {
        setBoxDetails({ ...BoxDetails, imageUrl: uploadedImage.downloadUrl });
        console.log("set imageUrl", uploadedImage.downloadUrl);

      }

    } catch (error) {
      console.error('Error uploading image:', error);
    }


    setUploading(false);
  };




  useEffect(() => {
    async function call_GetBoxDetails() {
      try {
        const response = await getBoxDetails(parseInt(String(id))).unwrap();

        setBoxDetails(response);

        setIsEnabled(response.boxStatus === BoxStatus.READY);

        console.log("set license plate", response.licensePlate);
        console.log("set reputationThreshold", response.reputationThreshold);
        console.log("set imageUrl", response.imageUrl);



        const geocodeResult = await Location.reverseGeocodeAsync({
          latitude: response.preciseLocation.latitude,
          longitude: response.preciseLocation.longitude,
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
    call_GetBoxDetails();
  }, [id]);

  const handleLicensePlateChange = (text: string) => {
    text = text.replace(/\s/g, '');

    if (!licensePlateRegex.test(text)) {
      setLicensePlateError('Invalid license plate');
    } else {
      setLicensePlateError('');
      if (BoxDetails) {
        setBoxDetails({ ...BoxDetails, licensePlate: text });
      }
    }
  }

  const handleReputationChange = (value: number) => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (BoxDetails) {
      setBoxDetails({ ...BoxDetails, reputationThreshold: value });
    }
  }

  const handleDetailsChange = (text: string) => {
    if (BoxDetails) {
      setBoxDetails({ ...BoxDetails, description: text });
    }
  }


  const haveBoxDetailsChanged = (newDetails: Box, initialDetails: Box): boolean => {
    const relevantKeys: (keyof Box)[] = ['licensePlate', 'imageUrl', 'reputationThreshold', 'boxStatus', 'preciseLocation', 'description']; // Add any other keys that are relevant

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



  const updateBoxDetailsAndNavigate = async () => {
    try {
      if (BoxDetails) {

        //check for location change
        if (
          (!initalBoxDetails?.preciseLocation && BoxDetails?.preciseLocation) ||
          (initalBoxDetails?.preciseLocation &&
            (initalBoxDetails.preciseLocation.latitude !==
              BoxDetails?.preciseLocation?.latitude ||
              initalBoxDetails.preciseLocation.longitude !==
              BoxDetails?.preciseLocation?.longitude))
        ) {
          console.log("location changed");
          const newLocation: PreciseLocation = { latitude: BoxDetails?.preciseLocation.latitude, longitude: BoxDetails?.preciseLocation.longitude, inaccuracy: BoxDetails?.preciseLocation.inaccuracy };

          const updated_location = await setBoxPreciseLocation({
            boxId: BoxDetails?.id,
            preciseLocation: newLocation,
            update: BoxDetails?.preciseLocation_id ? true : false
          }).unwrap();
          console.log("updated_location", updated_location);
        }




        let updatedBoxDetails: UpdateBoxDto = {
          ...BoxDetails

        };


        const updatedBox = await updateBox(updatedBoxDetails).unwrap();
        console.log("updatedBox", updatedBox);
        setVisible(false);
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          console.log("Can't go back");
        }

      } else {
        console.log("BoxDetails is undefined");
      }
    } catch (err) {
      console.error("Failed to update box:", err);
    }
  };

  useEffect(() => {
    console.log("isEnabled", isEnabled);
    if (BoxDetails) {
      const isBoxDetailsFilled = BoxDetails?.licensePlate !== "" && BoxDetails?.imageUrl !== "" && BoxDetails?.reputationThreshold !== 0 && BoxDetails?.preciseLocation !== null;
      console.log("isBoxDetailsFilled", isBoxDetailsFilled);
      if (!isBoxDetailsFilled && isEnabled) {
        console.log("seting switch to false");
        setBoxDetails({ ...BoxDetails, boxStatus: BoxStatus.NOT_READY });
        setIsEnabled(false);
      } else {
        console.log("seting switch to x");
        setBoxDetails({ ...BoxDetails, boxStatus: isEnabled ? BoxStatus.READY : BoxStatus.NOT_READY });

      }


    }

  }, [isEnabled]);




  return (

    <View style={styles.container}>

      <ScrollView contentContainerStyle={styles.scrollViewContainer}>

        <View style={styles.imageContainer}>
          {
            BoxDetails?.imageUrl ? (
              <Image source={{ uri: BoxDetails.imageUrl }} style={styles.image} />
            ) : (
              <Text>No image uploaded</Text>
            )
          }



          <IconButton
            style={{
              ...styles.overlayText,
              backgroundColor: theme.colors.background,
            }}
            icon="image-edit-outline"
            // iconColor={theme.colors.primary}
            size={32}
            onPress={handleUploadImage}
            disabled={isUploading}
          />

        </View>

        {BoxDetails?.preciseLocation?.latitude && BoxDetails?.preciseLocation?.longitude ? (
          <MapView
            style={styles.map}
            ref={mapRef}
            initialRegion={{
              latitude: BoxDetails?.preciseLocation?.latitude,
              longitude: BoxDetails?.preciseLocation?.longitude,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421
            }}
            camera={
              {
                center: {
                  latitude: BoxDetails?.preciseLocation?.latitude,
                  longitude: BoxDetails?.preciseLocation?.longitude,
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
                latitude: BoxDetails?.preciseLocation?.latitude,
                longitude: BoxDetails?.preciseLocation?.longitude,
              }}
            />
          </MapView>
        ) : (
          <Text style={{
            ...styles.map, textAlign: 'center'

          }}>
            No location set, please set box location.
          </Text>
        )}


        {/* <Paragraph style={styles.address}>Address: {address == "" ? "Loading..." : address}</Paragraph> */}
        <View style={styles.updateLocationContainer}>
          <Button style={styles.updateLocationButton}
            contentStyle={{ height: 50 }}
            mode="contained"
            loading={isUpdating}
            onPress={() => {
              if (location && location.coords && location?.coords.latitude && location?.coords.longitude && location?.coords.accuracy && BoxDetails) {
                setBoxDetails({
                  ...BoxDetails, preciseLocation: {
                    latitude: location?.coords.latitude,
                    longitude: location?.coords.longitude,
                    inaccuracy: location?.coords.accuracy,
                  }
                });

                if (mapRef.current) {
                  mapRef.current.animateCamera({
                    center: {
                      latitude: location?.coords.latitude,
                      longitude: location?.coords.longitude,
                    },
                    zoom: 18,
                  });
                }
              }
            }
            }



          >
            {BoxDetails?.preciseLocation?.latitude && BoxDetails?.preciseLocation?.longitude ? "Update Location" : "Set Location"}
          </Button>
        </View>
        <View style={styles.inputContainer}>


          <TextInput
            label="License Plate"
            value={BoxDetails?.licensePlate}
            mode='outlined'
            placeholder='XX1234567'
            onChangeText={handleLicensePlateChange}

            style={styles.licensePlateInput}
            autoCapitalize='characters'
          />

          <TextInput
            label="Description"
            value={BoxDetails?.description}
            mode='outlined'
            placeholder='Enter more details here...'
            onChangeText={handleDetailsChange}
            style={styles.detailsInput}
            multiline
          />


          {licensePlateError ? <Text style={styles.errorText}>{licensePlateError}</Text> : null}
          <View style={styles.reputation}>
            <Text
              style={{
                alignContent: 'center',
                textAlign: 'left',
                marginBottom: 10,
                marginLeft: 15,
              }}

            >Reputation Threshold : {BoxDetails?.reputationThreshold || 0}</Text>
            <Slider

              value={BoxDetails?.reputationThreshold || 0}
              onValueChange={handleReputationChange}
              minimumValue={0}
              maximumValue={5}
              step={1}
              thumbTintColor={theme.colors.primary}
              minimumTrackTintColor={theme.colors.primary}
              maximumTrackTintColor={theme.colors.primary}
            />
          </View>


          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Status:</Text>
            <Switch

              size={60}
              value={isEnabled}
              onChange={(value) => {
                console.log("switch value", value);
                setIsEnabled(value);
              }
              }


              activeTrackColor={theme.colors.primary}
              renderOffIndicator={() => <Text style={{ fontSize: 14, color: theme.colors.secondary }}>Not Ready</Text>}
              renderOnIndicator={() => <Text style={{ fontSize: 14, color: theme.colors.onPrimary }}>Ready
              </Text>}
            />
          </View>
        </View>
        <Button
          style={styles.saveButtons}
          contentStyle={{ height: 50 }}
          mode="contained"
          loading={isUpdating}
          onPress={updateBoxDetailsAndNavigate}
          disabled={!BoxDetails || !initalBoxDetails || !haveBoxDetailsChanged(BoxDetails, initalBoxDetails)}
        >
          Save
        </Button>

      </ScrollView>




    </View>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',


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