import { Stack, useGlobalSearchParams, useLocalSearchParams, usePathname } from 'expo-router';
import { StatusBar } from "expo-status-bar";
import { ReactNode, useEffect } from 'react';
import { RootSiblingParent } from 'react-native-root-siblings';
import { Provider } from 'react-redux';
import { persistStore } from 'redux-persist';
import { PersistGate } from 'redux-persist/integration/react';
import { store } from '../data/store';
import useColorScheme from '../hooks/useColorScheme';

import { MD3DarkTheme, Provider as PaperProvider } from 'react-native-paper';
//theme provider
import { configureFonts, MD3LightTheme } from 'react-native-paper';

//safe area view
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider
} from "@react-navigation/native";
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LogBox } from "react-native";
import { ProviderAuth } from '../auth/provider';
import BLEManager from '../components/BLEManager/BLEManager';
LogBox.ignoreLogs(['new NativeEventEmitter']); // Ignore log notification by message
//BLE PLX LIBRARY BUG still not fixed


const persistor = persistStore(store);


export default function RootLayout(): ReactNode {
  //const isLoadingComplete = useCachedResources();
  const colorScheme = useColorScheme();

  const pathname = usePathname();
  const params = useLocalSearchParams();
  const globalParams = useGlobalSearchParams();
  console.log('globalParams', globalParams);

  const fontConfig = {

    fontFamily: 'sf-pro',


    // Include other platforms if needed
  };

  const DarkTheme_paper = {
    ...MD3DarkTheme,
    fonts: configureFonts({ config: fontConfig }),
  };
  const LightTheme_paper = {
    ...MD3LightTheme,
    fonts: configureFonts({ config: fontConfig }),
  };
  //TODO https://callstack.github.io/react-native-paper/docs/guides/theming-with-react-navigation/




  useEffect(() => {
    console.log('pathname changed', pathname);

    //here we can remeber the last page and redirect to it 


  }, [pathname, params]);




  // if (!isLoadingComplete) {
  //   return <SplashScreen />;
  // } else {
  return (




    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>

        <Provider store={store}>
          <PersistGate loading={null} persistor={persistor}>
            <ProviderAuth>
              {/* <PaperProvider theme={colorScheme === 'dark' ? DarkTheme_paper : LightTheme_paper}> */}
              <PaperProvider>
                <RootSiblingParent>
                  <BLEManager />

                  <Stack
                    screenOptions={
                      {
                        headerShown: false,
                        animation: "none",

                      }
                    }

                    screenListeners={{

                    }}>

                    <Stack.Screen name="parcel/[id]/details"
                      options={{
                        title: "Parcel Details",


                        headerShown: true,



                      }}
                    />

                    <Stack.Screen name="parcel/[id]/deposit"
                      options={{
                        title: "Deposit Parcel",


                        headerShown: true,



                      }}
                    />

                    <Stack.Screen name="parcel/[id]/withdraw"
                      options={{
                        title: "Withdraw Parcel",


                        headerShown: true,



                      }}
                    />





                    <Stack.Screen name="courier"
                      options={{
                        title: "Courier",
                        animation: "slide_from_right"
                      }}
                    />

                    <Stack.Screen name="client"
                      options={{
                        title: "Courier",
                        animation: "slide_from_right"
                      }}
                    />

                    <Stack.Screen name="auth"
                      options={{
                        headerShown: false,
                        title: "Courier",
                        animation: "slide_from_right"
                      }}
                    />



                  </Stack>



                  <StatusBar />

                </RootSiblingParent>
              </PaperProvider>
            </ProviderAuth>

          </PersistGate>
        </Provider>

      </ThemeProvider>
    </SafeAreaProvider>

  );

}


