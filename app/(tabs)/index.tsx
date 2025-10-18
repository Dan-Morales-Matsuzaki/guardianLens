import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import { Button, Image, ScrollView, StyleSheet, View } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

// AppSync configuration
const REGION = 'ap-northeast-1';
const API_KEY = 'da2-lears2uxf5eunibvzzpz2xjtu4';
const GRAPHQL_ENDPOINT =
  'https://6jg4v7pdybhwjpsnyxvsfljyqa.appsync-api.ap-northeast-1.amazonaws.com/graphql';
const REALTIME_ENDPOINT =
  'wss://6jg4v7pdybhwjpsnyxvsfljyqa.appsync-realtime-api.ap-northeast-1.amazonaws.com/graphql';

type Entry = {
  id: number;
  deviceName: string;
  time: string;
};

type DynamoEntry = {
  device_id: string;
  timestamp: string;
  status: string;
  message: string;
  location: string;
};

// Subscription query — must match your schema
const SUBSCRIPTION_QUERY = `
  subscription OnCreateGuardianEventTable {
    onCreateGuardianEventTable {
      device_id
      timestamp
      event
      status
      message
      location
      intent
      updated_at
    }
  }
`;

export default function HomeScreen() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [remoteEntries, setRemoteEntries] = useState<DynamoEntry[]>([]);
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

  // Add a new local entry
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
  };

  // Clear local entries
  const clearHistory = async () => {
    await AsyncStorage.removeItem('historyEntries');
    setEntries([]);
  };

  // Connect to AWS AppSync realtime WebSocket
  useEffect(() => {
    const connectToAppSync = () => {
      const initPayload = {
        type: 'connection_init',
        payload: {
          headers: {
            host: GRAPHQL_ENDPOINT.replace('https://', ''),
            'x-api-key': API_KEY,
          },
        },
      };

      const startPayload = {
        id: '1',
        type: 'start',
        payload: {
          data: JSON.stringify({ query: SUBSCRIPTION_QUERY }),
          extensions: {
            authorization: {
              host: GRAPHQL_ENDPOINT.replace('https://', ''),
              'x-api-key': API_KEY,
            },
          },
        },
      };

      const socket = new WebSocket(REALTIME_ENDPOINT, 'graphql-ws');
      ws.current = socket;

      socket.onopen = () => {
        console.log('Connected to AppSync Realtime');
        socket.send(JSON.stringify(initPayload));
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          //keep-alive message from AppSync
          if (msg.type === 'ka') {
            // console.log('keep-alive');
            return;
          }

          // connection acknowledged
          if (msg.type === 'connection_ack') {
            console.log('🔗 Connection acknowledged by AppSync');
            socket.send(JSON.stringify(startPayload));
            console.log('Subscribed to live updates');
            return;
          }

          //new event pushed by AppSync
          if (msg.type === 'data' && msg.payload?.data?.onCreateGuardianEventTable) {
            const newItem = msg.payload.data.onCreateGuardianEventTable;
            console.log('Live event received:', newItem);
            setRemoteEntries((prev) => [newItem, ...prev]);
          }
        } catch (e) {
          console.error('Error parsing message', e);
        }
      };

      socket.onerror = (e) => console.error('WebSocket error:', e);

      socket.onclose = () => {
        console.warn('WebSocket closed, reconnecting in 5s...');
        setTimeout(connectToAppSync, 5000);
      };
    };

    connectToAppSync();

    return () => {
      ws.current?.close();
    };
  }, []);

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
      {/* LOCAL HISTORY */}
      <ThemedView style={styles.stepContainer}>
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
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Remote Events</ThemedText>
        <ScrollView style={styles.boxContainer}>
          {remoteEntries.length > 0 ? (
            remoteEntries.map((item, index) => (
              <ThemedView key={index} style={styles.roundedBox}>
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

      {/* ICONS + LOCAL BUTTONS */}
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
            <Button title="Clear Local" onPress={clearHistory} color="#999" />
          </View>
        </View>
      </ThemedView>
    </ParallaxScrollView>
  );
}

// Styles
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
