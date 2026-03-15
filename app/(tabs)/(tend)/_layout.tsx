import { useEffect } from 'react';
import { Stack, useNavigation } from 'expo-router';
import { StackActions } from '@react-navigation/native';

export default function TendLayout() {
  const navigation = useNavigation();

  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      navigation.dispatch(StackActions.popToTop());
    });
    return unsubscribe;
  }, [navigation]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
