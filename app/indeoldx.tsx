import {Button} from  'react-native-paper';
import {useRouter} from 'expo-router';
import React from 'react';
import {View} from 'react-native';

//here we check if user logged in or not
//if logged in we redirect to home page
//if not redirect to sign in page


function Intro(): React.ReactElement {
  const router = useRouter();

  return (
    <View>
      <Button

        onPress={() => router.push('auth/sign-in')}
        mode="contained"
        style={{marginTop: 20, padding: 10}}
      >
        Sign in
      </Button>
      <Button

        onPress={() => router.push('auth/sign-up')}
        mode="contained"
        style={{marginTop: 20, padding: 10}}
      >
        Sign up
      </Button>

      <Button

        onPress={() => router.push('home')}
        mode="contained"
        style={{marginTop: 20, padding: 10}}
      >
        Home

      </Button>

      </View>
    
        
  );
}

export default Intro;
