import React, { useState, useEffect, useCallback, useRef } from 'react';
import firestore from '@react-native-firebase/firestore';
import { Text, View } from '../../../components/Themed';
import { ActivityIndicator, Avatar, Button, Caption, Card, Divider, Paragraph, Snackbar, Title, useTheme } from 'react-native-paper';
import { StyleSheet,FlatList, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import database from '@react-native-firebase/database';
import { useAuth } from '../../../auth/provider';

const PAGE_SIZE = 3;  // Number of documents to fetch in a single request

export default function CarsInfiniteScroll() {
  const [cars, setCars] = useState([]);
  const [lastVisible, setLastVisible] = useState(null);
  const [loading, setLoading] = useState(false);
  const [moreDataAvailable, setMoreDataAvailable] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const loadingRef = useRef(loading);
  loadingRef.current = loading;
  const { user } = useAuth();


  const router = useRouter();

  const fetchCars = async (startAfter) => {
    console.log("fetching rides");
    let ridesRef = database().ref('Rides').orderByChild('userId').equalTo(user.uid);
  
    ridesRef.on('value', snapshot => {
      console.log("snapshot", snapshot.numChildren());
      const ridesArray = [];
      snapshot.forEach(childSnapshot => {
        ridesArray.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });
  
      if(ridesArray.length < PAGE_SIZE){
        setMoreDataAvailable(false);
      }
      console.log("ridesArray", ridesArray);
      setCars(ridesArray);
      
      if(ridesArray.length > 0) {
        setLastVisible(ridesArray[ridesArray.length - 1]);
        console.log("set lastVisible", ridesArray[ridesArray.length - 1].model);
      }
    });
  };
  

  const loadMoreCars = useCallback(async () => {
    
    try {

      console.log("loadMoreCars", loadingRef.current, moreDataAvailable);
      // console.log("loadMoreCars", loading, moreDataAvailable);
      if (loadingRef.current || !moreDataAvailable) return;

      setLoading(true);

      console.log("loadMoreCars");

      const newCars = await fetchCars(lastVisible);
      // setCars(prevCars => [...prevCars, ...newCars]);
      // setLastVisible(newCars[newCars.length - 1]);
      // console.log("setLastVisible", newCars[newCars.length - 1], newCars.length);
      
    } catch (e) {
      setError(e.message);
      alert("Error loading more cars: " + e.message);
    } finally {
      setLoading(false);
    }
  }, [moreDataAvailable, lastVisible]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      setLastVisible(null);

      const newCars = await fetchCars();
      setCars(newCars);
      setMoreDataAvailable(true);
      
    } catch (e) {
      setError(e.message);
      alert("Error refreshing cars: " + e.message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const fetchInitialCars = async () => {
    // This function only fetches the initial set of cars
    const newCars = await fetchCars();
    // console.log(newCars);
    setCars(newCars);
  };

  const firestoreTimestampToDate = (timestamp) => {
    console.log("timestamp", timestamp);
    return new Date(timestamp._seconds * 1000);
};

  useEffect(() => {
    fetchInitialCars();
    
  }, []);


  return (
    <View>

      {/* <View style={{ marginTop: 5,
        height: 50, flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center' }}
        >
      <Button style={{ width: '40%' }}
       onPress={loadMoreCars} mode="contained">
        Filters
      </Button>
      <Button style={{ width: '40%' }} onPress={loadMoreCars} mode="contained" icon="map">
        Map
      </Button>
      </View> */}

    <FlatList
      style={{ marginBottom: 50}}
      data={cars}
      renderItem={({ item }) => (
        <Card style={styles.card}>

          <Card.Content>
            <Title>{item.id}</Title>
            <Paragraph>{item.status}</Paragraph>
            <Paragraph>Created at: {firestoreTimestampToDate(item.createdAt).toLocaleString()}</Paragraph>
            <Paragraph> Distance: {item.distance} km</Paragraph>
          
          </Card.Content>
          <Card.Actions>
            <Button mode='contained' icon='car-info' onPress={() => {
              router.push("client/cars/" + item.id);
            }}>Details</Button>
            <Button mode='contained' icon='car' onPress={() => {

              router.push("/ride/" + item.id + "/start");


            }}>Start</Button>
          
          </Card.Actions>
        </Card>
      )}
      keyExtractor={item => item.id}
      // onEndReached={loadMoreCars}
      onEndReachedThreshold = {0.3}
      onMomentumScrollBegin = {() => {this.onEndReachedCalledDuringMomentum = false;}}
      onEndReached = {() => {
          if (!this.onEndReachedCalledDuringMomentum) {
            loadMoreCars();
            this.onEndReachedCalledDuringMomentum = true;
          }
        }
      }
            
      ListFooterComponent={() => (
        loading ? <ActivityIndicator style={styles.loader} /> : null
      )}
      refreshing={refreshing}
      onRefresh={onRefresh}
    />
    </View>
  );
  
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    marginHorizontal: 16,
  },
  loader: {
    marginVertical: 10,
  },
});

