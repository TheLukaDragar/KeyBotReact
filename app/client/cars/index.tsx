import firestore from '@react-native-firebase/firestore';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { ActivityIndicator, Avatar, Button, Card, Divider, Modal, Paragraph, Portal, Searchbar, TextInput, Title } from 'react-native-paper';
import { useAuth } from '../../../auth/provider';
import { View, getTheme } from '../../../components/Themed';

import database from '@react-native-firebase/database';
import * as Location from 'expo-location';
import { LocationObject } from 'expo-location';
import React from 'react';
import MapView, { Callout, Marker } from 'react-native-maps';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


const PAGE_SIZE = 10;  // Number of documents to fetch in a single request

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
  const insets = useSafeAreaInsets();


  const [filters, setFilters] = useState({
    distance: 30,
    minRating: 0,
  });


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

    if (snapshot.docs.length < PAGE_SIZE) {
      setMoreDataAvailable(false);

    }

    //set lastVisible for the next pagination
    setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
    console.log("set lastVisible", snapshot.docs[snapshot.docs.length - 1].data().model);


    const carss = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    //check if there is a car that has the current user as the current_userId
    //if there is set that car as the selected car

    const _inUseCar = carss.find(car => car.current_userId === user.uid);
    console.log("curent user car", selectedCar);


    if (_inUseCar) {
      setInUseCar(_inUseCar);
      //sort so that the selected car is first

      const reorderedCars = carss.filter(car => car.id !== _inUseCar.id);
      reorderedCars.unshift(_inUseCar);
      return reorderedCars;




    }
    else {
      setInUseCar(null);
    }

    return carss;







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
    console.log("fetchInitialCars", cars);
  };

  const [location, setLocation] = React.useState<LocationObject | null>(null);

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
    if (location) {
      // console.log("getDistance", location.coords, car.location, distance(location.coords, car.location));

      let d = distance(location.coords, car.location)

      //if distance is less than 1km return return in metres else return in km
      //retuen string
      if (d < 1000) {
        //round to 2dp
        return d.toFixed(2) + "m";


      } else {
        return (d / 1000).toFixed(2) + "km";

      }





    }
    return "N/A"
  }




  useEffect(() => {
    fetchInitialCars();

    (async () => {

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    })();



  }, []);


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






          //edit the list item
          const newCars = cars.map(item => {
            if (item.id === car.id) {
              return {
                ...item,
                current_userId: user.uid,
                current_rideId: rideRef.key,
                status: 'In use',
              };
            }
            return item;
          });

          setInUseCar(car);


          setCars(newCars);



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

  const [searchQuery, setSearchQuery] = useState('');

  const onChangeSearch = query => setSearchQuery(query);


  const [showMap, setShowMap] = useState(false);
  const mapRef = React.useRef<MapView>(null);

  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

  const toggleFilterModal = () => setIsFilterModalVisible(!isFilterModalVisible);

  const applyFilters = () => {
    // Apply your filters here
    toggleFilterModal();
  };

  useEffect(() => {
    console.log("showMap", showMap);

    //delay for 1s to allow map to render then animate to first car if there is one and selected is null
    if (showMap && location && location.coords && mapRef.current && cars.length > 0 && selectedCar === null) {
      //delay to allow map to render
      setTimeout(() => {
        if (mapRef.current && cars[0].location && cars[0].location.latitude && cars[0].location.longitude) {
          console.log("animateToRegion", cars[0].location.latitude, cars[0].location.longitude);
          mapRef.current.animateCamera({
            center: {
              latitude: cars[0].location.latitude,
              longitude: cars[0].location.longitude,
            },
            zoom: 15,
          });
          setSelectedCar(cars[0]);
        }
      }, 1000);

    }
  }
    , [showMap]);


  const [selectedCar, setSelectedCar] = useState(null);

  const [inUseCar, setInUseCar] = useState<any>(null);

  useEffect(() => {
    console.log("location", location);
  }, [location]);

  const theme = getTheme();






  return (
    <View style={{ flex: 1,paddingTop: insets.top,
      paddingBottom: insets.bottom,
      paddingLeft: insets.left,
      paddingRight: insets.right, }}>
      {!showMap ? (
        <><Animated.View style={styles.container}>
          <Title
            style={{
              fontSize: 30, fontWeight: "800", color: theme.text, flex: 1,

              marginRight: 10, // You can adjust the margin as needed
              borderRadius: 30,
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 10,
              marginLeft: 10,
            }}
          >{
            inUseCar ? "Your Car" : "Find a Car"
          }</Title>
          <Button
            style={styles.filterButton}
            icon="filter"
            onPress={toggleFilterModal}

            mode="contained">

            Filters
          </Button>
        </Animated.View></>
      ) : null}

      <Portal>
        <Modal
          visible={isFilterModalVisible}
          onDismiss={toggleFilterModal}
          contentContainerStyle={styles.modalContainer}
        >
          <Card style={styles.filterModal}>
            {/* Your filter options go here */}
            <Title style={styles.modalTitle}>Filter Cars</Title>
            {/* Example filter option */}
            <View style={styles.filterOption}>

              <Paragraph>Distance:</Paragraph>
              <TextInput

                label="Maximum distance (km)"
                keyboardType="numeric"
                value={filters.distance.toString()}
                onChangeText={(text) => setFilters({ ...filters, distance: parseInt(text) })}

              // Implement further logic to handle distance filter
              />







            </View>
            {/* Add other filter options as needed */}
            <Button mode="contained" onPress={applyFilters}>Apply Filters</Button>
          </Card>
        </Modal>
      </Portal>

      {showMap ? (
        // Render your full map view here
        <Animated.View style={styles.fullMapContainer} >
          {location ? (

            <>
              {selectedCar ? (
                <Animated.View  style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  height: 180,
                  zIndex: 1,
                  backgroundColor: 'transparent',
                  marginRight: 64,
                  marginLeft: 12,
                  marginTop: 12,

                }}
                >
                  <Card style={[styles.card, {
                    margin: 0

                  }

                  ]}

                    onPress={() => {
                      if (mapRef.current && selectedCar.location && selectedCar.location.latitude && selectedCar.location.longitude) {
                        mapRef.current.animateCamera({
                          center: {
                            latitude: selectedCar.location.latitude,
                            longitude: selectedCar.location.longitude,
                          },
                          zoom: 18,
                        });
                      }
                    }
                    }


                  >
                    <View style={styles.cardLayout}>
                      <Card.Cover style={styles.cardImage} source={{ uri: selectedCar.imageURL }} />
                      <View style={styles.textContainer}>
                        <Title style={styles.title}>{selectedCar.make} {selectedCar.model} {selectedCar.year}</Title>
                        <Paragraph style={styles.paragraph}>{selectedCar.status}</Paragraph>
                        <Paragraph style={styles.paragraph}>License Plate: {selectedCar.licensePlate}</Paragraph>
                        <Paragraph style={styles.paragraph}>Rating: {selectedCar.rating}</Paragraph>


                      </View>
                    </View>

                    <View style={styles.cardBottom}>
                      <Paragraph style={styles.distance}>Distance: {getDistance(selectedCar)}</Paragraph>
                      <Card.Actions style={styles.cardActions}>
                        <Button
                          mode='contained'
                          icon='car'
                          onPress={() => {
                            rideCar(selectedCar);
                          }}>
                          Ride
                        </Button>
                      </Card.Actions>
                    </View>
                  </Card>
                </Animated.View>

              ) : null}

              <MapView
                style={styles.map}
                ref={mapRef}
                initialRegion={{
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                  latitudeDelta: 0.0922 / 2,
                  longitudeDelta: 0.0421 / 2,
                }}
                userLocationAnnotationTitle="My Location"
                followsUserLocation={true}
                loadingEnabled={true}
                showsUserLocation={true}
              >
                {cars.map((car) => car.location && car.location.latitude && car.location.longitude ? (
                  <Marker
                    key={car.id}
                    coordinate={{
                      latitude: car.location.latitude,
                      longitude: car.location.longitude,
                    }}
                    onPress={() => {
                      setSelectedCar(car);
                    }}
                  >
                    <Callout style={styles.calloutStyle}
                      onPress={() => {
                        setSelectedCar(car);
                      }}
                    >
                      <View style={styles.markerText}>
                        <Avatar.Icon icon="car" size={32} />
                        <Title style={styles.markerTitle}>{car.make} {car.model} {car.year}</Title>
                      </View>
                    </Callout>
                  </Marker>
                ) : null
                )}
              </MapView></>
          ) : (
            <><Title>Waiting for location...</Title>
              <ActivityIndicator style={styles.loader} /></>
          )}
        </Animated.View>
      ) : (


        <Animated.FlatList 
          // style={{ marginBottom: 50 }}
          data={cars}
          renderItem={({ item }) => (
            <Card style={styles.card} 
            >

              
              
              <View style={styles.cardLayout}>
                <Card.Cover style={styles.cardImage} source={{ uri: item.imageURL }} />
                <View style={styles.textContainer}>
                  <Title style={styles.title}>{item.make} {item.model} {item.year}</Title>
                  <Paragraph style={styles.paragraph}>{item.status}</Paragraph>
                  <Paragraph style={styles.paragraph}>License Plate: {item.licensePlate}</Paragraph>
                  <Paragraph style={styles.paragraph}>Rating: {item.rating}</Paragraph>
                  {/* <Paragraph style={styles.paragraph}>current_userId: {item.current_userId}</Paragraph> */}


                </View>
              </View>

              <View style={styles.cardBottom}>
                <Paragraph style={styles.distance}>Distance: {getDistance(item)}</Paragraph>
                <Card.Actions style={styles.cardActions}>
                  <Button
                    mode='contained'
                    icon='car'
                    disabled={(item.current_userId !== null && item.current_userId !== undefined) || inUseCar !== null}
                    onPress={() => {
                      rideCar(item);
                    }}>
                    Ride
                  </Button>

                  {item.id === inUseCar?.id ? (
                    

                    <Button
                      mode='contained'
                      icon='car-info'
                      onPress={() => {
                        router.push("ride/" + item.current_rideId + "/progress");
                      }}>
                      View
                      </Button>
                      
                  
                  ) : null} 





                </Card.Actions>
              </View>
            </Card>

          )}
          keyExtractor={item => item.id}
          // onEndReached={loadMoreCars}
          onEndReachedThreshold={0.3}
          onMomentumScrollBegin={() => { this.onEndReachedCalledDuringMomentum = false; }}
          onEndReached={() => {
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
      )}

      <Button
        style={styles.mapButton}
        icon={showMap ? "format-list-bulleted-square" : "map"}
        mode='contained'
        contentStyle={styles.buttonContent}
        onPress={() => {
          setShowMap(!showMap);

        }}
      >
        {showMap ? "List" : "Map"}

      </Button>


    </View>
  );

}

const styles = StyleSheet.create({
  // card: {
  //   marginVertical: 8,
  //   marginHorizontal: 16,
  // },
  loader: {
    marginVertical: 10,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
  },
 
  filterButton: {
    justifyContent: 'center',
    borderRadius: 30, // Match this to the search bar's borderRadius
    padding: 8,
    // Add shadow or other styles as needed
  },
  mapButton: {
    position: 'absolute',
    //center the button on bottom third of screen 
    left: '50%',
    bottom: '5%',
    transform: [{ translateX: -50 }], // Adjust this value to match half of your button's width

    borderRadius: 30, // Match this to the search bar's borderRadius

    // Add shadow or other styles as needed
  },
  buttonContent: {

  },
  map: {
    width: '100%',
    height: '100%',

  },
  markerText: {
    flexDirection: 'row',
    alignItems: 'center', // This aligns the icon and the title vertically
    backgroundColor: 'transparent',

  },
  markerTitle: {
    fontSize: 15,
    marginLeft: 5, // To provide some spacing between the icon and the title
    color: 'black'


  },
  card: {
    margin: 8,
    elevation: 1,
  },
  cardLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: 'transparent',
  },
  cardImage: {
    width: '50%', // Set this to your desired width
    height: 120, // Set this to your desired height
    marginRight: 16,
    marginLeft: 16,
    marginTop: 16,
    flex: 0,
  },
  textContainer: {
    flex: 1, // Take up remaining space
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  title: {
    fontWeight: 'bold',
  },
  paragraph: {
    marginBottom: 2,
  },

  distanceContainer: {
    alignSelf: 'flex-start', // Align self to the start of the flex container
    paddingVertical: 8, // Add padding at the top and bottom if needed
    paddingHorizontal: 16, // Align text left with the card padding
  },

  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',

  },
  distance: {
    fontSize: 14,
    marginLeft: 16, // This aligns the distance text with the card's left content
  },
  cardActions: {
  },
  filterModal: {
    // Style your modal
    padding: 10,
  },
  modalTitle: {

  },
  filterOption: {
    // Style your individual filter option
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    margin: 10,
    backgroundColor: 'transparent',
  },
  modalContainer: {
    padding: 10, height: '60%'
  },


});

