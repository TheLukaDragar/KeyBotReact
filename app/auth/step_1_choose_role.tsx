import React, { useEffect } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { PaperStyledText, Text, View } from '../../components/Themed';
import { useAppDispatch, useAppSelector } from '../../data/hooks';
import { UserType } from '../../constants/Auth';
import { UserTypesDescriptions } from '../../constants/Auth';
import { useRouter } from 'expo-router';
import { Card } from 'react-native-paper';

export default function Step_1_choose_role() {
  const router = useRouter();
  const secure = useAppSelector((state) => state.secure);
  const dispatch = useAppDispatch();

  useEffect(() => {}, []);

  const setRole = async (role: UserType) => {
    console.log('user chose role', role);
    router.push({
      pathname: 'auth/step_2_create_wallet',
      params: {
        role: role,
      },
    });
  };

  const renderRole = (role: UserType) => (
    
      <Card style={styles.roleCard} 
      onPress={() => setRole(role)}>
        
        <Card.Content>
          <PaperStyledText variant="headlineMedium" style={styles.roleTitle}>{role}</PaperStyledText>
          <PaperStyledText variant="bodyLarge" style={styles.roleDescription}>
            {UserTypesDescriptions[role]}
          </PaperStyledText>
        </Card.Content>
      </Card>
   
  );

  return (

    <View style={styles.container}>


    
        {renderRole(UserType.COURIER)}
        {/* {renderRole(UserType.VEHICLE_OWNER)} */}
        {renderRole(UserType.CLIENT)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  roleCard: {
    marginTop: 10,
    marginBottom: 10,
    minHeight: 160,
    justifyContent: 'center',
  },
  roleTitle: {
   
   
   
  },
  roleDescription: {
   
   
  },
});
