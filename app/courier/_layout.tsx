import { Link, Tabs } from "expo-router";
import { Pressable, useColorScheme } from "react-native";
import Colors from "../../constants/Colors";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Button, IconButton, Snackbar, TextInput } from 'react-native-paper';
import { useAppDispatch } from "../../data/hooks";
import { full_signout } from "../../data/secure";

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


  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme==="dark" ? "dark" : "light"].tint,
      }}
    >


<Tabs.Screen
        name="incoming"

        options={{
          headerShown: false,
          title: "Parcels to deliver",
          tabBarIcon: ({ color }) => <TabBarIcon2 name="truck-delivery" color={color} />
        }}
         
      />

<Tabs.Screen
        name="index"
        // TODO: Type
        options={{
          title: "Parcels",
          tabBarIcon: ({ color  }) => <TabBarIcon2 name="package-variant-closed" color={color} />,
          headerRight: () => (
            <Link href="/modal" asChild>
              <Pressable>
                {({ pressed }) => (
                  <FontAwesome
                    name="info-circle"
                    size={25}
                    color={Colors[colorScheme==="dark" ? "dark" : "light"].text}
                    style={{ marginRight: 15, opacity: pressed ? 0.5 : 1 }}
                  />
                )}
              </Pressable>
            </Link>
          ),
        }}
      />

      <Tabs.Screen
        name="profile"

        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
          headerRight: () => (
            
            <IconButton
          icon="logout"
          size={25}
          onPress={() =>dispatch(full_signout())}
        />
  
              
              
            
          ),

        }}
      />

      
      
    </Tabs>
  );
}

//