import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import { Button, Image, ScrollView, StyleSheet, View } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import AppSync from './aws-config'; // ✅ fixed relative path (no .js needed in RN)
import { ADD_EVENT, LIST_EVENTS, SUBSCRIBE_EVENTS } from './graphql'; // ✅ same directory level as aws-config

type Entry = {
  id: number;
  deviceName: string;
  time: string;
};

type DynamoEntry = {
  id: string;
  status: string;
  message: string;
  location: string;
  timestamp: string;
};

export default function HomeScreen() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [remoteEntries, setRemoteEntries] = useState<DynamoEntry[]>([]);
  const ws = useRef<WebSocket | null>(null);

  // Load local entries from AsyncStorage
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

  // Fetch initial remote data + connect WebSocket
  useEffect(() => {
    const fetchRemote = async () => {
      try {
        const res = await fetch(AppSync.graphqlEndpoint, {
          method: 'POST',
          headers: {
            'x-api-key': AppSync.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: LIST_EVENTS }),
        });

        const json = await res.json();
        if (json?.data?.listEvents) setRemoteEntries(json.data.listEvents);
        else console.log('⚠️ No remote data found or API returned empty list');
      } catch (err) {
        console.error('❌ Failed to fetch remote events:', err);
      }
    };

    fetchRemote();

    // --- AppSync real-time subscription setup ---
    ws.current = new WebSocket(AppSync.realtimeEndpoint, 'graphql-ws');

    ws.current.onopen = () => {
      console.log('🔗 Connected to AppSync');
      ws.current?.send(
        JSON.stringify({
          type: 'connection_init',
          payload: { headers: { 'x-api-key': AppSync.apiKey } },
        })
      );

      // Subscribe after connection handshake
      setTimeout(() => {
        ws.current?.send(
          JSON.stringify({
            id: '1',
            type: 'start',
            payload: { query: SUBSCRIBE_EVENTS },
          })
        );
      }, 1000);
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'data' && data.payload?.data?.onEventAdded) {
          const newEvent = data.payload.data.onEventAdded;
          console.log('📡 New remote event received:', newEvent);
          setRemoteEntries((prev) => [newEvent, ...prev]);
        }
      } catch (error) {
        console.error('⚠️ Error parsing WebSocket message:', error);
      }
    };

    ws.current.onerror = (err) => console.error('⚠️ WebSocket error:', err);
    ws.current.onclose = () => console.log('🔌 AppSync WebSocket closed');

    return () => ws.current?.close();
  }, []);

  // Add new local entry + push to AppSync
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

    try {
      const res = await fetch(AppSync.graphqlEndpoint, {
        method: 'POST',
        headers: {
          'x-api-key': AppSync.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: ADD_EVENT,
          variables: {
            status: 'Local Entry',
            message: newEntry.deviceName,
            location: 'Device',
          },
        }),
      });
      const json = await res.json();
      if (json?.data?.addEvent) console.log('✅ Event pushed to AppSync:', json.data.addEvent);
      else console.log('⚠️ Event push response:', json);
    } catch (err) {
      console.error('❌ Failed to push event to AppSync:', err);
    }
  };

  // Clear local AsyncStorage entries
  const clearHistory = async () => {
    try {
      await AsyncStorage.removeItem('historyEntries');
      setEntries([]);
      console.log('🧹 Local history cleared');
    } catch (err) {
      console.error('❌ Failed to clear local history:', err);
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#A1CEDC' }}
      headerImage={
        <ThemedView style={styles.headerContainer}>
          <ThemedText type="subtitle" style={styles.headerTitle}>Guardian</ThemedText>
          <ThemedText type="subtitle" style={styles.headerTitle}>Lens</ThemedText>
        </ThemedView>
      }
    >
      {/* LOCAL HISTORY */}
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

      {/* REMOTE EVENTS */}
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">Remote Events</ThemedText>
        <ScrollView style={styles.boxContainer}>
          {remoteEntries.length > 0 ? (
            remoteEntries.map((item) => (
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
              <ThemedText style={styles.boxContent}>No live events yet.</ThemedText>
            </ThemedView>
          )}
        </ScrollView>
      </ThemedView>

      {/* BUTTONS */}
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
            <Button title="Add Entry" onPress={addEntry} color="#e7e7e7b9" />
          </View>
          <View style={styles.buttonWrapper}>
            <Button title="Clear Local" onPress={clearHistory} color="#e7e7e7b9" />
          </View>
        </View>
      </ThemedView>
    </ParallaxScrollView>
  );
}

// ✅ keep your existing styles — no change
const styles = StyleSheet.create({
  headerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffffd7',
  },
  headerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 40,
    fontWeight: 'bold',
    color: '#000',
  },
  section: { padding: 16 },
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
  boxTimestamp: {
    color: '#444',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'right',
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
    width: 60,
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
