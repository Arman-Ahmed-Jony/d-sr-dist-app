import { Platform, StyleSheet, View } from 'react-native';
import { Drawer } from 'expo-router/drawer';
import { DsrDrawerContent } from '@/src/ui/DsrDrawerContent';
import { colors } from '@/src/theme/tokens';

export default function DsrLayout() {
  return (
    <View style={styles.root}>
      <Drawer
        drawerContent={(props) => <DsrDrawerContent {...props} />}
        screenOptions={{
          headerShown: false,
          drawerPosition: 'right',
          drawerType: 'front',
          drawerStyle: { backgroundColor: colors.background, width: 300 },
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
  root: { flex: 1, width: '100%', maxWidth: '100%', overflow: 'hidden' },
  scene: { flex: 1, width: '100%', maxWidth: '100%', overflow: 'hidden' },
});
