import { useTheme } from 'react-native-paper';
import { View } from '../components/Themed';

const ScreenIndicators = ({
    count,
    activeIndex,
}: {
    count: number;
    activeIndex: number;
}) => {
    const theme = useTheme();
    //console.log(theme);
    return (
        <View
            style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginVertical: 32,
            }}
        >
            {new Array(count).fill("1").map((_, i) => (
                <View
                    style={{
                        width: 8,
                        height: 8,
                        borderRadius: 8,
                        backgroundColor:
                            i === activeIndex ? theme.colors.primary : theme.colors.primaryContainer,
                    }}
                    key={i}
                />
            ))}
        </View>
    );
};

export default ScreenIndicators;