import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator, Avatar, Button, Card, Divider, IconButton, Paragraph, Snackbar, Title, useTheme } from 'react-native-paper';
import { Text, View } from '../../components/Themed';
import { useAppDispatch, useAppSelector } from '../../data/hooks';
import {
  authenticate,
  connectDeviceById,
  disconnectDevice,
  getChallenge,
  keyBotCommand,
  manualMotorControl,
  motorTimeoutSetting,
  scanBleDevices,
  selectScannedDevices,
  stopDeviceScan,
  subscribeToEvents
} from '../../ble/bleSlice';
import {
  ConnectionState,
  KeyBotCommand,
  KeyBotState,
  ManualMotorControlCommand,
  MotorTimeoutCommand
} from '../../ble/bleSlice.contracts';
import CryptoES from 'crypto-es';
import Toast from 'react-native-root-toast';
import { getErrorMessage } from '../../data/api';
import firestore from '@react-native-firebase/firestore';

interface KeyBotDevice {
  id: string;
  mac: string;
  key: string;
  name?: string;
  unlockDirection?: boolean;
}

export default function KeyBotControlScreen() {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const ble = useAppSelector((state) => state.ble);
  const scannedDevices = useAppSelector(selectScannedDevices).devices;

  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [keybots, setKeybots] = useState<KeyBotDevice[]>([]);
  const [selectedKeybot, setSelectedKeybot] = useState<KeyBotDevice | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Fetch all keybots from Firestore
  useEffect(() => {
    const unsubscribe = firestore()
      .collection('KeyBots')
      .onSnapshot(snapshot => {
        const keybotList: KeyBotDevice[] = [];
        snapshot.forEach(doc => {
          keybotList.push({
            id: doc.id,
            mac: doc.data().mac,
            key: doc.data().key,
            name: doc.data().name || doc.id,
            unlockDirection: doc.data().unlockDirection
          });
        });
        setKeybots(keybotList);
      });

    return () => unsubscribe();
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (scrollViewRef.current && showLogs) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [ble.logs, showLogs]);

  // Scan for devices
  const startScan = () => {
    setIsScanning(true);
    dispatch(scanBleDevices());
  };

  const stopScan = () => {
    setIsScanning(false);
    dispatch(stopDeviceScan({}));
  };

  // Connect to a keybot
  async function connectToKeybot(keybot: KeyBotDevice) {
    try {
      setSelectedKeybot(keybot);

      // Connect to device
      const connectResult = await dispatch(connectDeviceById({ id: keybot.mac })).unwrap();
      console.log("connectResult", connectResult);

      // Get challenge
      const challenge = await dispatch(getChallenge()).unwrap();
      console.log("challenge", challenge);

      // Solve challenge with AES-128 ECB
      const key128Bits = CryptoES.enc.Utf8.parse(keybot.key);
      const encrypted = CryptoES.AES.encrypt(challenge, key128Bits, {
        mode: CryptoES.mode.ECB,
        padding: CryptoES.pad.NoPadding
      });
      const solved_challenge = encrypted.ciphertext.toString(CryptoES.enc.Hex).toUpperCase();
      console.log("encrypted: " + solved_challenge);

      // Authenticate
      const auth = await dispatch(authenticate({ solved_challenge })).unwrap();
      console.log("auth", auth);

      if (auth) {
        console.log("Authentication successful");
        await dispatch(subscribeToEvents()).unwrap();
        Toast.show("Connected to " + keybot.name, {
          duration: Toast.durations.SHORT,
          position: Toast.positions.BOTTOM,
          backgroundColor: theme.colors.primary,
        });
      } else {
        throw new Error("Authentication failed");
      }
    } catch (err) {
      console.error("Error connecting:", err);
      setErrorMessage(getErrorMessage(err));
      Toast.show(getErrorMessage(err), {
        duration: Toast.durations.LONG,
        position: Toast.positions.BOTTOM,
        backgroundColor: theme.colors.error,
      });
    }
  }

  // Disconnect
  async function disconnect() {
    try {
      await dispatch(disconnectDevice()).unwrap();
      setSelectedKeybot(null);
      Toast.show("Disconnected", {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
      });
    } catch (err) {
      console.error("Error disconnecting:", err);
      setErrorMessage(getErrorMessage(err));
    }
  }

  const isConnected = ble.deviceConnectionState.status === ConnectionState.READY;
  const isConnecting = [
    ConnectionState.SEARCHING,
    ConnectionState.CONNECTING,
    ConnectionState.CONNECTED,
    ConnectionState.GETTING_CHALLENGE,
    ConnectionState.AUTHENTICATING,
    ConnectionState.SUBSCRIBING_TO_EVENTS
  ].includes(ble.deviceConnectionState.status);

  // Get state color
  const getStateColor = () => {
    const state = ble.keyBotState.status;
    if (state === KeyBotState.KEYBOT_STATE_IDLE) return theme.colors.primary;
    if (state === KeyBotState.KEYBOT_PRESSING_LEFT || state === KeyBotState.KEYBOT_PRESSING_RIGHT) return '#FFA500';
    if (state === KeyBotState.KEYBOT_RETURNING_TO_CENTER_FROM_LEFT || state === KeyBotState.KEYBOT_RETURNING_TO_CENTER_FROM_RIGHT) return '#FFA500';
    if (state.toString().includes('ERROR') || parseInt(state) >= 5 && parseInt(state) <= 8) return theme.colors.error;
    return theme.colors.primary;
  };

  return (
    <View style={styles.container}>
      {/* Header with connection status */}
      <View style={styles.header}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, {
            backgroundColor: isConnected ? '#4CAF50' : isConnecting ? '#FFA500' : '#9E9E9E'
          }]} />
          <Text style={styles.statusText}>
            {ble.deviceConnectionState.status}
          </Text>
        </View>
        {selectedKeybot && (
          <Text style={styles.deviceName}>{selectedKeybot.name}</Text>
        )}
      </View>

      <Divider style={{ marginVertical: 10 }} />

      {/* Not connected - show device list */}
      {!isConnected && !isConnecting && (
        <ScrollView style={styles.scanSection} contentContainerStyle={styles.scanContent}>
          <Button
            mode="contained"
            icon={isScanning ? "stop" : "bluetooth"}
            onPress={isScanning ? stopScan : startScan}
            style={styles.scanButton}
          >
            {isScanning ? 'Stop Scan' : 'Scan for KeyBots'}
          </Button>

          <Text style={styles.sectionTitle}>Available KeyBots</Text>

          {/* Show registered keybots */}
          {keybots.length === 0 ? (
            <Text style={styles.emptyText}>No KeyBots registered</Text>
          ) : (
            keybots.map((item) => {
              const isScanned = scannedDevices.some(d => d?.id === item.mac);
              return (
                <Card
                  key={item.id}
                  style={[styles.deviceCard, !isScanned && styles.deviceCardDisabled]}
                  onPress={() => isScanned && connectToKeybot(item)}
                >
                  <Card.Content style={styles.deviceCardContent}>
                    <Avatar.Icon
                      size={50}
                      icon="key"
                      style={{
                        backgroundColor: isScanned ? theme.colors.primary : '#9E9E9E'
                      }}
                    />
                    <View style={styles.deviceInfo}>
                      <Title style={styles.deviceTitle}>{item.name || item.id}</Title>
                      <Paragraph style={styles.deviceMac}>{item.mac}</Paragraph>
                      <Paragraph style={{ color: isScanned ? '#4CAF50' : '#9E9E9E' }}>
                        {isScanned ? 'In range' : 'Not found'}
                      </Paragraph>
                    </View>
                    {isScanned && (
                      <IconButton icon="chevron-right" size={24} />
                    )}
                  </Card.Content>
                </Card>
              );
            })
          )}

          {/* Show scanned but unregistered devices */}
          {scannedDevices.filter(d => d && !keybots.some(kb => kb.mac === d.id)).length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Other BLE Devices</Text>
              {scannedDevices
                .filter(d => d && !keybots.some(kb => kb.mac === d.id))
                .map((item) => item && (
                  <Card key={item.id} style={[styles.deviceCard, styles.deviceCardDisabled]}>
                    <Card.Content style={styles.deviceCardContent}>
                      <Avatar.Icon size={50} icon="bluetooth" style={{ backgroundColor: '#9E9E9E' }} />
                      <View style={styles.deviceInfo}>
                        <Title style={styles.deviceTitle}>{item.name || 'Unknown'}</Title>
                        <Paragraph style={styles.deviceMac}>{item.id}</Paragraph>
                        <Paragraph style={{ color: '#9E9E9E' }}>Not registered</Paragraph>
                      </View>
                    </Card.Content>
                  </Card>
                ))}
            </>
          )}
        </ScrollView>
      )}

      {/* Connecting state */}
      {isConnecting && (
        <View style={styles.connectingSection}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.connectingText}>{ble.deviceConnectionState.status}</Text>
          <Button mode="outlined" onPress={disconnect} style={{ marginTop: 20 }}>
            Cancel
          </Button>
        </View>
      )}

      {/* Connected - show controls */}
      {isConnected && (
        <ScrollView style={styles.controlsSection} contentContainerStyle={styles.controlsContent}>
          {/* Telemetry Cards */}
          <View style={styles.telemetryRow}>
            <Card style={[styles.stateCard, { borderLeftColor: getStateColor(), borderLeftWidth: 4 }]}>
              <Card.Content style={styles.stateCardContent}>
                <Avatar.Icon size={40} icon="cog" style={{ backgroundColor: getStateColor() }} />
                <View style={styles.stateTextContainer}>
                  <Text style={styles.telemetryLabel}>State</Text>
                  <Text
                    style={[styles.stateValue, { color: getStateColor() }]}
                    adjustsFontSizeToFit
                    minimumFontScale={0.5}
                    numberOfLines={2}
                  >
                    {ble.keyBotState.text || 'Unknown'}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          </View>

          <View style={styles.telemetryRow}>
            <Card style={[styles.telemetryCard, styles.telemetryCardHalf]}>
              <Card.Content style={styles.telemetryCardContent}>
                <Avatar.Icon
                  size={40}
                  icon={ble.batteryLevel.level > 80 ? "battery" : ble.batteryLevel.level > 40 ? "battery-medium" : "battery-low"}
                  style={{ backgroundColor: ble.batteryLevel.level > 20 ? '#4CAF50' : theme.colors.error }}
                />
                <View style={styles.telemetryTextContainer}>
                  <Text style={styles.telemetryLabel}>Battery</Text>
                  <Text style={[styles.telemetryValue, { color: ble.batteryLevel.level > 20 ? '#4CAF50' : theme.colors.error }]}>
                    {ble.batteryLevel.level > 0 ? `${ble.batteryLevel.level.toFixed(0)}%` : 'N/A'}
                  </Text>
                </View>
              </Card.Content>
            </Card>

            <Card style={[styles.telemetryCard, styles.telemetryCardHalf]}>
              <Card.Content style={styles.telemetryCardContent}>
                <Avatar.Icon size={40} icon="flash" style={{ backgroundColor: theme.colors.primary }} />
                <View style={styles.telemetryTextContainer}>
                  <Text style={styles.telemetryLabel}>Sensor</Text>
                  <Text style={styles.telemetryValue}>
                    {ble.midSensorsStatus.sensor_voltage.toFixed(2)}V
                  </Text>
                </View>
              </Card.Content>
            </Card>
          </View>

          <Divider style={{ marginVertical: 15 }} />

          {/* Main Controls */}
          <Text style={styles.sectionTitle}>KeyBot Commands</Text>
          <View style={styles.controlRow}>
            <Button
              mode="contained"
              icon="arrow-left"
              onPress={() => dispatch(keyBotCommand({ command: KeyBotCommand.KEYBOT_PRESS_LEFT }))}
              style={styles.controlButton}
              contentStyle={styles.controlButtonContent}
            >
              Press Left
            </Button>
            <Button
              mode="contained"
              icon="arrow-right"
              onPress={() => dispatch(keyBotCommand({ command: KeyBotCommand.KEYBOT_PRESS_RIGHT }))}
              style={styles.controlButton}
              contentStyle={styles.controlButtonContent}
            >
              Press Right
            </Button>
          </View>

          <View style={styles.controlRow}>
            <Button
              mode="outlined"
              icon="stop"
              onPress={() => dispatch(keyBotCommand({ command: KeyBotCommand.KEYBOT_EMERGENCY_STOP }))}
              style={[styles.controlButton, { borderColor: theme.colors.error }]}
              textColor={theme.colors.error}
            >
              Emergency Stop
            </Button>
            <Button
              mode="outlined"
              icon="target"
              onPress={() => dispatch(keyBotCommand({ command: KeyBotCommand.KEYBOT_CENTER }))}
              style={styles.controlButton}
            >
              Center
            </Button>
          </View>

          <Divider style={{ marginVertical: 15 }} />

          {/* Motor Controls */}
          <Text style={styles.sectionTitle}>Manual Motor Control</Text>
          <View style={styles.controlRow}>
            <Button
              mode="outlined"
              icon="arrow-up"
              onPress={() => dispatch(manualMotorControl({ command: ManualMotorControlCommand.MOTOR2_FORWARD }))}
              style={styles.controlButton}
            >
              Forward
            </Button>
            <Button
              mode="outlined"
              icon="arrow-down"
              onPress={() => dispatch(manualMotorControl({ command: ManualMotorControlCommand.MOTOR2_BACKWARD }))}
              style={styles.controlButton}
            >
              Backward
            </Button>
          </View>

          <Divider style={{ marginVertical: 15 }} />

          {/* Motor Timeout Settings */}
          <Text style={styles.sectionTitle}>Motor Movement Limit</Text>
          <View style={styles.controlRow}>
            <Button
              mode="outlined"
              icon="minus"
              onPress={() => dispatch(motorTimeoutSetting({ command: MotorTimeoutCommand.MOTOR_TIMEOUT_DECREASE }))}
              style={styles.smallButton}
            >
              Decrease
            </Button>
            <Button
              mode="outlined"
              icon="refresh"
              onPress={() => dispatch(motorTimeoutSetting({ command: MotorTimeoutCommand.MOTOR_TIMEOUT_RESET }))}
              style={styles.smallButton}
            >
              Reset
            </Button>
            <Button
              mode="outlined"
              icon="plus"
              onPress={() => dispatch(motorTimeoutSetting({ command: MotorTimeoutCommand.MOTOR_TIMEOUT_INCREASE }))}
              style={styles.smallButton}
            >
              Increase
            </Button>
          </View>

          <Divider style={{ marginVertical: 15 }} />

          {/* Logs Toggle */}
          <Button
            mode="text"
            icon={showLogs ? "chevron-up" : "chevron-down"}
            onPress={() => setShowLogs(!showLogs)}
          >
            {showLogs ? 'Hide Logs' : 'Show Logs'}
          </Button>

          {showLogs && (
            <View style={styles.logSection}>
              <ScrollView
                ref={scrollViewRef}
                style={styles.logScroll}
                contentContainerStyle={styles.logContainer}
              >
                {ble.logs.length === 0 ? (
                  <Text style={styles.emptyText}>No logs yet</Text>
                ) : (
                  ble.logs.map((log, index) => (
                    <View key={index} style={styles.logWrapper}>
                      <Text style={styles.logText}>{log}</Text>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          )}

          {/* Disconnect Button */}
          <Button
            mode="contained"
            icon="bluetooth-off"
            onPress={disconnect}
            style={styles.disconnectButton}
            buttonColor={theme.colors.error}
          >
            Disconnect
          </Button>
        </ScrollView>
      )}

      <Snackbar
        visible={errorMessage !== ''}
        onDismiss={() => setErrorMessage('')}
        action={{
          label: 'OK',
          onPress: () => setErrorMessage(''),
        }}
      >
        {errorMessage}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    textTransform: 'capitalize',
  },
  deviceName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 5,
  },
  scanSection: {
    flex: 1,
  },
  scanContent: {
    paddingBottom: 30,
  },
  scanButton: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    opacity: 0.8,
  },
  deviceCard: {
    marginBottom: 10,
  },
  deviceCardDisabled: {
    opacity: 0.6,
  },
  deviceCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceInfo: {
    flex: 1,
    marginLeft: 15,
    backgroundColor: 'transparent',
  },
  deviceTitle: {
    fontSize: 16,
    lineHeight: 20,
  },
  deviceMac: {
    fontSize: 12,
    opacity: 0.7,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.5,
    marginTop: 20,
  },
  connectingSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectingText: {
    marginTop: 15,
    fontSize: 18,
    textTransform: 'capitalize',
  },
  controlsSection: {
    flex: 1,
  },
  controlsContent: {
    paddingBottom: 30,
  },
  telemetryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  telemetryCard: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  telemetryCardHalf: {
    flex: 0.48,
  },
  telemetryCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  telemetryTextContainer: {
    marginLeft: 12,
    flex: 1,
    backgroundColor: 'transparent',
  },
  stateCard: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 72,
  },
  stateCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    minHeight: 56,
  },
  stateTextContainer: {
    marginLeft: 12,
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    minHeight: 40,
  },
  telemetryLabel: {
    fontSize: 12,
    opacity: 0.6,
  },
  telemetryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 2,
  },
  stateValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  controlButton: {
    flex: 1,
    marginHorizontal: 5,
  },
  controlButtonContent: {
    height: 50,
  },
  smallButton: {
    flex: 1,
    marginHorizontal: 3,
  },
  logSection: {
    height: 200,
    marginTop: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  logScroll: {
    flex: 1,
  },
  logContainer: {
    padding: 10,
  },
  logWrapper: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 6,
    alignSelf: 'flex-start',
    maxWidth: '90%',
  },
  logText: {
    fontSize: 13,
    color: 'white',
  },
  disconnectButton: {
    marginTop: 20,
  },
});
