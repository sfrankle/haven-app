import { StyleSheet, Text, View } from 'react-native';

export default function TraceScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Trace</Text>
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
