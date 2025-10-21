import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import { Button, Image, ScrollView, StyleSheet, View } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import AppSync from './aws-config';
import { SUBSCRIBE_EVENTS } from './graphql';

type Entry = {
  id: number;
  deviceName: string;
  time: string;
};

type LiveEvent = {
  id: string;
  status: string;
  message: string;
  location: string;
  timestamp: string;
};

export default function HomeScreen() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const ws = useRef<WebSocket | null>(null);

  // Load local entries
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('historyEntries');
        if (stored) setEntries(JSON.parse(stored));
      } catch (error) {
        console.error('⚠️ Failed to load local entries:', error);
      }
    })();
  }, []);

  // Connect to AppSync realtime and listen for alerts
  useEffect(() => {
    ws.current = new WebSocket(AppSync.realtimeEndpoint, 'graphql-ws');

    ws.current.onopen = () => {
      console.log('WebSocket connected to AppSync');
      // Initialize connection
      ws.current?.send(
        JSON.stringify({
          type: 'connection_init',
          payload: { headers: { 'x-api-key': AppSync.apiKey } },
        })
      );

      // Subscribe to alert events
      setTimeout(() => {
        ws.current?.send(
          JSON.stringify({
            id: '1',
            type: 'start',
            payload: { query: SUBSCRIBE_EVENTS },
          })
        );
        console.log('Subscribed to live AppSync alerts');
      }, 1000);
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'data' && data.payload?.data?.onAddEvent) {
          const newEvent = data.payload.data.onAddEvent;
          console.log('Received alert:', newEvent);
          setLiveEvents((prev) => [newEvent, ...prev]);
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    ws.current.onerror = (err) => console.error('WebSocket error:', err);
    ws.current.onclose = () => console.log('WebSocket closed');
    return () => ws.current?.close();
  }, []);

  // Add local-only entry (no network)
  const addEntry = async () => {
    const now = new Date();
    const newEntry: Entry = {
      id: Date.now(),
      deviceName: `Device ${entries.length}`,
      time: now.toLocaleTimeString(),
    };
    const updated = [newEntry, ...entries];
    setEntries(updated);
    await AsyncStorage.setItem('historyEntries', JSON.stringify(updated));
    console.log('🗒️ Added local entry:', newEntry);
  };

  // Clear local entries
  const clearHistory = async () => {
    try {
      await AsyncStorage.removeItem('historyEntries');
      setEntries([]);
      console.log('🧹 Local history cleared');
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#A1CEDC' }}
      headerImage={
        <ThemedView style={styles.headerContainer}>
          <View style={styles.headerRow}>
            <View style={styles.headerTextContainer}>
              <ThemedText type="subtitle" style={styles.headerTitle}>
                Guardian
              </ThemedText>
              <ThemedText type="subtitle" style={styles.headerTitle}>
                Lens
              </ThemedText>
            </View>
            <Image
              source={require('@/assets/images/personFalling.png')}
              style={styles.headerIcon}
              resizeMode="contain"
            />
          </View>
        </ThemedView>
      }
    >
      {/* Local History */}
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">Local History</ThemedText>
        <View style={styles.boxContainer}>
          {entries.length > 0 ? (
            entries.map((entry) => (
              <ThemedView key={entry.id} style={styles.roundedBox}>
                <ThemedText style={styles.boxText}>{entry.deviceName}</ThemedText>
                <ThemedText style={styles.boxContent}>Time: {entry.time}</ThemedText>
              </ThemedView>
            ))
          ) : (
            <ThemedView style={styles.roundedBox}>
              <ThemedText style={styles.boxContent}>No local scans yet.</ThemedText>
            </ThemedView>
          )}
        </View>
      </ThemedView>

      {/* Live Alerts */}
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">Live Alerts</ThemedText>
        <ScrollView style={styles.boxContainer}>
          {liveEvents.length > 0 ? (
            liveEvents.map((item) => (
              <ThemedView key={item.id} style={styles.roundedBox}>
                <ThemedText style={styles.boxText}>Status: {item.status}</ThemedText>
                <ThemedText style={styles.boxContent}>Message: {item.message}</ThemedText>
                <ThemedText style={styles.boxContent}>Location: {item.location}</ThemedText>
                <ThemedText style={styles.boxTimestamp}>
                  {new Date(item.timestamp).toLocaleString()}
                </ThemedText>
              </ThemedView>
            ))
          ) : (
            <ThemedView style={styles.roundedBox}>
              <ThemedText style={styles.boxContent}>No alerts received yet.</ThemedText>
            </ThemedView>
          )}
        </ScrollView>
      </ThemedView>

      {/* Buttons */}
      <ThemedView style={styles.bottomContainer}>
        <View style={styles.iconContainer}>
          <Image source={require('@/assets/images/phone.png')} style={styles.icon} resizeMode="contain" />
          <Image source={require('@/assets/images/emergency.png')} style={styles.icon} resizeMode="contain" />
        </View>

        <View style={styles.buttonRow}>
          <View style={styles.buttonWrapper}>
            <Button title="Add Local Entry" onPress={addEntry} color="#e7e7e7b9" />
          </View>
          <View style={styles.buttonWrapper}>
            <Button title="Clear Local" onPress={clearHistory} color="#e7e7e7b9" />
          </View>
        </View>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerContainer: { width: '100%', paddingVertical: 30, paddingHorizontal: 24, backgroundColor: 'rgba(255,255,255,0.15)' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTextContainer: { flexDirection: 'column' },
  headerTitle: {
    fontSize: 56,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  headerIcon: { width: 130, height: 210, opacity: 0.9, position: 'relative' },
  section: { marginTop: 20, marginHorizontal: 20 },
  boxContainer: { flexDirection: 'column', gap: 12 },
  roundedBox: {
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  boxText: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  boxContent: { color: '#475569', fontSize: 14, fontWeight: '500', marginTop: 3 },
  boxTimestamp: { color: '#64748b', fontSize: 12, marginTop: 6, textAlign: 'right' },
  bottomContainer: { marginTop: 40, alignItems: 'center', paddingHorizontal: 20, paddingBottom: 60 },
  iconContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 25, gap: 30 },
  icon: { width: 60, height: 60, opacity: 0.9 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  buttonWrapper: { flex: 1, marginHorizontal: 8, borderRadius: 12, overflow: 'hidden' },
});
