import { StyleSheet } from 'react-native';

import { useRouter } from 'expo-router';
import { Avatar, Button, Caption, Card, Divider, List, Modal, Paragraph, Portal, TextInput, Title } from 'react-native-paper';
import { Text, View } from '../../components/Themed';
import { useAppDispatch, useAppSelector } from '../../data/hooks';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { User, UserName, getErrorMessage, useGetMeQuery, useUpdateMeMutation } from '../../data/api';

import '@ethersproject/shims';
import * as Clipboard from 'expo-clipboard';
import { CustomJsonRpcProvider, getBalance, getReputation } from '../../data/blockchain';

import { ethers } from 'ethers';
import Constants from 'expo-constants';
import PinInput from '../../components/PinInput';


const RPCUrl = Constants?.expoConfig?.extra?.RPCUrl;
const explorerUrl = Constants?.expoConfig?.extra?.explorerUrl;




function BlockchainBalance({ balance }: { balance: number | null }) {
  let description = "";

  if (balance === null) {
    description = "Loading";
  } else if (balance === -1) {
    description = `Could not retrieve balance`;
  } else {
    description = String(balance) + " xRLC";
  }

  return (
    <List.Item
      title="Balance"
      description={description}
    />
  );
}


function BlockchainReputation({ reputation }: { reputation: number | null }) {


  let description = "";

  if (reputation === null) {
    description = "Loading";
  } else if (reputation === -1) {
    description = `Could not retrieve reputation`;
  } else {
    description = String(reputation);
  }

  return <Paragraph>Reputation: {description}</Paragraph>

}
function WalletStatusIcon({ status }: { status: string }) {
  let iconName = "" as "sync" | "circle" | "alert-circle";
  let iconColor = "";

  if (status === "connecting") {
    iconName = "sync";
    iconColor = "#FFFF33";  // Electric Yellow
  } else if (status === "connected") {
    iconName = "circle";
    iconColor = "#39FF14";  // Neon Green
  } else {
    iconName = "alert-circle";
    iconColor = "#FF0033";  // Electric Red
  }


  return <MaterialCommunityIcons name={iconName} color={iconColor} size={12} style={{ marginRight: 40, paddingBottom: 12 }} />;
}


export default function Profile() {



  const router = useRouter();

  const secure = useAppSelector((state) => state.secure);
  const blockchain = useAppSelector((state) => state.blockchain);
  const dispatch = useAppDispatch();

  const { data, error, isLoading, isFetching, isError } = useGetMeQuery(undefined, {
    refetchOnMountOrArgChange: true,
    skip: false,
  });

  //useUpdateMeMutation

  const [updateMe, { isLoading: isUpdating }] = useUpdateMeMutation();

  const [walletConnected, setWalletConnected] = React.useState("connecting");




  const provider = new CustomJsonRpcProvider(RPCUrl);

  const wallet = secure.keyChainData?.privateKey ? new ethers.Wallet(secure.keyChainData?.privateKey, provider) : null;


  const [match, setMatch] = useState(false);
  const [visible, setVisible] = React.useState(false);

  const hideModal = () => setVisible(false);
  const [statusText, setStatusText] = useState("Please enter your PIN to confirm");

  const funcionExport = () => {
    console.log("export");



    Clipboard.setStringAsync(secure.keyChainData?.privateKey || '');

    setStatusText("Your private key has been copied");

  };

  console.log(data)



  //check if wallet is connected



  const fetchBlockchainData = useCallback(async () => {
    try {
      if (!wallet) {
        return;
      }
      await dispatch(getReputation(wallet.address)).unwrap();
      await dispatch(getBalance(wallet.address));
      //check if wallet is connected
      wallet.getBalance().then((balance) => {
        console.log("wallet conected");
        setWalletConnected("connected");
      }).catch((error) => {
        console.log("wallet not conected");
        setWalletConnected("not connected");
      });
    } catch (error) {
      console.error("Error fetching blockchain data", error);
    }
  }, [wallet, dispatch]);




  useEffect(() => {
    fetchBlockchainData();
  }, [fetchBlockchainData]);


  const [name, setName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);



  const handleNameEditPress = () => {
    setIsEditingName(true);
  };

  const handleContainerPress = () => {
    if (isEditingName) {
      setIsEditingName(false);
    }
  };

  const validateName = (name: string) => {
    const re = /^[a-z ,.'-]+$/i;
    return re.test(name);
  };

  const handleNameEndEditing = async () => {
    try {
      if (data && name !== `${data.firstName} ${data.lastName}`) {
        if (!validateName(name)) {
          alert('Invalid name, please enter a correct name.');
          return;
        }
        const newUser = { ...data } as UserName & User;
        const nameParts = name.split(' ');
        newUser.firstName = nameParts[0];
        newUser.lastName = nameParts.slice(1).join(' ');
        await updateMe(newUser).unwrap();
      }
      setIsEditingName(false);
    } catch (err) {
      console.error(err);
    }
  };

  if (isError) {

    return <View style={styles.container}>
      <Text>Error: {getErrorMessage(error)}</Text>
    </View>
  }
  else if (isLoading) {
    return <View style={styles.container}>
      <Text>Loading...</Text>
    </View>


  } else if (isFetching) {
    return <View style={styles.container}>
      <Text>Updating...</Text>
    </View>

  }
  else if (data) {
    return <View style={styles.container}>
      <Portal>
        <Modal visible={visible} onDismiss={hideModal} contentContainerStyle={styles.containerStyle}>

          <Card
            style={{ paddingTop: 40, paddingBottom: 20 }}>

            <Card.Title
              title={match ? "Confirmed" : "Confirm PIN"}
              subtitle={statusText}
              left={(props) => <Avatar.Icon {...props} icon={match ? "lock-open" : "lock"} />}
            />
            <PinInput
              length={4} onChange={(pin) => {
                console.log("Entered pin: ", pin);

                if (secure.keyChainData.pin === pin) {
                  console.log("match");
                  setMatch(true);
                  setStatusText("Key will be exported to clipboard");


                } else {
                  console.log("no match");
                  setMatch(false);

                }
              }}
              onFulfill={(pin) => {

                console.log("Entered pin: ", pin);

                if (secure.keyChainData.pin === pin) {
                  console.log("match");
                  setMatch(true);
                  setStatusText("Key will be exported to clipboard");


                } else {
                  console.log("no match");
                  setMatch(false);

                }
              }}
            />

            <Card.Actions>
              <Button onPress={
                () => {
                  if (match) {
                    funcionExport();

                  }
                  else {
                    hideModal();
                  }
                }




              } mode='contained'
                icon={match ? "content-copy" : "cancel"}

              >
                {match ? "Copy Private Key" : "Cancel"}
              </Button>
            </Card.Actions>
          </Card>
        </Modal>

      </Portal>
      <Card style={styles.card}>
        <Card.Content>

          <Avatar.Text size={64} label={data.authUser.username.charAt(0).toUpperCase()} />

          <Title>
            {data.authUser.username}

          </Title>

          <Caption>Email: {data.authUser.email || 'not provided'}</Caption>

          {isEditingName ? (
            <TextInput
              value={name}
              onChangeText={setName}
              style={{ height: 40, borderColor: 'gray', borderWidth: 1 }}
              onEndEditing={handleNameEndEditing}
              autoFocus
            />
          ) : (
            <Caption>
              Name: {`${data.firstName} ${data.lastName}` || 'Not provided'}
              <MaterialCommunityIcons name="pencil" onPress={handleNameEditPress} />
            </Caption>
          )}


          <Divider style={styles.divider} />


          <BlockchainReputation reputation={blockchain.reputation} />


          <Divider style={styles.divider} />


        </Card.Content>
        <Card style={styles.walletCard}>

          <Card.Title title="Wallet" right={() => <WalletStatusIcon status={walletConnected} />} />


          <Card.Content>
            <List.Item
              title="Address"
              description={data.crypto[0]?.wallet || 'Not provided'}
              right={(props) => <MaterialCommunityIcons {...props} name="content-copy" />}
              onPress={() =>
                Clipboard.setStringAsync(data.crypto[0]?.wallet || 'Not provided')
              }






            />
            <BlockchainBalance balance={blockchain.balance} />

          </Card.Content>
          <Card.Actions>
            <Button mode="contained" buttonColor='#fcd15a' textColor='#000000' disabled={!walletConnected}
              onPress={() => Linking.openURL(explorerUrl + "/address/" + wallet!.address



              )}>View Transactions</Button>
            <Button mode="contained" buttonColor='#fcd15a' textColor='#000000' onPress={() => {
              setVisible(true);
              setStatusText("Please enter your PIN to confirm");
              setMatch(false);
            }}>Export</Button>
          </Card.Actions>
        </Card>
      </Card>





    </View>



  }
  else {
    return <View style={styles.container}>
      <Text>Something went wrong</Text>
    </View>

  }


}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '90%',
    height: '90%',
    elevation: 0,
    shadowColor: 'transparent',
    backgroundColor: 'transparent',

  },
  walletCard: {

    width: '100%',

    shadowColor: 'transparent',
    backgroundColor: 'transparent',
    elevation: 2,

  },
  userInfoSection: {
    paddingLeft: 20,
  },
  detailsSection: {
    paddingLeft: 20,
  },
  divider: {
    marginVertical: 10,
  },
  containerStyle: {
    padding: 10, height: '60%'

  },

});
