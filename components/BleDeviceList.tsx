import { useEffect, useState } from 'react';
import { FlatList } from 'react-native';
import { ActivityIndicator, Avatar, Card, Paragraph, Title, useTheme } from 'react-native-paper';
import Toast from 'react-native-root-toast';
import {
    scanBleDevices,
    selectAdapterState,
    selectConnectedDevice,
    selectScannedDevices, stopDeviceScan
} from '../ble/bleSlice';
import { IBLEDevice } from '../ble/bleSlice.contracts';
import { Text, View } from '../components/Themed';
import { BoxItem, getErrorMessage, useConnectBoxMutation } from '../data/api';
import { useAppDispatch, useAppSelector } from '../data/hooks';

//... DeviceItem component here



interface DeviceItemProps {
    device: IBLEDevice | null
    onDevicePress?: (device: IBLEDevice) => void
    isOwner?: boolean
}

const DeviceItem = (props: DeviceItemProps) => {
    const { device, onDevicePress, isOwner } = props;
    const [isConnecting, setIsConnecting] = useState(false);
    const connectedDevice = useAppSelector(selectConnectedDevice)

    const [ConnectBox, { isLoading: isLoading, error: error, isError, isSuccess, data: data

    }] = useConnectBoxMutation();

    const theme = useTheme();

    async function connectBox(device: IBLEDevice) {
        try {
            ///const msg = await getMessageToSign().unwrap();

            //call connect box api





            const response = await ConnectBox({
                did: device.name,
                macAddress: device.id,
            }).unwrap();

            console.log(response, "response");

            Toast.show("Box connected successfully", {
                duration: Toast.durations.LONG,
                position: Toast.positions.BOTTOM,
                shadow: true,
                animation: true,
                hideOnPress: true,
                delay: 0,
                backgroundColor: theme.colors.primary,
            });


            //setResult(JSON.stringify(response));


        } catch (err) {
            console.log(err);
            Toast.show(getErrorMessage(err), {
                duration: Toast.durations.LONG,
                position: Toast.positions.BOTTOM,
                shadow: true,
                animation: true,
                hideOnPress: true,
                delay: 0,
                backgroundColor: theme.colors.error,
            });
        }
    }

    const connectHandler = async () => {
        if (isLoading) return;
        if (device?.id) {
            onDevicePress?.(device); // use optional chaining and nullish coalescing operator
            await connectBox(device);
        }
    }

    return (
        // <TouchableOpacity style={{
        //     width: Layout.window.width * 0.8, 

        // }} onPress={connectHandler}>
        /* <Text style={{
            paddingVertical: 10,
            color: connectedDevice?.id === device?.id ? 'green' : 'white'


        }}>{device?.name + ' ' + device?.id}</Text> */

        <Card style={{
            marginBottom: 10, elevation: 2, padding: 5

        }} onPress={connectHandler}
        >
            <Card.Content style={{ flexDirection: 'row', alignItems: 'center' }}>
                {isLoading ? <ActivityIndicator size={60} style={{ marginRight: 10 }} color={theme.colors.primary} /> :
                     <Avatar.Icon size={60} icon="cube" style={{
                        marginRight: 10, 
                        backgroundColor: isError 
                            ? theme.colors.error 
                            : isSuccess || isOwner 
                                ? theme.colors.primary 
                                : 'grey'
                    }}
                    />
                }
                <View
                    style={{ backgroundColor: 'transparent' }}

                >
                    <Title numberOfLines={1} ellipsizeMode="tail">{device?.name}</Title>
                    <Paragraph numberOfLines={1} ellipsizeMode="tail">{device?.id}</Paragraph>
                </View>
            </Card.Content>
            
        </Card>

        // </TouchableOpacity>
    )
}

const BLEDeviceList = ({ onDevicePress, shouldScan, onlineBoxes,
    
    ...props
}: { onDevicePress?: (device: IBLEDevice) => void, shouldScan: boolean, onlineBoxes: BoxItem[]

}) => {
    const [buttonText, setButtonText] = useState('Start Scan');
    const adapterState = useAppSelector(selectAdapterState);
    const scannedDevices = useAppSelector(selectScannedDevices).devices;
    const dispatch = useAppDispatch();

    console.log('scannedDevices', scannedDevices)


    useEffect(() => {
        console.log('shouldScan', shouldScan);
        if (shouldScan) {
            dispatch(scanBleDevices());
            setButtonText('Stop Scan');

        }

        else {
            // stop scan function here
            dispatch(stopDeviceScan({}));
            setButtonText('Start Scan');
        }


    }, [shouldScan]);

    return (
        <>
         

            <Text style={{ marginBottom: 10 }}>
                {shouldScan && scannedDevices.length > 0 ? 'Select a device to connect' :
                    !shouldScan && scannedDevices.length === 0 ? 'Start scan to find devices' :
                        shouldScan && scannedDevices.length === 0 ? 'Scanning for devices...' :
                            !shouldScan && scannedDevices.length > 0 ? 'Select a device to connect' :
                                'Devices will appear here'}
            </Text>

            <FlatList
                style={{
                    height: '100%'

                }}
                contentContainerStyle={{ width: '100%', justifyContent: 'center' }}
                data={scannedDevices}
                keyExtractor={item => item ? item.id : 'null'}
                renderItem={({ item }) => (
                    item ? <DeviceItem device={item} onDevicePress={onDevicePress} isOwner={onlineBoxes.some(box => box.macAddress === item.id)}
                    /> : null
                )}
            />
        </>
    );
};

export default BLEDeviceList;
