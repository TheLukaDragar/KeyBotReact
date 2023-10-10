import { useRouter } from 'expo-router';
import { Button } from 'react-native-paper';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView, Text, View, getTheme } from '../../../components/Themed';
import { INTRO_SCREEN_01, INTRO_SCREEN_02 } from '../../../constants/Intro';
import ScreenIndicators from '../../../components/ScreenIndicators';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


export default function Intro_2() {


  const router = useRouter();
  const insets = useSafeAreaInsets();



  return (
    <View style={{ // Paddings to handle safe area
      flex: 1,
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
      paddingLeft: insets.left,
      paddingRight: insets.right, }}>
      <Animated.View
        entering={FadeInUp.duration(1000).springify()}
        style={{ alignItems: "center", flex: 1, justifyContent: "center" }}
      >
          <Text> TODO: Add image here </Text>
        

      </Animated.View>
      <View style={{ padding: 24 }}>
        <Animated.Text
          entering={FadeInDown.duration(1000).springify()}
          style={{
            fontSize: 40, fontWeight: "800", color: getTheme().text
          }}

        >
          {INTRO_SCREEN_02.title}
        </Animated.Text>
        <Animated.Text
          entering={FadeInDown.delay(100).duration(1000).springify()}
          style={{
            opacity: 0.5,
            marginTop: 16,
            fontSize: 16,
            color: getTheme().text,
          }}
        >
          {INTRO_SCREEN_02.description}
        </Animated.Text>
        <Animated.View
          entering={FadeInDown.delay(200).duration(1000).springify()}
        >
          <ScreenIndicators count={3} activeIndex={1} />
        </Animated.View>
        <Animated.View
          entering={FadeInDown.delay(400).duration(1000).springify()}
          style={{ alignItems: "center" }}
        >
          <Button
            mode="contained"

            onPress={() => router.push('auth/intro_3')}
          >
            Next
          </Button>
        </Animated.View>
      </View>
    </View >

  );

}

