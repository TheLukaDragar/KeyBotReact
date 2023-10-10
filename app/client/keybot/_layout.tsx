import { Stack } from "expo-router";
export default function Layout() {
    return <Stack
        screenOptions={
            {
                headerShown: false,
                animation: "none"


            }


        }
        screenListeners={{
        }}>

        <Stack.Screen name="index"
        options={
            {
                animation: "none",
            }
            
        }

        />
        <Stack.Screen name="[id]/index"
        options={
            {
                animation: "slide_from_bottom",
            }
        }
        />
         <Stack.Screen name="[id]/control"
        options={
            {
                animation: "slide_from_bottom",
            }
        }
        />

      

       
    </Stack>
}