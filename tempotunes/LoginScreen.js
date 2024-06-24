import React, { useState, useEffect } from 'react';
import { Button, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri, useAuthRequest } from 'expo-auth-session';
import Constants from 'expo-constants';

const { spotifyClientId, spotifyRedirectUri } = Constants.manifest.extra;

WebBrowser.maybeCompleteAuthSession();

// Endpoint
const discovery = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

export default function Login({ navigation }) {
  const redirectUri = makeRedirectUri({ preferLocalhost: true, path: '/callback' });
  const clientId = spotifyClientId;
  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: clientId,
      scopes: ['user-read-email', 'playlist-modify-public', 'app-remote-control', 'streaming', 'user-modify-playback-state'],
      usePKCE: false,
      redirectUri: redirectUri,
    },
    discovery
  );

  useEffect(() => {
    if (response?.type === 'success') {
      const { code } = response.params;
      handleSpotifyCallback(code);
    } else if (response?.type === 'error') {
      console.error('OAuth Error:', response.error);
    }
  }, [response]);

  const handleSpotifyCallback = async (code) => {
    try {
      console.log('Authorization Code:', code);
      const backendResponse = await fetch(`${spotifyRedirectUri}?code=${code}`);
      const data = await backendResponse.json();

      if (backendResponse.ok) {
        const { firebase_token, access_token } = data;
        console.log('Tokens received:', { firebase_token, access_token });
        navigation.navigate('Home', { firebase_token, access_token });
      } else {
        console.error('Error from backend:', data.error);
      }
    } catch (error) {
      console.error('Error handling Spotify callback:', error);
    }
  };

  return (
    <View style={styles.background}>
      <TouchableOpacity style={styles.button} onPress={() => promptAsync()}>
        <Text>Login to Spotify</Text>
      </TouchableOpacity>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#06AF3C',
    height: 50,
    width: 150,
    borderRadius: 10,
    justifyContent: 'center',
  },
});
