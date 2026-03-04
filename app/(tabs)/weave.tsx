import { StyleSheet, Text, View } from 'react-native';

export default function WeaveScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Weave</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3E6',
  },
  label: {
    fontSize: 24,
    color: '#361B45',
  },
});
