import { StyleSheet } from 'react-native';

import { useRouter, useSearchParams } from 'expo-router';
import { Button } from 'react-native-paper';
import { Text, View } from '../../components/Themed';
import { useAppDispatch, useAppSelector } from '../../data/hooks';

import { useFocusEffect } from '@react-navigation/native';
import React, { useState } from 'react';
import Toast from 'react-native-root-toast';
import PinInput from '../../components/PinInput';
import { UserType, UserType2 } from '../../constants/Auth';
import { createWallet, setUserType } from '../../data/secure';







export default function step_2_create_wallet() {

  const router = useRouter();
  const secure = useAppSelector((state) => state.secure);
  const dispatch = useAppDispatch();

  //state for pin
  const [pinn, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [match, setMatch] = useState(false);
  const [loading, setLoading] = useState(false);
  const params = useSearchParams();



  useFocusEffect(
    React.useCallback(() => {
      const role = params.role as UserType;
      console.log("role is " + role)
      console.log("secure updated in step 1");
      if (role !== UserType.CLIENT && role !== UserType.COURIER  ) {
        Toast.show("Role not supported yet");
        router.back();
        return;
      }



      //if wallet is set, go to step 2
      if (secure.is_wallet_setup) {

        console.log("wallet is created");
        Toast.show("Wallet created");
        //get role 
       
        if (role == undefined) {
          console.log("role is undefined");
          return;
        }

        //route based on role
        if (role == UserType.CLIENT) {
          router.replace('auth/step_4_client_setup');

        }else if (role == UserType.COURIER) {
          router.replace('auth/step_4_courier_setup');
        }

        
        else {
          Toast.show("Role not supported yet");
          //go back to role selection
          router.back();
        }

        setLoading(false);
      }
      else {
        console.log("wallet is not created");
        setLoading(false);
      }
    }, [secure.is_wallet_setup])
  );

  return (
    <View style={styles.container}>

      <Text
        style={{ marginTop: 20, padding: 10 }}
      >
        {pinConfirm == '' ? "Please set a pin for the app" : [pinConfirm == pinn ? "Pin set" : "Please confirm your pin"]}
      </Text>




      <View
        pointerEvents={match ? "none" : "auto"}


      >
        <PinInput

          check={pinConfirm == '' ? '' : pinConfirm}

          length={4} onChange={(pin) => { setPin(pin) }

          }
          onFulfill={(pin) => {

            if (pinConfirm == '') {
              setPin("");
              setPinConfirm(pin);
              console.log("confirm please");
            } else {


              if (pinConfirm == pin) {
                console.log("match");
                setMatch(true);
                //remove focus from pin input
              }
              else {
                console.log("no match");
                setMatch(false);
              }


            }
          }} />

      </View>


      <Button
        disabled={(pinn.length < 4 && pinConfirm == '') || (!match && pinConfirm != '')}
        onPress={() => {

          if (pinConfirm == '') {
            setPin("");
            setPinConfirm(pinn);
          } else {
            if (pinConfirm == pinn) {


              setLoading(true);
              setTimeout(async () => {
                await dispatch(createWallet(pinn)).unwrap();
                //TODO change enums to us2
                await dispatch(setUserType(params.role as UserType == UserType.CLIENT ? UserType2.RENTER : params.role as UserType == UserType.COURIER ? UserType2.PARCEL_DELIVERY : UserType2.PARCEL_RECEIVER)).unwrap();
                
              }, 100);
            }

          }

        }
        }

        loading={loading}

        mode="contained"
        style={{ marginTop: 20, padding: 10 }}>
        {loading ? "creating wallet" : "next"}
      </Button>



    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
});
