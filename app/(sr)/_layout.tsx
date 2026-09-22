import { Stack } from 'expo-router';
import { colors } from '@/src/theme/tokens';

export default function SrLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="dashboard" options={{ title: 'Dashboard' }} />
    </Stack>
  );
}
