import { Link, Tabs } from "expo-router";
import { Pressable, useColorScheme } from "react-native";
import Colors from "../../constants/Colors";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Button, IconButton, Snackbar, TextInput } from 'react-native-paper';
import { useAppDispatch } from "../../data/hooks";
import { full_signout } from "../../data/secure";
import { apiSlice } from "../../data/api";
import { useAuth } from "../../auth/provider";
/**
 * You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
 */
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}
function TabBarIcon2(props: {
  name: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  color: string;
}) {
  return <MaterialCommunityIcons size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const dispatch = useAppDispatch();
  const { signOut } = useAuth();



  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme==="dark" ? "dark" : "light"].tint,
      }}
      initialRouteName="cars"
    >

      <Tabs.Screen
        name="profile"

        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
          headerRight: () => (
            
            <IconButton
          icon="logout"
          size={25}
          onPress={() => {

            signOut();

          
          }}
        />
  
              
              
            
          ),

        }}
      />

<Tabs.Screen
        name="cars"
        //set as default

        

        options={{
          title: "Cars",
          headerShown: false,

          tabBarIcon: ({ color }) => <TabBarIcon name="car" color={color} />,
          headerRight: () => (
            
          <IconButton
          icon="logout"
          size={25}

          
          onPress={() => {

            signOut();

          
          }}
        />
  
              
              
            
          ),

        }}
      />

<Tabs.Screen
        name="rides"

        options={{
          title: "Rides",
          tabBarIcon: ({ color }) => <TabBarIcon name="map" color={color} />,
          headerRight: () => (

            <IconButton
          icon="logout"
          size={25}
          onPress={() => {

            signOut();


          }}
        />




          ),

        }}
      />

      <Tabs.Screen
        name="keybot"
        options={{
          title: "KeyBot",
          tabBarIcon: ({ color }) => <TabBarIcon2 name="key-wireless" color={color} />,
          headerRight: () => (
            <IconButton
              icon="logout"
              size={25}
              onPress={() => {
                signOut();
              }}
            />
          ),
        }}
      />



      
    </Tabs>
  );
}

//