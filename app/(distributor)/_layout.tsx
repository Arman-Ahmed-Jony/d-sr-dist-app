import { Drawer } from 'expo-router/drawer';
import { DistributorDrawerContent } from '@/src/ui/DistributorDrawerContent';
import { colors } from '@/src/theme/tokens';

export default function DistributorLayout() {
  return (
    <Drawer
      drawerContent={(props) => <DistributorDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerPosition: 'right',
        drawerType: 'front',
        drawerStyle: {
          backgroundColor: colors.background,
          width: 300,
        },
        overlayColor: 'rgba(28, 25, 20, 0.4)',
      }}
    >
      <Drawer.Screen name="(app)" options={{ title: 'SR Dist' }} />
    </Drawer>
  );
}
