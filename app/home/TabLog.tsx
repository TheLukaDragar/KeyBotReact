import { View } from '../../components/Themed';
import React, { useRef, useEffect} from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import {  Text } from 'react-native-paper';
import { useAppDispatch, useAppSelector } from '../../data/hooks';

export default function Log() {
  const dispatch = useAppDispatch();
  const ble = useAppSelector((state) => state.ble);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [ble.logs]);

  return (
    
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.logContainer}
      >
        {ble.logs.map((log, index) => (
          <View key={index} style={styles.logWrapper}>
            <Text style={styles.log}>{log}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,  },
  
  logContainer: {
    flexGrow: 1,
    padding: 10,
    width: '100%',
    justifyContent: 'flex-end',
  },
  logWrapper: {
    backgroundColor: '#007AFF',
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginBottom: 8,
    alignSelf: 'flex-start',
    maxWidth: '80%',
  },
  log: {
    fontSize: 15,
   
  },
});
