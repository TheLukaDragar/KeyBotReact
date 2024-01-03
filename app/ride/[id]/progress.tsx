import database from '@react-native-firebase/database';
import * as Location from 'expo-location';
import { LocationObject } from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { ActivityIndicator, Button, Paragraph, Title, useTheme } from 'react-native-paper';
import Animated, { FadeInUp } from 'react-native-reanimated';
import Toast from 'react-native-root-toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import MapView from 'react-native-maps';
import { View } from '../../../components/Themed';
import { useAppDispatch } from '../../../data/hooks';

export default function ConnectToTheBox() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const dispatch = useAppDispatch();


  const [ride, setRide] = useState<any>(undefined);

  const [location, setLocation] = React.useState<LocationObject | null>(null);
  const mapRef = React.useRef<MapView>(null);






  const theme = useTheme();



  const fetchRide = async () => {
    try {
      let rideRef = database().ref('Rides').child(String(params.id));
      const snapshot = await rideRef.once('value');
        const ride = {
          id: snapshot.key,
          ...snapshot.val()
        };
        console.log("RIDE", ride);
        setRide(ride);
        //unsubscribe
        
      
      // Unsubscribe from the listener when it's no longer needed
    } catch (error) {
      console.error("Error fetching ride: ", error);
      // Handle the error as you need here
    }
  }



  useEffect(() => {
    fetchRide();

  
    // Clean up function
    return () => {
      //unsubscribe
    };
  }, []); 
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (ride?.startTime) {
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const start = new Date(ride.startTime).getTime();
        setElapsedTime(Math.floor((now - start) / 1000)); // Elapsed time in seconds
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [ride?.startTime]);

  const formatElapsedTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m}:${s}`;
  };



  // useEffect(() => {

  //   //refetch();

  //   (async () => {

  //     let { status } = await Location.requestForegroundPermissionsAsync();
  //     if (status !== 'granted') {
  //       Toast.show("You need to grant location permissions to use this feature.", {
  //         duration: Toast.durations.LONG,
  //         position: Toast.positions.BOTTOM,
  //         shadow: true,
  //         animation: true,
  //         hideOnPress: true,
  //         delay: 0,
  //         backgroundColor: theme.colors.error,
  //       });

  //       return;
  //     }

  //     let location = await getLocation()
  //     setLocation(location);






  //   })();
  // }, [])

  let locationSubcription: { remove: any; } | null = null;
  //use state for subscription

  //last ride update time
  const [lastRideUpdateTime, setLastRideUpdateTime] = useState(Date.now());


  useEffect(() => {
    let isSubscribed = true;
    
    const subscribe = async () => {
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
  
      try {
        locationSubcription = await Location.watchPositionAsync(
          {
            distanceInterval: 0, // for IOS
            accuracy: Location.Accuracy.High,
            timeInterval: 10000 // for Android
          },
          async (loc) => {
            if (!isSubscribed) return;
            
            setLocation(loc);
            console.log("LOCATION", loc);
  
            // Update the ride every 10 seconds
            if (Date.now() - lastRideUpdateTime >= 10000) {
              setLastRideUpdateTime(Date.now());
  
              // Call the updateRide function here
              await updateRide(loc);
            }
          }
        );
      } catch (error) {
        alert(error);
      }
    };
  
    subscribe();
  
    return () => {
      isSubscribed = false;
      if (locationSubcription) {
        locationSubcription.remove();
      }
    };
  }, []);

  //remove subscription on unmount

  



  //start ride //set the realtime propertires 
  const updateRide = async (currentLocation: LocationObject) => {



    //CODE HEREEE
    //https://github.com/expo/expo/issues/22183
    try {

      //if location is null, return
      if (!currentLocation || !currentLocation?.coords.latitude || !currentLocation?.coords.longitude) {
        return;
      }


      //set the realtime properties
      let rideRef = database().ref('Rides').child(String(params.id));


      rideRef.update({
        currentLocation: {
          latitude: currentLocation?.coords.latitude,
          longitude: currentLocation?.coords.longitude,
        }

      });
      console.log("RIDE UPDATED", currentLocation?.coords.latitude, currentLocation?.coords.longitude);
      // Unsubscribe from the listener when it's no longer needed
      return () => rideRef.off();
    } catch (error) {
      console.error("Error fetching ride: ", error);

     
      // Handle the error as you need here
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <Animated.View
        entering={FadeInUp.duration(1000).springify()}
        style={{ flex: 10, }}
      >
        {location && ride ? (
          <View style={{
            flex: 1, alignItems: "center", justifyContent: "center"
          }}>
            <Title style={styles.title}>Ride in progress</Title>

            <Paragraph style={styles.subtitle}>ride Id: {params.id}</Paragraph>
            <Paragraph style={styles.subtitle}>Elapsed Time: {formatElapsedTime(elapsedTime)}</Paragraph>
            {/* <Paragraph style={styles.subtitle}>E: {JSON.stringify(ride)}</Paragraph> */}

            <View style={{
              height: 400, width: "100%", marginVertical: 10
            }}>
              {location?.coords.latitude && location?.coords.longitude ? (
                <>
                  <MapView
                    style={styles.map}
                    ref={mapRef}
                    initialRegion={{
                      latitude: location?.coords.latitude,
                      longitude: location?.coords.longitude,
                      latitudeDelta: 0.0922,
                      longitudeDelta: 0.0421
                    }}
                    camera={{
                      center: {
                        latitude: location?.coords.latitude,
                        longitude: location?.coords.longitude,
                      },
                      zoom: 16,
                      pitch: 0,
                      heading: 0,
                      altitude: 0,
                    }}
                    userLocationAnnotationTitle="You are here"
                    followsUserLocation={true}
                    showsUserLocation={true}
                  >
                    {/* <Marker
                  coordinate={{
                    latitude: Car?.location?.latitude,
                    longitude: Car?.location?.longitude,
                  }} /> */}
                  </MapView>
                </>

              ) : (

                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                  <ActivityIndicator size="large" />
                </View>

              )}
            </View>





            <Button mode="contained"
              icon="check"
              contentStyle={{ height: 80, width: 200 }}
              style={{ marginVertical: 10 }}
              onPress={() => {

                //navigate to ride progress
                router.replace("/ride/" + ride.id + "/end");

              }}>
              End Ride
            </Button><Button mode="contained"
              icon="bug"
              contentStyle={{ height: 80, width: 150 }}
              onPress={() => {

                //navigate to ride progress
                router.replace("/ride/" + ride.keybotId + "/control");

              }}>
              Debug
            </Button>





          </View>

        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="large" />
          </View>
        )}
      </Animated.View>
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
    textAlign: "center", marginHorizontal: 30
  },
  subtitle_small: {
    textAlign: "center", marginBottom: 10, marginHorizontal: 30
  },
  map: {
    flex: 1,




  },



});
