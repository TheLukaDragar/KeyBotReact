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
        <Stack.Screen name="intro_1"
        options={
            {
                animation: "slide_from_right",
            }
        }
        />
        <Stack.Screen name="intro_2"
        options={
            {
                animation: "slide_from_right",
            }
        }

        />
        <Stack.Screen name="intro_3"
        options={
            {
                animation: "slide_from_right",
            }
        }

        />
    </Stack>
}