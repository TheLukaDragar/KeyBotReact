import { Stack } from "expo-router";
export default function Layout() {
    return <Stack
        screenOptions={
            {
                headerShown: true,
                animation: "none"


            }


        }
        screenListeners={{
        }}>

        <Stack.Screen name="index"
        options={
            {
                title: "Parcels to deliver",
                animation: "none",
            }
            
        }
        />
        <Stack.Screen name="newparcel"
        options={
            {
                title: "New Parcel",
                animation: "slide_from_right",
            }
            
        }
        />
      

       
    </Stack>
}