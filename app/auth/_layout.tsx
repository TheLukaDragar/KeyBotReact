import { Stack } from "expo-router";






export default function Layout() {
    return <Stack
        screenOptions={
            {
                headerBackVisible: false,
                animation: "none",

            }
        }

        screenListeners={{

        }}>

        <Stack.Screen name="index"
            options={{
                title: "Welcome",
                animation: "none",
                headerShown: false

            }}



        />

        <Stack.Screen name="(intro)"
            options={{
            
                headerShown: false

            }}



        />
      

    </Stack>
}