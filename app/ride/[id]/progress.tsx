import database from '@react-native-firebase/database';
import * as Location from 'expo-location';
import { LocationObject } from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { ActivityIndicator, Title, useTheme } from 'react-native-paper';
import Animated, { FadeInUp } from 'react-native-reanimated';
import Toast from 'react-native-root-toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { View } from '../../../components/Themed';
import { useAppDispatch } from '../../../data/hooks';
import { getLocation } from '../../../utils/getlocation';

export default function ConnectToTheBox() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const dispatch = useAppDispatch();


  const [ride, setRide] = useState<any>(undefined);

  const [location, setLocation] = React.useState<LocationObject | null>(null);





  const theme = useTheme();



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



  useEffect(() => {
    fetchRide();

    return () => {
      // Cleanup logic here if needed
    }
  }, []);



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



  //start ride //set the realtime propertires 
  const updateRide = async () => {



    //CODE HEREEE
    //https://github.com/expo/expo/issues/22183
    try {
      //set the realtime properties
      let rideRef = database().ref('Rides').child(String(params.id));
      rideRef.update({
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
        {location && ride ? (
          <View>
            <Title style={styles.title}>Ride in progress</Title>
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
    textAlign: "center", marginBottom: 40, marginHorizontal: 30
  },
  subtitle_small: {
    textAlign: "center", marginBottom: 10, marginHorizontal: 30
  },



});
