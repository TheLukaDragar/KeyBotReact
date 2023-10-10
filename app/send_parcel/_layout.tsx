import { Link, Tabs,  Stack } from "expo-router";
import { Pressable, useColorScheme } from "react-native";
import Colors from "../../constants/Colors";
import FontAwesome from "@expo/vector-icons/FontAwesome";


export default function StackLayout() {
  return (
    <Stack 
    screenOptions={
      {
          headerBackVisible: false,
          animation: "none",

      }
  }

  screenListeners={{

  }}>

  <Stack.Screen name="step_1_choose_box"
      options={{
          title: "Choose Box",
          animation: "none"
      }}
  />

  <Stack.Screen name="step_2_parcel_details"
      options={{
          title: "Parcel Details",
          animation: "slide_from_right"
      }}
  />
  
  

  </Stack>

      
  );
}


