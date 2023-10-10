import { StyleSheet } from 'react-native';

import { useRouter } from 'expo-router';
import { Button, Snackbar } from 'react-native-paper';
import { Text, View } from '../../components/Themed';
import { useAppDispatch, useAppSelector } from '../../data/hooks';

import * as Location from 'expo-location';
import { LocationObject } from 'expo-location';
import React, { useEffect } from 'react';
import { isErrorWithMessage, isFetchBaseQueryError, useGetBoxesQuery, useLazyGetBoxesQuery,useSetBoxPreciseLocationMutation} from '../../data/api';

import { Avatar, Card, Paragraph, Title } from 'react-native-paper';


export default function Main() {

  const router = useRouter();
  const secure = useAppSelector((state) => state.secure);
  const dispatch = useAppDispatch();


  const [SetBoxPreciseLocation, { isLoading: isLoadingSetBoxPreciseLocation }] = useSetBoxPreciseLocationMutation();





  const [result, setResult] = React.useState("result");

  const [ErrorMessage, setError] = React.useState("");

  const [location, setLocation] = React.useState<LocationObject | null>(null);





  useEffect(() => {

    //console.log(secure.userData);

    (async () => {

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    })();

  }, [])

 



  return (
    <View style={styles.container}>
      {location && <Text>latitude: {location.coords.latitude}</Text>}
      {location && <Text>longitude: {location.coords.longitude}</Text>}

      <Text style={styles.title}>Main screen</Text>
      <Text>
        result:
        {result == null ? "null" : result}

      </Text>

      <Button
        onPress={() => {
          router.push("send_parcel/step_1_choose_box");
        }
        }
      >
        Choose a box

      </Button>


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
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
  card: {
    width: '90%',
    marginVertical: 10,
  },
});
