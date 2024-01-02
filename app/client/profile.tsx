import { StyleSheet } from 'react-native';
import { Avatar, Caption, Card, Divider, Title } from 'react-native-paper';
import { Text, View } from '../../components/Themed';
import { useAuth } from '../../auth/provider';

export default function Profile() {

  const { user } = useAuth();

  console.log(user);



  if (user) {
    return <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>

          <Avatar.Image size={64} source={{ uri: user.photoURL }} />

          {/* <Avatar.Text size={64} label={user.displayName.charAt(0).toUpperCase()} /> */}

          <Title>
            {user.displayName}

          </Title>

          <Caption>Email: {user.email || 'not provided'}</Caption>

          <Divider style={styles.divider} />

          <Caption>
            {JSON.stringify(user)}

          </Caption>




        </Card.Content>

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
