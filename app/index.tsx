import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/src/context/AuthContext';
import { colors } from '@/src/theme/tokens';

export default function Index() {
  const { profile, loading, firebaseUser } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!firebaseUser || !profile) {
    return <Redirect href="/(auth)/login" />;
  }

  if (profile.role === 'distributor') {
    return <Redirect href="/(distributor)/(app)/dashboard" />;
  }

  return <Redirect href="/(sr)/(app)/dashboard" />;
}
