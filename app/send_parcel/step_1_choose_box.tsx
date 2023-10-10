import { FlatList, StyleSheet } from 'react-native';

import { useRouter } from 'expo-router';
import { Button, Snackbar } from 'react-native-paper';
import { Text, View } from '../../components/Themed';
import { useAppDispatch, useAppSelector } from '../../data/hooks';

import * as Location from 'expo-location';
import { LocationObject } from 'expo-location';
import React, { useEffect, useState } from 'react';
import { isErrorWithMessage, isFetchBaseQueryError, useGetBoxesQuery, useLazyGetBoxesQuery,useSetBoxPreciseLocationMutation,BoxItem} from '../../data/api';

import { Avatar, Card, Paragraph, Title } from 'react-native-paper';
import { ScrollView, RefreshControl } from 'react-native';
import { List } from 'react-native-paper';


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



  const [result, setResult] = React.useState("result");

  const [ErrorMessage, setError] = React.useState("");

  const [location, setLocation] = React.useState<LocationObject | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  const [selectedBox, setSelectedBox] = React.useState<BoxItem | null>(null);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);

    // Here you can fetch your data...
    // getBoxes() or refetch() could potentially be called here, depending on your needs

    refetch();
    // Remember to set refreshing to false when your data fetch operation is complete
    setRefreshing(false);
  }, []);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    })();
  }, []);

  return (
    <View style={styles.container}>
  
      <ScrollView
        contentContainerStyle={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
       
      {Boxes && Boxes.items.map((item, index) => {
  return (
    <Card key={index} style={[styles.card, selectedBox && selectedBox.id === item.id ? {backgroundColor: "green"} : {backgroundColor: "white"}]}

    onPress={() => {  setSelectedBox(item);
    }

    }
    >
      <Card.Content>
        <Title>did: {item.did}</Title>
        <Paragraph>MAC Address: {item.macAddress}</Paragraph>
        <Paragraph>permission: {item.permission}</Paragraph>
        <Paragraph>status: {item.status}</Paragraph>
        <Paragraph>preciseLocation_id: {item.preciseLocation_id}</Paragraph>
        <Paragraph>approximateLocation_id {item.approximateLocation_id}</Paragraph>
        <Paragraph>id: {item.id}</Paragraph>
        <Paragraph>licensePlate: {item.licensePlate}</Paragraph>
        <Paragraph>reputation: {item.reputation}</Paragraph>
        <Paragraph>reputationThreshold: {item.reputationThreshold}</Paragraph>
        <Paragraph>user_id: {item.user_id}</Paragraph>
        {item.description && <Paragraph>Description: {item.description}</Paragraph>}
      </Card.Content>
      {item.imageUrl && (
        <Card.Cover source={{ uri: item.imageUrl }} />
      )}
    </Card>
  );
})}
      </ScrollView>

      

      <Button
      style={{marginVertical: 10,padding: 10}}
        mode="contained"

        disabled={selectedBox == null}
        
        onPress={() => {
          if (selectedBox) {
            router.push({
              pathname: "/send_parcel/step_2_parcel_details",
              params: {
                box_id: selectedBox.id,
              },
            });
          }
        }}

      >
        Next
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
    
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  
  scrollView: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '90%',
    marginVertical: 10,
  },
});
