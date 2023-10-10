import { StyleSheet } from 'react-native';

import { useRouter } from 'expo-router';
import { Button, Chip, Dialog, Portal } from 'react-native-paper';
import { Text, View } from '../../components/Themed';
import { useAppDispatch, useAppSelector } from '../../data/hooks';

import React, { useEffect } from 'react';



export default function step_3_write_down_mnemonic() {

  const router = useRouter();

  const secure = useAppSelector((state) => state.secure);
  const dispatch = useAppDispatch();

  const [visible, setVisible] = React.useState(false);

  const [confirmed, setConfirmed] = React.useState(false);


  useEffect(() => {



    if (secure.keyChainData.mnemonic == null) {
      router.push('auth/step_3_choose_role');
    }











  }, [])

  let chips = [];
  if (secure.keyChainData.mnemonic != null) {
    for (let i = 0; i < secure.keyChainData.mnemonic!.split(" ").length; i++) {
      chips.push(<Chip key={i}
        style={{ margin: 5 }}
        mode="flat"

      ><Text>{secure.keyChainData.mnemonic!.split(" ")[i]}</Text></Chip>)
    }
  }





  return (
    <View style={styles.container}>

      <Text

        style={{ fontSize: 15, textAlign: 'center', margin: 20 }}

      >
        Please write down your mnemonic phrase and store it in a safe place.

      </Text>

      <View style={{
        flexDirection: 'row', flexWrap: 'wrap',
        justifyContent: 'center', marginTop: 0

      }}>

        {chips}

        <Portal>
          <Dialog visible={visible} onDismiss={() => setVisible(false)}>
            <Dialog.Title>Confirm</Dialog.Title>
            <Dialog.Content>
              <Text
                style={{ fontSize: 15 }}

              >
                I have written down my mnemonic phrase and stored it in a safe place.
              </Text>

              <Text
                style={{ fontSize: 15, marginTop: 10 }}

              >
                I understand that if I lose my mnemonic phrase, I will lose access to my account.
              </Text>


            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => {
                setVisible(false);
                setConfirmed(true);
              }

              }>OK
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>





      </View>

      <Button

        style={{ marginTop: 80, alignSelf: 'center' }}
        mode="contained"
        contentStyle={{ flexDirection: 'row-reverse', width: 300, padding: 10 }}

        onPress={() => {
          if (!confirmed) {
            setVisible(true);
          }
          else {
            console.log("confirmed");
            router.push('auth/step_3_choose_role');
          }
        }}
      >

        {confirmed ? "Continue" : "Next"}

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
