import * as Location from 'expo-location';

export enum NetworkState {
    PENDING="PENDING",
    LOADING="LOADING",
    SUCCESS="SUCCESS",
    ERROR="ERROR",
    CANCELED="CANCELED"
}
export enum ConnectionState {
    DISCONNECTED = "connect",
    SEARCHING = "searching",
    CONNECTING = "connecting",
    CONNECTED = "connected",
    DISCONNECTING = "disconnecting",
    ERROR = "error",
    GETTING_CHALLENGE = "getting challenge",
    CHALLENGE_RECEIVED = "challenge received",
    AUTHENTICATING = "authenticating",
    AUTHENTICATED = "authenticated",
    READY = "ready",
    SUBSCRIBING_TO_EVENTS = "SUBSCRIBING_TO_EVENTS"
}
export enum SensorState {
    SENSOR_OK="OK",
    SENSOR_ERROR="ERROR",
  PENDING="PENDING"
}

export enum MidSensorState {
   PENDING="PENDING",
   PRESSED="1",
   RELEASED="0"
}

export enum ManualMotorControlCommand {

    MOTOR1_FORWARD='0',
    MOTOR1_BACKWARD= '1',
    MOTOR2_FORWARD= '2',
    MOTOR2_BACKWARD= '3'
}

export enum KeyBotCommand{
    KEYBOT_PRESS_LEFT = '0',
    KEYBOT_PRESS_RIGHT = '1',
    KEYBOT_EMERGENCY_STOP = '2',
    KEYBOT_CENTER = '3',
}

export enum KeyBotState {
    KEYBOT_STATE_IDLE = '0',
    KEYBOT_PRESSING_LEFT = '1',
    KEYBOT_PRESSING_RIGHT = '2',
    KEYBOT_RETURNING_TO_CENTER_FROM_LEFT = '3',
    KEYBOT_RETURNING_TO_CENTER_FROM_RIGHT = '4',
    KEYBOT_ERROR_PRESSING_LEFT = '5',
    KEYBOT_ERROR_PRESSING_RIGHT = '6',
    KEYBOT_ERROR_RETURNING_TO_CENTER_FROM_LEFT = '7',
    KEYBOT_ERROR_RETURNING_TO_CENTER_FROM_RIGHT = '8',
    KEYBOT_STATE_EMERGENCY_RESET = '9',
    KEYBOT_STATE_CENTERING = ':',
    KEYBOT_ERROR_CENTERING = ';',
  };

    
export interface IBLEDevice {
    serviceUUIDs: Array<string>;
    isConnectable: boolean;
    overflowServiceUUIDs: Array<string>;
    txPowerLevel: string;
    serviceData?: any;
    manufacturerData?: any;
    name: string;
    mtu: number;
    rssi: string;
    solicitedServiceUUIDs: Array<string>;
    localName: string;
    id: string;
    _manager?: any;
}

export const toBLEDeviceVM = (device: any) => {
    console.log('toBLEDeviceVM',JSON.stringify(device));
    const result = {
        serviceUUIDs: device.serviceUUIDs,
        isConnectable: device.isConnectable,
        overflowServiceUUIDs: device.overflowServiceUUIDs,
        txPowerLevel: device.txPowerLevel,
        serviceData: device.serviceData,
        manufacturerData: device.manufacturerData,
        name: device.name,
        mtu: device.mtu,
        rssi: device.rssi,
        solicitedServiceUUIDs: device.solicitedServiceUUIDs,
        localName: device.localName,
        id: device.id,
    };
    return result;
};

export interface IDeviceConnectionState {
    status: ConnectionState;
    error: string;
}

export interface IDeviceScan {
    devices: Array<IBLEDevice | null>;
    status: NetworkState;
    error: string;
}

export interface SensorStatus {
    status: SensorState;
    error: string;
}

export interface MidSensorsStatus {
    sensor_1_status: MidSensorState;
    sensor_2_status: MidSensorState;
    error: string;
}


export interface authenticateDeviceParams {
    solved_challenge: string
}

export interface connectDeviceByIdParams {
    id: string //mac address
}

export interface linkDeviceByIdParams {
    id: string
    name: string
}

//testbuttonParams
export interface testbuttonParams {
    h: string
}
//manualMotorControlParams
export interface manualMotorControlParams {
    command: ManualMotorControlCommand
}

export interface keybotCommandParams {
    command: KeyBotCommand
}



export type IAdapterState =
/**
 * The current state of the manager is unknown; an update is imminent.
 */
    | 'Unknown'
    /**
     * The connection with the system service was momentarily lost; an update is imminent.
     */
    | 'Resetting'
    /**
     * The platform does not support Bluetooth low energy.
     */
    | 'Unsupported'
    /**
     * The app is not authorized to use Bluetooth low energy.
     */
    | 'Unauthorized'
    /**
     * Bluetooth is currently powered off.
     */
    | 'PoweredOff'
    /**
     * Bluetooth is currently powered on and available to use.
     */
    | 'PoweredOn';

export interface bleSliceInterface {
    use_demo_device: boolean;
    adapterState: IAdapterState;
    deviceConnectionState: IDeviceConnectionState;
    deviceScan: IDeviceScan;
    locationPermission: Location.LocationPermissionResponse['status'] | null;
    connectedDevice: IBLEDevice | null;
    logs: string[];
    sensorStatus: SensorStatus;
    midSensorsStatus: MidSensorsStatus;
    keyBotState: {
        status: KeyBotState;
        text: string;
        error: string;
    },
    batteryLevel: {
        level: number;
        text: string;
    }
}
