import React, { useState, useEffect, useCallback, useRef } from 'react';
import firestore from '@react-native-firebase/firestore';
import { Text, View } from '../../../components/Themed';
import { ActivityIndicator, Avatar, Button, Caption, Card, Divider, Paragraph, Snackbar, Title, useTheme } from 'react-native-paper';
import { StyleSheet,FlatList, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';

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

  const router = useRouter();

  const fetchCars = async (startAfter) => {
    console.log("fetching cars");
    let query = firestore()
      .collection('Cars')
      // .orderBy('model')
      .limit(PAGE_SIZE)

      if (startAfter) {
        console.log("startingAfter", startAfter.data().model);
        query = query.startAfter(startAfter);
      }

    const snapshot = await query.get();
    console.log("snapshot", snapshot.docs.length);

    if (!snapshot.docs.length) {
      setMoreDataAvailable(false);
      return [];
    }

    if(snapshot.docs.length < PAGE_SIZE){
      setMoreDataAvailable(false);
      
    }

    //set lastVisible for the next pagination
    setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
    console.log("set lastVisible", snapshot.docs[snapshot.docs.length - 1].data().model);


    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  };

  const loadMoreCars = useCallback(async () => {
    
    try {

      console.log("loadMoreCars", loadingRef.current, moreDataAvailable);
      // console.log("loadMoreCars", loading, moreDataAvailable);
      if (loadingRef.current || !moreDataAvailable) return;

      setLoading(true);

      console.log("loadMoreCars");

      const newCars = await fetchCars(lastVisible);
      setCars(prevCars => [...prevCars, ...newCars]);
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

  useEffect(() => {
    fetchInitialCars();
    
  }, []);


  return (
    <View>

      <View style={{ marginTop: 5,
        height: 50, flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center' }}
        >
      <Button style={{ width: '40%' }}
       onPress={loadMoreCars} mode="contained">
        Filters
      </Button>
      <Button style={{ width: '40%' }} onPress={loadMoreCars} mode="contained" icon="map">
        Map
      </Button>
      </View>

    <FlatList
      style={{ marginBottom: 50}}
      data={cars}
      renderItem={({ item }) => (
        <Card style={styles.card}>
          <Card.Cover source={{ uri: item.imageURL }} />
          <Card.Content>
            <Title>{item.make} {item.model} {item.year}</Title>
            <Paragraph>{item.status}</Paragraph>
            
          </Card.Content>
          <Card.Actions>
            <Button mode='contained' icon='car-info' onPress={() => {
              router.push("client/cars/" + item.id);
            }}>Details</Button>
            <Button mode='contained' icon='car' onPress={() => {}}>Book</Button>
          
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

