import { useRouter, useSegments } from "expo-router";
import React from "react";
import { useAppDispatch, useAppSelector } from '../data/hooks';
import { UserType2 } from "../constants/Auth";
const AuthContext = React.createContext(null);

// This hook can be used to access the user info.
export function useAuth() {
  return React.useContext(AuthContext);
}

// This hook will protect the route access based on user authentication.
function useProtectedRoute(user) {
  const segments = useSegments();
  const router = useRouter();

  React.useEffect(() => {
    const inAuthGroup = segments[0] === "auth";
    const inHome = segments[0] === "home";
    //check if modal or missing
    const inModal = segments[0] === "modal";


    //check if in home page
    console.log("segments", segments);

    console.log("inAuthGroup", inAuthGroup);
    //console.log("user", user);

    let is_user = user.userData.token !== null && user.userData.token !== '';
    let user_type = user.userData.userType;

    //if user is not yet retrieved do nothing
    if (user.userData.token === '') {

        console.log("token is not returned yet wait");


        return;
    }



    if (
      // If the user is not signed in and the initial segment is not anything in the auth group.
      !is_user &&
      !inAuthGroup
    ) {
      // Redirect to the sign-in page.
      router.replace("auth");
      console.log("redirect to sign in");
    } else if (is_user && !inHome && !inModal) {
      // Redirect away from the sign-in page.
      //router.replace("/home");

      console.log("user type", user_type);

      //check user type
      if (user_type === UserType2.RENTER) {
        router.replace("client");
      } else if (user_type === UserType2.PARCEL_DELIVERY) {
        router.replace("courier");
      }else if (user_type === null || isNaN(user_type)) {
        router.replace("auth");
      }
        console.log("redirect to home");
    }
  }, [user]); //segemnts
}

export function ProviderAuth(props) {
  const [user, setAuth] = React.useState(null);

  const secure = useAppSelector((state) => state.secure);
  const dispatch = useAppDispatch();

  useProtectedRoute(secure);

  return (
    <AuthContext.Provider
      value={{
        signIn: () => setAuth({}), //TODO
        signOut: () => setAuth(null),
        user,
      }}
    >
      {props.children}
    </AuthContext.Provider>
  );
}