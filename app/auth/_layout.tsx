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
                animation: "none"

            }}


        />
        <Stack.Screen name="step_1_choose_role"
            options={{
                title: "Choose Role",
                animation: "slide_from_right"

            }}


        />
        <Stack.Screen name="step_2_create_wallet"
            options={{
                title: "Create Wallet",
                animation: "slide_from_right"

            }}


        />
        <Stack.Screen name="step_3_write_down_mnemonic"
            options={{
                title: "Write Down Mnemonic",
                animation: "slide_from_right"

            }}


        />

        <Stack.Screen name="step_4_client_setup"
            options={{
                title: "Client Setup",
                animation: "slide_from_right"

            }}


        />
        <Stack.Screen name="step_4_courier_setup"
            options={{
                title: "Courier Setup",
                animation: "slide_from_right"

            }}


        />
       
    </Stack>
}