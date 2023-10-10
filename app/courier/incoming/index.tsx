import { FlatList, StyleSheet } from 'react-native';

import { useRouter } from 'expo-router';
import { Avatar, Button, Caption, Card, Title } from 'react-native-paper';
import { Text, View } from '../../../components/Themed';
import { useAppDispatch, useAppSelector } from '../../../data/hooks';

import { getErrorMessage, useGetMeQuery } from '../../../data/api';

import '@ethersproject/shims';





export default function Incoming() {



  const router = useRouter();

  const secure = useAppSelector((state) => state.secure);
  const blockchain = useAppSelector((state) => state.blockchain);
  const dispatch = useAppDispatch();

  const { data, error, isLoading, isFetching, isError } = useGetMeQuery(undefined, {
    refetchOnMountOrArgChange: true,
    skip: false,
  });

  const mockData = [
    {
      id: '1345346363464634634',
      trackingNumber: '1345346363464634634',
      title: 'Parcel 1',
      sender: 'John Doe',
      receiver: 'Jane Smith',
      receiver_address: '0xD52C27CC2c7D3fb5BA4440ffa825c12EA5658D60',
      address: 'Letališka cesta 32j, 1000 Ljubljana',
      location: {
        //46.061435133663394, 14.571106622081325
        latitude: 46.061435133663394,
        longitude: 14.571106622081325,
        inaccuracy: 10,
      }

    },
    {
      id: '1345346363464654434',
      trackingNumber: '1345346363464654434',
      title: 'Parcel 2',
      sender: 'Sender 2',
      receiver: 'Receiver 2',
      address: 'Address 2',
      receiver_address: '0xD52C27CC2c7D3fb5BA4440ffa825c12EA5658D60',
      location: {
        latitude: 45.767,
        longitude: 4.833,
        inaccuracy: 10,
      }


    },
  ]
  const renderItem = ({ item }: { item: any }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.titleRow}>
          <Avatar.Icon icon="package-variant-closed" size={46} />
          <Title style={styles.cardTitle}>{item.title}</Title>
        </View>
        <Title style={styles.details}>Tracking Number: <Caption style={styles.details}>{item.trackingNumber}</Caption></Title>
        <Title style={styles.details}>Recipient address: <Caption style={styles.details}>{item.address}</Caption></Title>

        <Title style={styles.details}>Sender: <Caption style={styles.details}>{item.sender}</Caption></Title>
        <Title style={styles.details}>Recipient: <Caption style={styles.details}>{item.receiver}</Caption></Title>
    
        <Title style={styles.details}>Recipient wallet adddres: <Caption style={styles.details}>{"\n"+item.receiver_address}</Caption></Title>

      </Card.Content>
      <Card.Actions>
        <Button style={styles.button}

          icon="truck-fast" mode="contained"
          onPress={() => router.push({
            pathname: '/courier/incoming/newparcel',
            params: {
              id: item.id,
              title: item.title,
              sender: item.sender,
              receiver: item.receiver,
              receiver_address: item.receiver_address,
              address: item.address,
              location: JSON.stringify(item.location),
              trackingNumber: item.trackingNumber,
            },
          })}>
          Deliver
        </Button>
      </Card.Actions>
    </Card>


  );


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
  else if (mockData) {
    return (
      <View style={styles.container}>
        <FlatList
          data={mockData}
          renderItem={renderItem}
          keyExtractor={item => item.id}
        />
      </View>
    );



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
    padding: 10,
  },
  card: {
    margin: 10,
    borderRadius: 5,
  },
  cardTitle: {
    fontSize: 20,
    marginLeft: 10, // To provide some spacing between the icon and the title
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center', // This aligns the icon and the title vertically
    backgroundColor: 'transparent',
    marginBottom: 10,
  },
  details: {
    fontSize: 14,
  },
  button: {

  },

});
