import React, { useEffect, useState } from 'react';
import { FlatList, TouchableOpacity,StyleSheet } from 'react-native';
import { useAppDispatch, useAppSelector } from '../../data/hooks';
import {
    connectDeviceById, scanBleDevices,
    selectAdapterState,
    selectConnectedDevice,
    selectScannedDevices, stopDeviceScan
} from '../../ble/bleSlice';
import { IBLEDevice } from '../../ble/bleSlice.contracts';
import { Text, View } from '../../components/Themed';

import { MaterialIcons } from '@expo/vector-icons';
import Toast from 'react-native-root-toast';
import { Button } from 'react-native-paper';
import Layout from'../../constants/Layout';




interface DeviceItemProps {
    device: IBLEDevice | null
}

const DeviceItem = (props: DeviceItemProps) => {
    const { device } = props;
    const [isConnecting, setIsConnecting] = useState(false);
    const connectedDevice = useAppSelector(selectConnectedDevice)
    const dispatch = useAppDispatch();

    const toast = Toast

    const connectHandler = async () => {
        if (isConnecting) return;
        if (device?.id){
            setIsConnecting(true);
            const result = await dispatch(connectDeviceById({ id: device?.id }))
            if (result.meta.requestStatus === 'fulfilled') {
                toast.show(
                    'Connection successful'
                );
            }
            else if (result.meta.requestStatus === 'rejected') {
                toast.show('Connection unsuccessful'
                );
            }
            setIsConnecting(false);
        }
        else {
            toast.show(
            'Connection unsuccessful (No ID)');
        }
    }

    return (
        <TouchableOpacity style={{  width: Layout.window.width*0.8}} onPress={connectHandler}>
            <Text style={{ paddingVertical: 10,
            color: connectedDevice?.id === device?.id ? 'green' : 'white'
            
            
            }}>{device?.name + ' ' + device?.id}</Text>
        </TouchableOpacity>
    )
}

const BLEScreen = () => {
    const [buttonText, setButtonText] = useState('Start Scan');
    const [isScanning, setIsScanning] = useState(false);
    const [iconName, setIconName] = useState('bluetooth-disabled');
    const [stateText, setStateText] = useState('');
    const bleDevice = useAppSelector(selectConnectedDevice);
    const adapterState = useAppSelector(selectAdapterState);
    const scannedDevices = useAppSelector(selectScannedDevices).devices;
    const toast = Toast
    const dispatch = useAppDispatch();

    const scanPressHandler = () => {
        if (isScanning) {
            dispatch(stopDeviceScan({}));
            setIsScanning(false);
            setButtonText('Start Scan');
        }
        else if (adapterState.toLowerCase() === 'poweredon') {
            dispatch(scanBleDevices());
            setIsScanning(true);
            setButtonText('Stop Scan');
        }
        else {
            toast.show(stateText);
        }
    }

    useEffect(() => {
        if (bleDevice) {
            setIconName('bluetooth-connected');
            setStateText('Connected');
            dispatch(stopDeviceScan({}));
            setIsScanning(false);
            setButtonText('Start Scan');
        }
        else if (isScanning) {
            setStateText('Scanning...')
        }
        else {
            switch (adapterState.toLowerCase()) {
                case 'poweredoff':
                    setIconName('bluetooth-disabled');
                    setStateText('Bluetooth Disabled');
                    break;
                case 'poweredon':
                    setIconName('bluetooth');
                    setStateText('Ready To Connect');
                    break;
                default:
                    setStateText(adapterState);
                    setIconName('bluetooth-disabled');
                    break;
            }
        }
    }, [adapterState, bleDevice, isScanning]);

    return (
        <View style={styles.container}>
            
            <View >
                <View >
                    <Text >{stateText}</Text>
                </View>
            </View>
            {(scannedDevices?.length > 0) &&
                <Text style={{ color: 'grey', textAlign: 'center' }}>Select a device below to connect.</Text>
            }
            <FlatList
                style={{ height: '100%' }}
                contentContainerStyle={{ width: '100%', justifyContent: 'center' }}
                data={scannedDevices}
                renderItem={({ item }) => (
                    <DeviceItem device={item} />
                )}
                />
            <Button onPress={scanPressHandler} loading={isScanning} style={{ marginBottom: 10 }} mode="contained">{buttonText}</Button>
        </View>
    );

    
};

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



export default BLEScreen;
