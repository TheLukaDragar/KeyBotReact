import  { useState,useEffect } from 'react';
import { View, Text, FlatList } from 'react-native';
import {PermissionsAndroid, Platform} from 'react-native';
import * as thisDevice from 'expo-device';


import {
  BleErrorCode,
  BleManager,
  Characteristic,
  Device,
} from 'react-native-ble-plx';
interface Props {
  // Declare the type of the props here
  
}


const BluetoothScanner: React.FC<Props> = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  type VoidCallback = (result: boolean) => void;

  const requestPermissions = async (cb: VoidCallback) => {
    if (Platform.OS === 'android') {
      
      const apiLevel =  thisDevice.platformApiLevel;
      //null check for apiLevel
      alert(apiLevel);


      if (apiLevel != null && apiLevel < 31) {  //TODO apiLevel is null on my device
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'Bluetooth Low Energy requires Location',
            buttonNeutral: 'Ask Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        ).catch(err => {
          console.log(err);
        });

        cb(granted === PermissionsAndroid.RESULTS.GRANTED);
      } else {

        if (apiLevel == null) {
          console.log("apiLevel is null");
        }
        // Android 12+ requires multiple permissions
        const result = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        const isGranted =
          result['android.permission.BLUETOOTH_CONNECT'] ===
            PermissionsAndroid.RESULTS.GRANTED &&
          result['android.permission.BLUETOOTH_SCAN'] ===
            PermissionsAndroid.RESULTS.GRANTED &&
          result['android.permission.ACCESS_FINE_LOCATION'] ===
            PermissionsAndroid.RESULTS.GRANTED;

        cb(isGranted);
      
      }
    } else {
      //ios permissions are handled by the library itself so we just return true here 
      cb(true);
    }
  };

  const startScan = () => {
    requestPermissions(granted => {
        if (granted) {
            const bleManager = new BleManager();

            //scan for 10 seconds



            bleManager.startDeviceScan(null, null, (error, device) => {
                console.log('Scanning...');
                if (error) {
                  //check BleError
                  if (error.errorCode === BleErrorCode.BluetoothUnauthorized) {
                      //request for permission
                      console.log('Bluetooth is not authorized');
                      return;
                    
                  }
                  if (error.errorCode === BleErrorCode.BluetoothPoweredOff) {
                      console.log('Bluetooth is powered off');
                      return;
                  }
                  if (error.errorCode === BleErrorCode.ScanStartFailed) {
                      console.warn('Scan start failed  - make sure ble perms is enabled on the device');
                      return;
                  }
                  
                  console.warn(error, error.errorCode);
                  return;
                }
          
                // Add the device to the list if it's not already in the list
                if (device) {
                    
                    if (!devices.some(d => d.id === device.id)) {

                      console.log('Found device: ', device.id);
                      for (let i = 0; i < devices.length; i++) {
                        console.log(devices[i].id);

                      }
                      
                      //console.log(device.id);
                        setDevices([...devices, device]);
                    }
                    }
              });

        }
        else {
            console.log('Location permission not granted');
        }
    });
    };


  useEffect(() => {
    startScan();

  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Bluetooth Devices:</Text>
      <FlatList
        data={devices}
        renderItem={({ item }) => <Text
        style={{fontSize: 20,color: 'white'}}
        >{item.id}</Text>}
        keyExtractor={item => item.id}
        
        
      />
    </View>
  );
};

export default BluetoothScanner;
