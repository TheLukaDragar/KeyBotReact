import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { Buffer } from 'buffer';
import CryptoES from 'crypto-es';
import Constants from 'expo-constants';
import { BleManager, Device } from 'react-native-ble-plx';
import { RootState } from '../data/store';
import { ConnectionState, KeyBotCommand, KeyBotState, MidSensorState, NetworkState, SensorState, authenticateDeviceParams, bleSliceInterface, connectDeviceByIdParams, keybotCommandParams, manualMotorControlParams, testbuttonParams, toBLEDeviceVM } from './bleSlice.contracts';
import { PermissionsAndroid, Platform } from 'react-native';
import * as thisDevice from 'expo-device';

const bleManager = new BleManager();
let device: Device;
let logBuffer: string = "";
export const demoDevice = {
    id: 'F9:E0:C3:CE:C3:14',
    name: 'BOX_000000000000',
    rssi: 0,
    solicitedServiceUUIDs: [],
    localName: 'BOX_000000000000',

};
const stopScan = () => {
    console.log('Stopping scan');
    bleManager.stopDeviceScan();
};
type VoidCallback = (result: boolean) => void;

const requestPermissions = async (cb: VoidCallback) => {
    if (Platform.OS === 'android') {

        const apiLevel = thisDevice.platformApiLevel;
        //null check for apiLevel
        //alert(apiLevel);


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


export const scanBleDevices = createAsyncThunk('ble/scanBleDevices', async (_, thunkAPI) => {
    // Check if demo mode is on from the global state.
    const state = thunkAPI.getState() as RootState;
    const demoModeOn = state.ble.use_demo_device;
    // If demo mode is on, then we don't need to scan for devices.
    //just add a demo device to the list
    if (demoModeOn) {
        console.log('Demo mode on, adding demo device in scanBleDevices');
        thunkAPI.dispatch(addScannedDevice({ device: demoDevice }));
        return;
    }

    
    const granted = await new Promise(resolve => requestPermissions(resolve));
    if (!granted) {
        throw new Error('Ble permission not granted');
    }



    //disconnect if connected
    if (device) {
        await device.cancelConnection();
    }
    console.log('Scanning');
    try {
        bleManager.startDeviceScan(null, null, async (error, scannedDevice) => {
            if (error) {
                console.log('startDeviceScan error: ', error);
                throw new Error(error.toString());
            }
            if (scannedDevice) {
                thunkAPI.dispatch(addScannedDevice({ device: toBLEDeviceVM(scannedDevice) }));
            }
        });
    } catch (error: any) {
        throw new Error(error.toString);
    }
});



export const authenticate = createAsyncThunk('ble/authenticate', async (params: authenticateDeviceParams, thunkAPI) => {
    //get device
    const state = thunkAPI.getState() as RootState;
    const connectedDevice = state.ble.connectedDevice;
    const demoModeOn = state.ble.use_demo_device;

    if (!connectedDevice) {
        throw new Error('No connected device');
    }

    if (demoModeOn) {
        //dela
        await new Promise(resolve => setTimeout(resolve, 200));
        console.log('Demo mode on, skipping authentication');
        return true;
    }


    let message = params.solved_challenge.substring(0, 16);
    let encoded = Buffer.from(message).toString('base64');
    console.log("encoded: " + encoded);
    let writeCharacteristic = await bleManager.writeCharacteristicWithResponseForDevice(connectedDevice.id, '00001815-0000-1000-8000-00805f9b34fb', '00002a3d-0000-1000-8000-00805f9b34fb', encoded);
    if (writeCharacteristic === null) {
        throw new Error("Characteristic not found");
    }
    console.log("characteristic: " + writeCharacteristic.uuid);
    //write the second part of the message
    message = params.solved_challenge.substring(16, 32);
    //encode to base64
    encoded = Buffer.from(message).toString('base64');
    console.log("encoded 2: " + encoded);
    writeCharacteristic = await bleManager.writeCharacteristicWithResponseForDevice(connectedDevice.id, '00001815-0000-1000-8000-00805f9b34fb', '00002a3d-0000-1000-8000-00805f9b34fb', encoded);
    if (writeCharacteristic === null) {
        throw new Error("Characteristic not found");
    }
    //read the auth characteristic
    let readCharacteristic = await bleManager.readCharacteristicForDevice(connectedDevice.id, '00001815-0000-1000-8000-00805f9b34fb', '00002a3d-0000-1000-8000-00805f9b34fc');
    if (readCharacteristic === null) {
        throw new Error("Characteristic not found");
    }
    let value = readCharacteristic.value;
    let auth = Buffer.from(value!, 'base64').toString('ascii');
    console.log("authenticated: " + auth ? "true" : "false");

    if (auth === '1') {
        return true;
    }
    else {
        console.log("Authentication failed KeyBot says: " + auth);
        throw new Error("Authentication failed");
    }

});

export const connectDeviceById = createAsyncThunk('ble/connectDeviceById', async (params: connectDeviceByIdParams, thunkAPI) => {

    const { id } = params; //mac adress
    const state = thunkAPI.getState() as RootState;

    const demoModeOn = state.ble.use_demo_device;
    // If demo mode is on use the demo device.
    if (demoModeOn) {
        console.log('Demo mode on, using demo device in connectDeviceById');
        thunkAPI.dispatch(setConnectionState({ status: ConnectionState.SEARCHING }));
        await new Promise(resolve => setTimeout(resolve, 500));
        thunkAPI.dispatch(setConnectionState({ status: ConnectionState.CONNECTING }));
        await new Promise(resolve => setTimeout(resolve, 500));


        return toBLEDeviceVM(demoDevice);
    }

    stopScan();

    //searching
    thunkAPI.dispatch(setConnectionState({ status: ConnectionState.SEARCHING }));


    device = await bleManager.connectToDevice(id)


    //connected
    thunkAPI.dispatch(setConnectionState({ status: ConnectionState.CONNECTING }));
    const deviceChars = await bleManager.discoverAllServicesAndCharacteristicsForDevice(id);
    console.log('Discovered all services and characteristics');
    const services = await deviceChars.services();
    console.log('Got services');
    const serviceUUIDs = services.map(service => service.uuid);
    console.log('Got serviceUUIDs');
    console.log('all done');
    //print name and id
    console.log('Device name: ', device.name);
    console.log('Device id: ', device.id);

    return toBLEDeviceVM({ ...device, serviceUUIDs });

});



export const getChallenge = createAsyncThunk<string, void, { state: RootState }>(
    'ble/getChallenge',
    async (_, thunkAPI) => {
        try {
            const state = thunkAPI.getState();
            const connectedDevice = state.ble.connectedDevice;
            const isDemoDevice = state.ble.use_demo_device;

            if (connectedDevice === null) {
                throw new Error("No connected device");
            }

            if (isDemoDevice) {
                const demo_challenge = CryptoES.lib.WordArray.random(16).toString().substring(0, 16);
                console.log("demo challenge: " + demo_challenge);
                return demo_challenge;
            }

            let characteristic = await bleManager.readCharacteristicForDevice(connectedDevice.id, '00001815-0000-1000-8000-00805f9b34fb', '00002a3d-0000-1000-8000-00805f9b34fa').catch((error: Error) => {
                console.log("readCharacteristicForDevice error: " + error);
                throw new Error("readCharacteristicForDevice error: " + error.toString());
            });

            if (characteristic === null) {
                throw new Error("Characteristic not found");
            }

            let challenge = Buffer.from(characteristic.value!, 'base64').toString('ascii').substring(0, 16);
            console.log("challenge: " + challenge);

            return challenge;

        } catch (error: any) {
            throw new Error(error.toString);
        }
    }
);






export const subscribeToEvents = createAsyncThunk('ble/subscribeToEvents', async (_, thunkAPI) => {
    try {


        const state = thunkAPI.getState() as RootState;
        const connectedDevice = state.ble.connectedDevice;
        const isDemoDevice = state.ble.use_demo_device;

        if (connectedDevice === null) {
            throw new Error('No connected device');
        }
        if (isDemoDevice) {
            return;
        }

        bleManager.monitorCharacteristicForDevice(
            connectedDevice.id,
            '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
            '6e400003-b5a3-f393-e0a9-e50e24dcca9e',
            (error, characteristic) => {
                if (error) {
                    console.log('onLog error: ' + error, error.errorCode);
                    return;
                } else {
                    let chunk = Buffer.from(characteristic?.value!, 'base64').toString('ascii');
                    logBuffer += chunk;

                    // Split logs based on newline
                    const logs = logBuffer.split('\n');

                    // If there is a complete log (with a newline), dispatch the addLog action
                    while (logs.length > 1) {
                        const log = logs.shift();
                        console.log('log: ' + log);
                        thunkAPI.dispatch(addLog(log));
                    }

                    // The last element in the logs array is either an incomplete log or an empty string
                    logBuffer = logs[0];
                }
            },
            'log'
        );

        bleManager.monitorCharacteristicForDevice(connectedDevice.id, '00001815-0000-1000-8000-00805f9b34fb', '00002a3d-0000-1000-8000-00805f9b34f2', (error, characteristic) => {
            if (error) {
                console.log("onMidSensorsStatus error: " + error, error.errorCode);
                return;
            }
            else {
                let status = Buffer.from(characteristic?.value!, 'base64').toString('ascii');
                console.log("midSensorsStatus: " + status);
                thunkAPI.dispatch(updateMidSensorsStatus({ status: status }));
            }
        }, 'midSensorsStatus');
        //read it
        bleManager.readCharacteristicForDevice(connectedDevice.id, '00001815-0000-1000-8000-00805f9b34fb', '00002a3d-0000-1000-8000-00805f9b34f2').then((characteristic) => {
            if (characteristic === null) {
                console.log("midSensorsStatus Characteristic not found");
                return;
            }
            let status = Buffer.from(characteristic.value!, 'base64').toString('ascii');
            console.log("midSensorsStatus: " + status);
            thunkAPI.dispatch(updateMidSensorsStatus({ status: status }));
        }).catch((error) => {
            console.log("readCharacteristicForDevice error: " + error);
        });


        //00002a3d-0000-1000-8000-00805f9b34f4 
        bleManager.monitorCharacteristicForDevice(connectedDevice.id, '00001815-0000-1000-8000-00805f9b34fb', '00002a3d-0000-1000-8000-00805f9b34f4', (error, characteristic) => {
            if (error) {
                console.log("onKeyBotState error: " + error, error.errorCode);
                return;
            }
            else {
                let status = Buffer.from(characteristic?.value!, 'base64').toString('ascii');
                //console.log("keyBotState: " + status);
                thunkAPI.dispatch(updateKeyBotState({ status: status }));
            }

        }, 'keyBotState');

        //battery level 00002a3d-0000-1000-8000-00805f9b34f5
        bleManager.monitorCharacteristicForDevice(connectedDevice.id, '00001815-0000-1000-8000-00805f9b34fb', '00002a3d-0000-1000-8000-00805f9b34f5', (error, characteristic) => {
            if (error) {
                console.log("onBatteryLevel error: " + error, error.errorCode);
                return;
            }
            else {

                //type float
                let buffer = Buffer.from(characteristic?.value!, 'base64');
                let status = buffer.readFloatLE(0);
                console.log("batteryLevel: " + status);
                thunkAPI.dispatch(updateBatteryLevel({ batteryLevel: status }));

            }
        }, 'batteryLevel');
        //read it
        bleManager.readCharacteristicForDevice(connectedDevice.id, '00001815-0000-1000-8000-00805f9b34fb', '00002a3d-0000-1000-8000-00805f9b34f5').then((characteristic) => {
            if (characteristic === null) {
                console.log("batteryLevel Characteristic not found");
                return;
            }

            let buffer = Buffer.from(characteristic?.value!, 'base64');
            let status = buffer.readFloatLE(0);

            console.log("batteryLevel: " + status);
            thunkAPI.dispatch(updateBatteryLevel({ batteryLevel: status }));
        }).catch((error) => {
            console.log("readCharacteristicForDevice error: " + error);
        });


    } catch (error: any) {
        console.log("subscribeToEvents error: " + error);
        throw Error("subscribeToEvents error: " + error);


    }
}
);

export const testbutton = createAsyncThunk('ble/testbutton', async (params: testbuttonParams, thunkAPI) => {
    //write test characteristic 00002a3d-0000-1000-8000-00805f9b34f0
    bleManager.writeCharacteristicWithResponseForDevice(device.id, '00001815-0000-1000-8000-00805f9b34fb', '00002a3d-0000-1000-8000-00805f9b34f0', 'AQ==').then((characteristic) => {
        if (characteristic === null) {
            console.log("testbutton Characteristic not found");
            return;
        }
        let status = Buffer.from(characteristic.value!, 'base64').toString('ascii');
        console.log("testbutton: " + status);
        return status;
    }).catch((error) => {
        console.log("testbutton error: " + error);
        return error;
    }
    );
});
export const manualMotorControl = createAsyncThunk('ble/manualMotorControl', async (params: manualMotorControlParams, thunkAPI) => {
    //write to 00002a3d-0000-1000-8000-00805f9b34f1
    const command = params.command;
    //to base64
    const commandBase64 = Buffer.from(command).toString('base64');
    bleManager.writeCharacteristicWithResponseForDevice(device.id, '00001815-0000-1000-8000-00805f9b34fb', '00002a3d-0000-1000-8000-00805f9b34f1', commandBase64).then((characteristic) => {
        if (characteristic === null) {
            console.log("manualMotorControl Characteristic not found");
            return;
        }
        let status = Buffer.from(characteristic.value!, 'base64').toString('ascii');
        console.log("manualMotorControl: " + status);
        return status;
    }
    ).catch((error) => {
        console.log("manualMotorControl error: " + error);
        return error;
    }
    );
});

//keybot command
export const keyBotCommand = createAsyncThunk('ble/keyBotCommand', async (params: keybotCommandParams, thunkAPI) => {

    const state = thunkAPI.getState() as RootState;
    const connectedDevice = state.ble.connectedDevice;
    const isDemoDevice = state.ble.use_demo_device;

    if (connectedDevice === null) {
        throw new Error('No connected device');
    }

    //00002a3d-0000-1000-8000-00805f9b34f3
    const command = params.command;

    if (isDemoDevice) {
        console.log("keyBotCommand: " + command);
        if (command == KeyBotCommand.KEYBOT_PRESS_LEFT) {
            thunkAPI.dispatch(updateKeyBotState({ status: KeyBotState.KEYBOT_PRESSING_LEFT }));
            //run the timer
            setTimeout(() => {
                thunkAPI.dispatch(updateKeyBotState({ status: KeyBotState.KEYBOT_RETURNING_TO_CENTER_FROM_LEFT }));
            }, 2000);
            setTimeout(() => {
                thunkAPI.dispatch(updateKeyBotState({ status: KeyBotState.KEYBOT_STATE_IDLE }));

            }
                , 4000);

        }
        else if (command == KeyBotCommand.KEYBOT_PRESS_RIGHT) {
            thunkAPI.dispatch(updateKeyBotState({ status: KeyBotState.KEYBOT_PRESSING_RIGHT }));
            //run the timer
            setTimeout(() => {
                thunkAPI.dispatch(updateKeyBotState({ status: KeyBotState.KEYBOT_RETURNING_TO_CENTER_FROM_RIGHT }));

            }
                , 2000);
            setTimeout(() => {
                thunkAPI.dispatch(updateKeyBotState({ status: KeyBotState.KEYBOT_STATE_IDLE }));

            }
                , 4000);

        }



        return;

    }
    //to base64
    const commandBase64 = Buffer.from(command).toString('base64');
    bleManager.writeCharacteristicWithResponseForDevice(device.id, '00001815-0000-1000-8000-00805f9b34fb', '00002a3d-0000-1000-8000-00805f9b34f3', commandBase64).then((characteristic) => {
        if (characteristic === null) {
            console.log("keybotCommand Characteristic not found");
            return;
        }
        let status = Buffer.from(characteristic.value!, 'base64').toString('ascii');
        console.log("keybotCommand: " + status);
        return status;
    }
    ).catch((error) => {

        console.log("keybotCommand error: " + error);
        return error;
    }
    );
});


export const disconnectDevice = createAsyncThunk('ble/disconnectDevice', async (_, thunkAPI) => {

    //state
    const state = thunkAPI.getState() as RootState;
    const isDemoDevice = state.ble.use_demo_device;

    if (isDemoDevice) {
        console.log('Disconnecting from demo device');
        await new Promise(resolve => setTimeout(resolve, 200));
        return { isSuccess: true }
    }

    console.log('Disconnecting')
    if (device) {
        const isDeviceConnected = await device.isConnected();
        if (isDeviceConnected) {

            //cansel all listeners
            //batteryLevel keyBotState midSensorsStatus log 
            bleManager.cancelTransaction('batteryLevel');
            bleManager.cancelTransaction('keyBotState');
            bleManager.cancelTransaction('midSensorsStatus');
            bleManager.cancelTransaction('log');

            console.log('Disconnecting device');
            await device.cancelConnection();
            return { isSuccess: true }
        }
        else {
            console.log('Device is not connected');
            return { isSuccess: false }
            //throw new Error('No device connected');
        }
    }
    else {
        console.log('Device is undefined');
        throw new Error('Device is undefined.')
    }


});
const initialState: bleSliceInterface = {
    use_demo_device: Constants.expoConfig?.extra?.use_demo_device ?? false,
    adapterState: 'Unknown',
    deviceConnectionState: { status: ConnectionState.DISCONNECTED, error: '' },
    deviceScan: { devices: [], status: NetworkState.PENDING, error: '' },
    locationPermission: null,
    connectedDevice: null,
    logs: [],
    sensorStatus: { status: SensorState.PENDING, error: '' },
    midSensorsStatus: { sensor_1_status: MidSensorState.PENDING, sensor_2_status: MidSensorState.PENDING, error: '' },
    keyBotState: { status: KeyBotState.KEYBOT_STATE_IDLE, error: '', text: '' },
    batteryLevel: { level: 0.0, text: 'waiting' },
};
const bleSlice = createSlice({
    name: 'ble',
    initialState,
    reducers: {
        setDemoMode(state, action) {
            const { use_demo_device } = action.payload;
            state.use_demo_device = use_demo_device;
        },
        setAdapterState(state, action) {
            const { adapterState } = action.payload;
            state.adapterState = adapterState;
        },
        setLocationPermissionStatus(state, action) {
            const { status } = action.payload;
            state.locationPermission = status;
        },
        setConnectedDevice(state, action) {
            const { device } = action.payload;
            state.connectedDevice = device;
        },

        setConnectionState(state, action) {
            const { status } = action.payload;
            state.deviceConnectionState = { ...state.deviceConnectionState, status: status };
        },

        addScannedDevice(state, action) {
            const { device } = action.payload;
            const existingDevices = state.deviceScan.devices.filter(existingDevice => device.id !== existingDevice?.id);
            const updatedDevices = [device, ...existingDevices];
            console.log('updatedDevices', updatedDevices);

            if (!state.use_demo_device) {
                const sorted = updatedDevices.sort((a, b) => {
                    a.rssi = a.rssi || -100;
                    b.rssi = b.rssi || -100;
                    return a.rssi > b.rssi ? -1 : b.rssi > a.rssi ? 1 : 0;
                });
                state.deviceScan.devices = sorted;
            } else {
                state.deviceScan.devices = updatedDevices;
            }





        },
        clearScannedDevices(state, action) {
            state.deviceScan = { devices: [], status: NetworkState.PENDING, error: '' };
        },
        stopDeviceScan(state, action) {
            bleManager.stopDeviceScan();
        },
        addLog: (state, action) => {
            state.logs.push(action.payload);
            if (state.logs.length > 200) {
                state.logs.shift(); // Remove the oldest log if there are more than 200 logs
            }
        },
        updateKeySensorStatus(state, action) {
            const { status } = action.payload;
            if (status == "0") {
                state.sensorStatus = { status: SensorState.SENSOR_OK, error: '' };
            }
            else if (status == "1") {
                state.sensorStatus = { status: SensorState.SENSOR_ERROR, error: '' };
            }
            else {
                state.sensorStatus = { status: SensorState.SENSOR_ERROR, error: '' };
            }
        },
        updateMidSensorsStatus(state, action) {
            const { status } = action.payload;
            switch (status) {
                case "0":
                    // both sensors are released
                    state.midSensorsStatus.sensor_1_status = MidSensorState.RELEASED;
                    state.midSensorsStatus.sensor_2_status = MidSensorState.RELEASED;
                    break;
                case "1":
                    // sensor 1 is pressed
                    state.midSensorsStatus.sensor_1_status = MidSensorState.PRESSED;
                    state.midSensorsStatus.sensor_2_status = MidSensorState.RELEASED;
                    break;
                case "2":
                    // sensor 2 is pressed
                    state.midSensorsStatus.sensor_1_status = MidSensorState.RELEASED;
                    state.midSensorsStatus.sensor_2_status = MidSensorState.PRESSED;
                    break;
                case "3":
                    // both sensors are pressed
                    state.midSensorsStatus.sensor_1_status = MidSensorState.PRESSED;
                    state.midSensorsStatus.sensor_2_status = MidSensorState.PRESSED;
                    break;
                default:
                    console.warn(`Invalid status: ${status}`);
            }
        },
        updateKeyBotState(state, action) {
            const { status } = action.payload;
            switch (status) {
                case KeyBotState.KEYBOT_STATE_IDLE:
                    state.keyBotState = { status: KeyBotState.KEYBOT_STATE_IDLE, error: '', text: "KEYBOT_STATE_IDLE" };

                    break;
                case KeyBotState.KEYBOT_PRESSING_LEFT:
                    state.keyBotState = { status: KeyBotState.KEYBOT_PRESSING_LEFT, error: '', text: "KEYBOT_PRESSING_LEFT" };
                    break;
                case KeyBotState.KEYBOT_PRESSING_RIGHT:
                    state.keyBotState = { status: KeyBotState.KEYBOT_PRESSING_RIGHT, error: '', text: "KEYBOT_PRESSING_RIGHT" };
                    break;
                case KeyBotState.KEYBOT_RETURNING_TO_CENTER_FROM_LEFT:
                    state.keyBotState = { status: KeyBotState.KEYBOT_RETURNING_TO_CENTER_FROM_LEFT, error: '', text: "KEYBOT_RETURNING_TO_CENTER_FROM_LEFT" };
                    break;
                case KeyBotState.KEYBOT_RETURNING_TO_CENTER_FROM_RIGHT:
                    state.keyBotState = { status: KeyBotState.KEYBOT_RETURNING_TO_CENTER_FROM_RIGHT, error: '', text: "KEYBOT_RETURNING_TO_CENTER_FROM_RIGHT" };
                    break;

                case KeyBotState.KEYBOT_ERROR_PRESSING_LEFT:
                    state.keyBotState = {
                        status: KeyBotState.KEYBOT_ERROR_PRESSING_LEFT,
                        error: 'KeySignal not detected', text: "KEYBOT_ERROR_PRESSING_LEFT"
                    };
                    break;
                case KeyBotState.KEYBOT_ERROR_PRESSING_RIGHT:
                    state.keyBotState = {
                        status: KeyBotState.KEYBOT_ERROR_PRESSING_RIGHT,
                        error: 'KeySignal not detected', text: "KEYBOT_ERROR_PRESSING_RIGHT"
                    };

                    break;

                case KeyBotState.KEYBOT_ERROR_RETURNING_TO_CENTER_FROM_LEFT:
                    state.keyBotState = {
                        status: KeyBotState.KEYBOT_ERROR_RETURNING_TO_CENTER_FROM_LEFT,
                        error: 'Limit sensor wasn\'t triggered', text: "KEYBOT_ERROR_RETURNING_TO_CENTER_FROM_LEFT"
                    };

                    break;
                case KeyBotState.KEYBOT_ERROR_RETURNING_TO_CENTER_FROM_RIGHT:
                    state.keyBotState = {
                        status: KeyBotState.KEYBOT_ERROR_RETURNING_TO_CENTER_FROM_RIGHT,
                        error: 'Limit sensor wasn\'t triggered', text: "KEYBOT_ERROR_RETURNING_TO_CENTER_FROM_RIGHT"
                    };
                    break;
                case KeyBotState.KEYBOT_STATE_EMERGENCY_RESET:
                    state.keyBotState = { status: KeyBotState.KEYBOT_STATE_EMERGENCY_RESET, error: '', text: "KEYBOT_STATE_EMERGENCY_RESET" };
                    break;

                case KeyBotState.KEYBOT_STATE_CENTERING:
                    state.keyBotState = { status: KeyBotState.KEYBOT_STATE_CENTERING, error: '', text: "KEYBOT_STATE_CENTERING" };
                    break;

                case KeyBotState.KEYBOT_ERROR_CENTERING:
                    state.keyBotState = {
                        status: KeyBotState.KEYBOT_ERROR_CENTERING,
                        error: 'Limit sensor wasn\'t triggered', text: "KEYBOT_ERROR_CENTERING"
                    };

                    break;


                default:
                    console.warn(`Invalid state: ${status}`);


            }

            console.log("updateKeyBotState", state.keyBotState);
        },
        updateBatteryLevel(state, action) {
            const { batteryLevel } = action.payload;
            console.log("updateBatteryLevel", batteryLevel);
            state.batteryLevel = {
                level: batteryLevel,
                text: `${batteryLevel}%`,
            }
        }
    },
    extraReducers(builder) {
        builder
            .addCase(connectDeviceById.pending, (state, action) => {
                state.deviceConnectionState.status = ConnectionState.SEARCHING;
                state.deviceConnectionState.error = '';
            })
            .addCase(connectDeviceById.fulfilled, (state, action: any) => {
                state.deviceConnectionState.status = ConnectionState.CONNECTED;
                const device = action.payload;
                state.connectedDevice = device;
            })
            .addCase(connectDeviceById.rejected, (state, action) => {

                console.log("connectDeviceById.rejected", action.error.message);
                //TODO BETTER ERROR HANDLING
                if (action.error.message === NetworkState.CANCELED) {
                    state.deviceConnectionState.status = ConnectionState.DISCONNECTED;
                    state.deviceConnectionState.error = action.error.message;
                } else {
                    state.deviceConnectionState.status = ConnectionState.ERROR;
                    state.deviceConnectionState.error = action.error.message ?? '';
                }
            })
            .addCase(disconnectDevice.pending, (state, action) => {
                console.log("disconnectDevice.pending");
                state.deviceConnectionState.status = ConnectionState.DISCONNECTING;
                state.deviceConnectionState.error = '';
            })
            .addCase(disconnectDevice.fulfilled, (state, action: any) => {
                console.log("disconnectDevice.fulfilled");
                state.deviceConnectionState.status = ConnectionState.DISCONNECTED;
                state.connectedDevice = null;
            })
            .addCase(disconnectDevice.rejected, (state, action) => {
                console.log("disconnectDevice.rejected", action.error.message);
                if (action.error.message === NetworkState.CANCELED) {
                    state.deviceConnectionState.status = ConnectionState.DISCONNECTED;
                    state.deviceConnectionState.error = action.error.message;
                } else {
                    state.deviceConnectionState.status = ConnectionState.ERROR;
                    state.deviceConnectionState.error = action.error.message ?? '';
                }
                state.connectedDevice = null;
            })
            .addCase(getChallenge.pending, (state, action) => {
                console.log("getChallenge.pending");
                state.deviceConnectionState.status = ConnectionState.GETTING_CHALLENGE;
                state.deviceConnectionState.error = '';
            })
            .addCase(getChallenge.rejected, (state, action) => {
                console.log("getChallenge.rejected", action.error.message);
                //TODO ERROR HANDLING
            })
            .addCase(getChallenge.fulfilled, (state, action: any) => {
                console.log("getChallenge.fulfilled", action.payload);
                state.deviceConnectionState.status = ConnectionState.CHALLENGE_RECEIVED;
                state.deviceConnectionState.error = '';

            })
            .addCase(authenticate.pending, (state, action) => {
                console.log("authenticate.pending");
                state.deviceConnectionState.status = ConnectionState.AUTHENTICATING;
                state.deviceConnectionState.error = '';
            })
            .addCase(authenticate.rejected, (state, action) => {
                console.log("authenticate.rejected", action.error.message);
                //disconect device
                disconnectDevice();

            })
            .addCase(authenticate.fulfilled, (state, action: any) => {
                console.log("authenticate.fulfilled", action.payload);
                state.deviceConnectionState.status = ConnectionState.AUTHENTICATED;
                state.deviceConnectionState.error = '';
            })

            .addCase(subscribeToEvents.pending, (state, action) => {
                console.log("subscribeToEvents.pending");
                state.deviceConnectionState.status = ConnectionState.SUBSCRIBING_TO_EVENTS;
                state.deviceConnectionState.error = '';
            })
            .addCase(subscribeToEvents.rejected, (state, action) => {
                console.log("subscribeToEvents.rejected", action.error.message);
                //disconect device
                disconnectDevice();
            })
            .addCase(subscribeToEvents.fulfilled, (state, action: any) => {
                console.log("subscribeToEvents.fulfilled");
                state.deviceConnectionState.status = ConnectionState.READY;
                state.deviceConnectionState.error = '';
            })






            ;
    },
});
export default bleSlice.reducer;
export const { setAdapterState, setLocationPermissionStatus, setConnectedDevice, addScannedDevice, clearScannedDevices, stopDeviceScan, setDemoMode, addLog
    , updateKeySensorStatus, updateMidSensorsStatus, updateKeyBotState, updateBatteryLevel, setConnectionState } = bleSlice.actions;
export const selectAdapterState = (state: RootState) => state.ble.adapterState;
export const selectConnectedDevice = (state: RootState) => state.ble.connectedDevice;
export const selectScannedDevices = (state: RootState) => state.ble.deviceScan;
export const selectBle = (state: RootState) => state.ble;
