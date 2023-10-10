import { FontAwesome } from '@expo/vector-icons';
import * as Font from 'expo-font';
import { useEffect, useState } from 'react';

export default function useCachedResources() {
  const [isLoadingComplete, setLoadingComplete] = useState(false);

  // Load any resources or data that we need prior to rendering the app
  useEffect(() => {
    async function loadResourcesAndDataAsync() {
      try {
        //SplashScreen.preventAutoHideAsync();

        //wait 2s to simulate a slow loading
        //await new Promise((resolve) => setTimeout(resolve, 2000));


        // Load fonts
        await Font.loadAsync({
          ...FontAwesome.font,
          'space-mono': require('../assets/fonts/SpaceMono-Regular.ttf'),
          'sf-pro': require('../assets/fonts/SF-Pro.ttf'),


        });
      } catch (e) {
        // We might want to provide this error information to an error reporting service
        console.warn(e);
      } finally {
        setLoadingComplete(true);
        //SplashScreen.hideAsync();
      }
    }

    loadResourcesAndDataAsync();
  }, []);

  return isLoadingComplete;
}
