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


export default function SetLocationOfABox() {

  const router = useRouter();

  const secure = useAppSelector((state) => state.secure);
  const dispatch = useAppDispatch();

  const [getBoxes, { isLoading: isLoadingGetBoxes }] = useLazyGetBoxesQuery();

  const {
    data: Boxes,
    isLoading,
    isSuccess,
    isError,
    error,
    refetch
  } = useGetBoxesQuery();

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

  async function call_Set_location(boxId: number) {
    try {

      console.log("call_Set_location", boxId, location);

      if (location == null) {
        setError("location is null");
        return;
      }

      const response = await SetBoxPreciseLocation({ boxId: boxId,
        preciseLocation: {
          latitude: location?.coords.latitude,
          longitude: location?.coords.longitude,
          inaccuracy: location?.coords.accuracy ? location?.coords.accuracy : 0,
        }}
        ).unwrap();

      console.log(response, "response");

      // setResult(JSON.stringify(response));


    } catch (err) {
      if (isFetchBaseQueryError(err)) {
        const errMsg = 'error' in err ? err.error : JSON.stringify(err.data)
        console.log("fetch error", err);
        setError(errMsg);
      } else if (isErrorWithMessage(err)) {
        console.log("error with message , ", err);
        setError(err.message);
      }
    }
  }




  return (
    <View style={styles.container}>
      {location && <Text>latitude: {location.coords.latitude}</Text>}
      {location && <Text>longitude: {location.coords.longitude}</Text>}

      <Text style={styles.title}>Fetch my owned Boxes</Text>
      <Text>
        result:
        {result == null ? "null" : result}

      </Text>

      {Boxes && Boxes.items.map((item, index) => {
  return (
    <Card key={index} style={styles.card}

    onPress={() => { call_Set_location(item.id) }

    }
    
    >
      <Card.Content>
        <Title>ID: {item.id}</Title>
        <Paragraph>MAC Address: {item.macAddress}</Paragraph>
        <Paragraph>Permission: {item.permission}</Paragraph>
        <Paragraph>Status: {item.status}</Paragraph>
        <Paragraph>Location: {item.preciseLocation_id}</Paragraph>
        {item.description && <Paragraph>Description: {item.description}</Paragraph>}
      </Card.Content>
      {item.imageUrl && (
        <Card.Cover source={{ uri: item.imageUrl }} />
      )}
    </Card>
  );
})}



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
