import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { Button, Image, StyleSheet, View } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type Entry = {
  id: number;
  deviceName: string;
  time: string;
};

export default function HomeScreen() {
  const [entries, setEntries] = useState<Entry[]>([]);

  // Load stored entries on app start
  useEffect(() => {
    const loadEntries = async () => {
      try {
        const stored = await AsyncStorage.getItem('historyEntries');
        if (stored) {
          setEntries(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Failed to load entries:', error);
      }
    };
    loadEntries();
  }, []);

  // Add new entry manually
  const addEntry = async () => {
    const now = new Date();
    const newEntry: Entry = {
      id: Date.now(),
      deviceName: `Device ${entries.length + 1}`,
      time: now.toLocaleTimeString(),
    };

    const updated = [newEntry, ...entries];
    setEntries(updated);
    await AsyncStorage.setItem('historyEntries', JSON.stringify(updated));
  };

  // Clear history completely
  const clearHistory = async () => {
    await AsyncStorage.removeItem('historyEntries');
    setEntries([]);
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#ffffffff' }}
      headerImage={
        <ThemedView style={styles.headerContainer}>
          <ThemedText type="subtitle" style={styles.headerTitle}>
            Guardian
          </ThemedText>
          <ThemedText type="subtitle" style={styles.headerTitle}>
            Lens
          </ThemedText>
        </ThemedView>
      }
    >
      {/* History Section */}
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">History</ThemedText>

        <View style={styles.boxContainer}>
          {entries.map((entry) => (
            <ThemedView key={entry.id} style={styles.roundedBox}>
              <ThemedText style={styles.boxText}>{entry.deviceName}</ThemedText>
              <ThemedText style={styles.boxContent}>
                Time: {entry.time}
              </ThemedText>
            </ThemedView>
          ))}

          {entries.length === 0 && (
            <ThemedView style={styles.roundedBox}>
              <ThemedText style={styles.boxContent}>No scans yet.</ThemedText>
            </ThemedView>
          )}
        </View>
      </ThemedView>

      {/* Icons & Buttons */}
      <ThemedView style={styles.bottomContainer}>
        <View style={styles.iconContainer}>
          <Image
            source={require('@/assets/images/phone.png')}
            style={styles.icon}
            resizeMode="contain"
          />
          <Image
            source={require('@/assets/images/emergency.png')}
            style={styles.icon}
            resizeMode="contain"
          />
        </View>

        <View style={styles.buttonRow}>
          <View style={styles.buttonWrapper}>
            <Button title="Add Entry" onPress={addEntry} color="#f47b20" />
          </View>
          <View style={styles.buttonWrapper}>
            <Button title="Clear History" onPress={clearHistory} color="#999" />
          </View>
        </View>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9a683ff',
  },
  headerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 40,
    fontWeight: 'bold',
    color: '#000',
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 5,
  },
  boxContainer: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 10,
  },
  roundedBox: {
    borderRadius: 16,
    backgroundColor: '#f2f2f2df',
    opacity: 0.9,
    padding: 10,
  },
  boxText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  boxContent: {
    color: '#000000ff',
    fontSize: 13,
    fontWeight: '600',
    paddingTop: 4,
  },
  bottomContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  iconContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 10,
  },
  icon: {
    width: 60, // 🔹 slightly smaller
    height: 60,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginTop: 15,
    width: '100%',
  },
  buttonWrapper: {
    width: '40%',
  },
});
