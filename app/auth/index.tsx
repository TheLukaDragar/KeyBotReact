import { StyleSheet } from 'react-native';
import { GoogleSigninButton } from '@react-native-google-signin/google-signin';
import { useRouter } from 'expo-router';
import React from 'react';
import { Button, Snackbar } from 'react-native-paper';
import { useAuth } from '../../auth/provider';
import { Text, View } from '../../components/Themed';
import useColorScheme from '../../hooks/useColorScheme';


export default function TabTwoScreen() {

  const router = useRouter();
  const [ErrorMessage, setError] = React.useState("");
  const { signIn } = useAuth();
  const colorScheme = useColorScheme();


  return (
    <View style={styles.container}>
      <View style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Text style={styles.title}>
          Sign in to KeyBot
        </Text>
        <Text style={styles.subtitle}>
          Unlock cars, share access, and more.
        </Text>

      </View>

      <View style={{ flex: 1, alignItems: 'flex-start', justifyContent: 'flex-start' }}>
        <GoogleSigninButton
          size={GoogleSigninButton.Size.Wide}
          color={colorScheme == 'dark' ? GoogleSigninButton.Color.Dark : GoogleSigninButton.Color.Light}
          onPress={signIn}
          disabled={false}
          style={styles.googleButton} // Added style

        />

      </View>

      <Button
        onPress={() => router.push('auth/intro_1')}
        mode="contained"
        icon='help'
        contentStyle={styles.buttonContentStyle}
        style={styles.introButton}>

        How it works
      </Button>

      <Snackbar
        visible={ErrorMessage !== ""}
        onDismiss={() => { setError(""); }}
        action={{
          label: 'Ok',
          onPress: () => {
            setError("");
          },
        }}>
        {ErrorMessage}
      </Snackbar>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20, // Added padding
  },
  title: {
    fontSize: 24, // Increased font size
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 18,

  },
  googleButton: {
    width: 300, // Defined width

  },
  introButton: {
    marginTop: 20,
    width: 280, // Defined width
  },
  buttonContentStyle: {
    padding: 10,
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
});
