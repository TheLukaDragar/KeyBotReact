import React, { useEffect } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { Avatar, Card, Title, useTheme } from 'react-native-paper';
import { View } from './Themed';

type StepCardProps = {
  title: string;
  status: 'completed' | 'pending' | 'error';
  style?: ViewStyle; // Optional style prop
};

const StepCard: React.FC<StepCardProps> = ({ title, status, style }) => {
  let icon;

  const theme = useTheme();

  useEffect(() => {
    if (status === 'error') {

    }
  }
    , [status, title]);

  if (status === 'completed') {
    icon = 'check-circle';
  } else if (status === 'error') {
    icon = 'alert-circle';
  } else {
    icon = 'circle';
  }

  return (
    <Card style={[styles.card, style]}>
      <Card.Content>
        <View style={styles.titleRow}>
          <View style={{ ...styles.verticalLine, backgroundColor: theme.colors.primary }} />
          <Avatar.Icon icon={icon} size={32} />
          <View style={{ flex: 1, backgroundColor: 'transparent' }}>
            <Title style={styles.cardTitle}>{title}</Title>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
};
//backgroundColor : 'transparent'
const styles = StyleSheet.create({
  card: {
    borderRadius: 0,
  },
  cardTitle: {
    fontSize: 15,
    marginLeft: 10, // To provide some spacing between the icon and the title
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center', // This aligns the icon and the title vertically
    backgroundColor: 'transparent',
  },
  verticalLine: {
    position: 'absolute',
    height: '200%',
    width: 2,
    left: 15,
  },
});

export default StepCard;
