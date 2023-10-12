import { useRouter, useSegments,useRootNavigation } from "expo-router";
import React from "react";
import { useAppDispatch, useAppSelector } from '../data/hooks';
import { UserType2 } from "../constants/Auth";
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';



const AuthContext = React.createContext({
  signIn: () => {}, //TODO
  signOut: () => {},
  user: null,
  initializing: true,
});


// This hook can be used to access the user info.
export function useAuth() {
  return React.useContext(AuthContext);
}

// This hook will protect the route access based on user authentication.
function useProtectedRoute(user) {
  const segments = useSegments();
  const router = useRouter();

    // checking that navigation is all good;
    const [isNavigationReady, setNavigationReady] = React.useState(false);
    const rootNavigation = useRootNavigation();

    React.useEffect(() => {
      const unsubscribe = rootNavigation?.addListener("state", (event) => {
        setNavigationReady(true);
      });
      return function cleanup() {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    }, [rootNavigation]);

  

  React.useEffect(() => {

    if (!isNavigationReady) {
      return;
    }

    const inAuthGroup = segments[0] === "auth";
    const inHome = segments[0] === "home";
    //check if modal or missing
    const inModal = segments[0] === "modal";


    //check if in home page
    console.log("segments", segments);

    console.log("inAuthGroup", inAuthGroup);
    //console.log("user", user);

    let is_user = user !== null && user.uid !== null && user.uid !== undefined && user.uid !== '';

    //if user is not yet retrieved do nothing
    // if (user === null || user.uid === null || user.uid === undefined || user.uid === '') {

    //     console.log("user not yet retrieved");
    //     return;
    // }



    if (
      // If the user is not signed in and the initial segment is not anything in the auth group.
      !is_user &&
      !inAuthGroup
    ) {
      // Redirect to the sign-in page.
      //check if navigation is ready
      console.log("redirect to sign in");
      //wait for 5 seconds

       router.replace("auth");
     
    } else if (is_user && !inHome && !inModal) {
      // Redirect away from the sign-in page.
      //router.replace("/home");

      console.log("user logged in");

      //check user type
     
        router.replace("client");
    
    }
  }, [user,isNavigationReady]);
}

export function ProviderAuth(props) {
  //thype user or null
  const [user, setAuth] = React.useState(null);
  const [initializing, setInitializing] = React.useState(true);

 

  const secure = useAppSelector((state) => state.secure);
  const dispatch = useAppDispatch();

  useProtectedRoute(user);



  GoogleSignin.configure({
    webClientId: '414868164821-d74dqmptkfg7vbc59210aeg7ou7018q0.apps.googleusercontent.com',
    forceCodeForRefreshToken: true,
  });


  async function onGoogleButtonPress() {


    // Check if your device supports Google Play
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // Get the users ID token
    const { idToken } = await GoogleSignin.signIn();
  
    // Create a Google credential with the token
    const googleCredential = auth.GoogleAuthProvider.credential(idToken);
    console.log("googleCredential", googleCredential);
  
    // Sign-in the user with the credential
    return auth().signInWithCredential(googleCredential);
  }


  // Handle user state changes
  function onAuthStateChanged(user) {
    console.log("onAuthStateChanged", user);
   
      setAuth(user);
      console.log("initializing1", initializing);
      if (initializing){ setInitializing(false);}
      console.log("user", user);
      console.log("initializing", initializing);
  }

  React.useEffect(() => {
    const subscriber = auth().onAuthStateChanged(onAuthStateChanged);
    return subscriber; // unsubscribe on unmount
  }, []);



  return (
    <AuthContext.Provider
      value={{
        signIn: () => onGoogleButtonPress(),
        signOut: () => auth().signOut(),
        user,
        initializing : initializing,
      }}
    >
      {props.children}
    </AuthContext.Provider>
  );
}