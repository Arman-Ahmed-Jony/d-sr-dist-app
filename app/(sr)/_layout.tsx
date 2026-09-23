import { Platform, StyleSheet, View } from 'react-native';
import { Drawer } from 'expo-router/drawer';
import { SrDrawerContent } from '@/src/ui/SrDrawerContent';
import { colors } from '@/src/theme/tokens';

export default function SrLayout() {
  return (
    <View style={styles.root}>
      <Drawer
        drawerContent={(props) => <SrDrawerContent {...props} />}
        screenOptions={{
          headerShown: false,
          drawerPosition: 'right',
          drawerType: 'front',
          drawerStyle: {
            backgroundColor: colors.background,
            width: 300,
          },
          overlayColor: 'rgba(28, 25, 20, 0.4)',
          sceneStyle: Platform.OS === 'web' ? styles.scene : undefined,
        }}
      >
        <Drawer.Screen name="(app)" options={{ title: 'SR Dist' }} />
      </Drawer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  scene: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
});
