// SettingsScreen.tsx
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export const SettingsScreen = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [location, setLocation] = useState(false);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Settings</Text>

      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.label}>Dark Mode</Text>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            thumbColor={darkMode ? '#fff' : '#f4f3f4'}
            trackColor={{ false: '#767577', true: '#34C759' }}
          />
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.label}>Notifications</Text>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            thumbColor={notifications ? '#fff' : '#f4f3f4'}
            trackColor={{ false: '#767577', true: '#34C759' }}
          />
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.label}>Location Access</Text>
          <Switch
            value={location}
            onValueChange={setLocation}
            thumbColor={location ? '#fff' : '#f4f3f4'}
            trackColor={{ false: '#767577', true: '#34C759' }}
          />
        </View>
      </View>
      <View style={styles.section}>
        <TouchableOpacity style={styles.row}>
          <Text style={styles.label}>Change Password</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.row}>
          <Text style={styles.label}>Privacy Policy</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.row}>
          <Text style={[styles.label, { color: '#FF453A' }]}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    fontSize: 34,
    fontWeight: '700',
    color: '#fff',
    marginTop: 50,
    marginBottom: 20,
    marginHorizontal: 20,
  },
  section: {
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 24,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 17,
    color: '#fff',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#38383A',
    marginLeft: 20,
  },
});

export default SettingsScreen;
