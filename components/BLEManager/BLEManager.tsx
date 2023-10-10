// ==============================================
// Void top-level component to manage BLE devices
// ==============================================
import React, { useEffect, useState } from 'react';
import { BleManager, Device, Subscription } from 'react-native-ble-plx';
import { useAppDispatch, useAppSelector } from '../../data/hooks';
import {
    disconnectDevice,
    selectConnectedDevice,
    setAdapterState,
    setLocationPermissionStatus,
    connectDeviceById,
    selectBle,
} from '../../ble/bleSlice';
import * as Location from 'expo-location';
import Toast from 'react-native-root-toast';
import bleServices from '../../constants/bleServices';
import { ConnectionState } from '../../ble/bleSlice.contracts';

const bleManager = new BleManager();
let device: Device;

const BLEManager = () => {
    const [subscriptions, setSubscriptions] = useState<Array<Subscription>>([]);
    const connectedDevice = useAppSelector(selectConnectedDevice);
    const dispatch = useAppDispatch();
    const ble = useAppSelector(selectBle);
    const toast = Toast;

    const disconnectCallback = () => {
        console.log('BLEManager: disconnectCallback triggered');

        //check if alredy disconecting
        if (ble.deviceConnectionState.status == ConnectionState.DISCONNECTING || ble.deviceConnectionState.status == ConnectionState.DISCONNECTED) {
            console.log('BLEManager: disconnectCallback: already disconnecting');
            return;
        }
        
        if (connectedDevice) dispatch(disconnectDevice());
        toast.show('Disconnected from device');
    }

    const checkDevices = async () => {
        console.log('BLEManager: checkDevices triggered');
        if (connectedDevice && !device) {
            const devices = await bleManager.connectedDevices([bleServices.sample.SAMPLE_SERVICE_UUID]);
            device = devices[0];
            if (device) {
                const subscription = device.onDisconnected(disconnectCallback);
                setSubscriptions(prevState => [...prevState, subscription]);
            }
            else {
                console.log('BLEManager: checkDevices: device not found');
            }
        }
    }

    // BLE Adapter State Manager
    useEffect(() => {
        const subscription = bleManager.onStateChange((state) => {
            dispatch(setAdapterState({ adapterState: state }));
            setSubscriptions(prevState => [...prevState, subscription])
        }, true);
        return function cleanup() {
            // Remove all subscriptions when manager unmounts
            subscriptions.map(_subscription => {
                _subscription.remove();
                return true;
            });
            setSubscriptions([]);
        };
    }, []);

    useEffect(() => {
        // Manage device connection changes if its not in demo mode
        if(!ble.use_demo_device) {
        checkDevices();
    }
    }, [connectedDevice])

    // Permissions manager
    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            dispatch(setLocationPermissionStatus({ status }));
        })();
    }, []);


    return null;
};

export default BLEManager;
