import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Pedometer } from 'expo-sensors';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen() {
  const [bpmOff, setBpmOff] = useState(true);
  const [isPedometerAvailable, setIsPedometerAvailable] = useState('checking');
  const [currentStepCount, setCurrentStepCount] = useState(0);
  const [bpm, setBpm] = useState(0);
  const [songInfo, setSongInfo] = useState(null);

  const isCalculating = useRef(false);
  const canFinishCalculation = useRef(false);
  const prevSteps = useRef(0);

  const subscribe = async () => {
    const isAvailable = await Pedometer.isAvailableAsync();
    setIsPedometerAvailable(String(isAvailable));

    if (isAvailable) {
      return Pedometer.watchStepCount(result => {
        setCurrentStepCount(result.steps);
        if (!isCalculating.current && !canFinishCalculation.current) {
          isCalculating.current = true;
          prevSteps.current = result.steps;
          setTimeout(() => {
            isCalculating.current = false;
            canFinishCalculation.current = true;
          }, 10000);
        }
        if (canFinishCalculation.current) {
          const newBpm = Math.round((result.steps - prevSteps.current) * 5.7);
          setBpm(newBpm);
          canFinishCalculation.current = false;
          queueSong(newBpm);
        }
      });
    }
  };

  const queueSong = async (stepsPerMinute) => {
    const accessToken = await AsyncStorage.getItem('accessToken');
    if (!accessToken) {
      console.error('No access token found');
      return;
    }

    fetch('http://localhost:3000/queueSong', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ access_token: accessToken, steps_per_minute: stepsPerMinute }),
    })
      .then(res => res.json())
      .then(data => {
        setSongInfo(data);
      })
      .catch(err => console.error('Error:', err));
  };

  useEffect(() => {
    const subscription = subscribe();
    return () => subscription && subscription.remove();
  }, []);

  return (
    <View style={styles.container}>
      {bpmOff ? (
        <Text style={styles.messages}>Welcome to TempoTunes, when you are ready to run press start!</Text>
      ) : (
        <>
          <Text style={styles.messages}>Boom! {"\n"} Within 30 seconds of running your rhythmic beats will magically appear!</Text>
          <Text style={styles.bpm}>SPM</Text>
          <Text style={styles.bpm_footnote}>(updated roughly every 10 seconds)</Text>
          <Text style={styles.bpm}>{bpm}</Text>
          {songInfo && (
            <View>
              <Text style={{ color: 'white' }}>Song: {songInfo.songTitle}</Text>
              <Text style={{ color: 'white' }}>Artist: {songInfo.artist}</Text>
            </View>
          )}
        </>
      )}
      {bpmOff && (
        <TouchableOpacity
          style={styles.start}
          onPress={() => setBpmOff(!bpmOff)}>
          <Text>START</Text>
        </TouchableOpacity>
      )}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messages: {
    marginTop: 100,
    textAlign: 'center',
    backgroundColor: '#06AF3C',
    borderRadius: 10,
    padding: 10,
  },
  bpm: {
    marginTop: 60,
    fontSize: 30,
    textAlign: 'center',
    color: 'white',
  },
  bpm_footnote: {
    textAlign: 'center',
    color: 'white',
  },
  start: {
    alignItems: 'center',
    backgroundColor: '#06AF3C',
    marginTop: 25,
    height: 50,
    width: 150,
    borderRadius: 10,
    justifyContent: 'center',
  },
});
