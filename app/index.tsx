

import { StyleSheet } from 'react-native';

import { Text, View } from '../components/Themed';
import {useRouter} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { useAppDispatch, useAppSelector } from '../data/hooks';
import { getSecure } from '../data/secure';
import { useEffect } from 'react';
import useCachedResources from '../hooks/useCachedResources';


export default function TabTwoScreen() {

  const router = useRouter();
  const secure = useAppSelector((state) => state.secure);
  const dispatch = useAppDispatch();

  const isLoadingComplete = useCachedResources();






  //wait for the token to be set
  useEffect (() => {

    console.log("INDEX 0",secure.userData);

    dispatch(getSecure());




  },[])
  


  if (!isLoadingComplete || secure.loading) {
    SplashScreen.preventAutoHideAsync(); //TODO MAKE THIS BEETER

    return null;
  }
  else {
    SplashScreen.hideAsync();
    return (
      <View style={styles.container}>
        <Text style={styles.title}>DLMD</Text>
      </View>
    );
  }
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
