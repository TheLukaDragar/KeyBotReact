import { FlatList, StyleSheet, TouchableOpacity } from 'react-native';

import EditScreenInfo from '../../components/EditScreenInfo';
import { Text, View } from '../../components/Themed';
import { Button } from 'react-native-paper';
import {useRouter} from 'expo-router';
import { useAppDispatch, useAppSelector } from '../../data/hooks';

import secureReducer, { removeToken} from '../../data/secure';
import { useGetAuthMsgQuery, useGetMeQuery, useLazyGetMyBoxesQuery,useConnectBoxMutation, useLazyGetBoxesQuery, isFetchBaseQueryError, isErrorWithMessage } from '../../data/api';
import { useEffect, useState } from 'react';

import * as Location from 'expo-location';
import { LocationObject } from 'expo-location';
//import { BLEServiceInstance } from '../../ble/BLEService';
import {scanBleDevices,stopDeviceScan,clearScannedDevices} from '../../ble/bleSlice';

import Layout from'../../constants/Layout';
import { IBLEDevice } from '../../ble/bleSlice.contracts';


export default function TabTwoScreen() {

  const router = useRouter();

  const secure = useAppSelector((state) => state.secure);
  const dispatch = useAppDispatch();

  const [location, setLocation] = useState<LocationObject | null>(null);
  const [ErrorMessage, setError] = useState("");


  const ble = useAppSelector((state) => state.ble);
  const scannedDevices = useAppSelector((state) => state.ble.deviceScan.devices);
 // const bleService =  BLEServiceInstance;

  const {
    data: user,
    isLoading,
    isSuccess,
    isError,
    error,
    refetch
  } = useGetMeQuery();

  const [getBoxes,{ data:boxes,isLoading: IsLoadingMsg, error : errorBox, isError : isErrorBox}] = useLazyGetBoxesQuery();
  const [isScanning, setIsScanning] = useState(false);
  const [buttonText, setButtonText] = useState('Start Scan');





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

  async function getBoxx() {
    try {
      const msg = await getBoxes().unwrap();
  
      console.log(msg);
  
    
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

      {isSuccess && <Text>{user?.authUser.username}</Text>}

     {location && <Text>latitude: {location.coords.latitude}</Text>}
      {location && <Text>longitude: {location.coords.longitude}</Text>}
      {ErrorMessage && <Text>{ErrorMessage}</Text>}



      
     


      <Button
        onPress={() => getBoxx()}
        mode="contained"
        style={{marginTop: 20, padding: 10}}>
        get my boxes
      </Button>

      <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
    </View>
  );
}

interface DeviceItemProps {
  device: IBLEDevice | null
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
});
