import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  ActivityIndicator, 
  BackHandler, 
  StatusBar,
  SafeAreaView,
  Alert,
  Vibration,
  StyleSheet,
  Text,
  ToastAndroid,
  Linking,
  Platform
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { Accelerometer } from 'expo-sensors';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

// Notification behavior set karo
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const webViewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isAppSafeAndReady, setIsAppSafeAndReady] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState('');
  const exitAppTimerRef = useRef(0);

  // --- 🔥 PUSH NOTIFICATION TOKEN LOGIC ---
  async function registerForPushNotificationsAsync() {
    let token;
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }
      
      // EAS Project ID check
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      console.log("🚀 YOUR PUSH TOKEN:", token);
    } else {
      console.log('Must use physical device for Push Notifications');
    }

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
    return token;
  }

  useEffect(() => {
    let shakeSubscription;

    const setupApp = async () => {
      try {
        // 1. Get Push Token
        const token = await registerForPushNotificationsAsync();
        setExpoPushToken(token);

        // 2. Location Permission
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert("Permission Needed", "SOS features require location permission.", [{ text: "OK" }]);
        }

        // 3. Shake SOS Logic
        Accelerometer.setUpdateInterval(200);
        shakeSubscription = Accelerometer.addListener(data => {
          const force = Math.sqrt(data.x**2 + data.y**2 + data.z**2);
          if (force > 3.8) {
            Vibration.vibrate([200, 100, 200]);
            if (webViewRef.current) {
              webViewRef.current.injectJavaScript(`
                try { if(typeof window.triggerSOS === 'function') window.triggerSOS(); } catch(e) {}
                true;
              `);
            }
          }
        });
      } catch (error) {
        console.warn("Setup Error:", error);
      } finally {
        setIsAppSafeAndReady(true);
      }
    };

    setupApp();

    const backAction = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true; 
      } else {
        const timeNow = new Date().getTime();
        if (timeNow - exitAppTimerRef.current < 2000) {
          BackHandler.exitApp();
        } else {
          exitAppTimerRef.current = timeNow;
          ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
          return true; 
        }
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);

    return () => {
      backHandler.remove();
      if (shakeSubscription) shakeSubscription.remove();
    };
  }, [canGoBack]);

  if (!isAppSafeAndReady) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={{ color: '#fff', marginTop: 15, fontWeight: 'bold' }}>Securing Connections...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />
      <WebView 
        ref={webViewRef}
        source={{ uri: 'https://sos-safe-helpers.vercel.app/' }} 
        style={styles.webview}
        originWhitelist={['*']}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.action === 'CALL') {
              Linking.openURL(`tel:${data.number}`);
            } else if (data.action === 'SMS') {
              Linking.openURL(`sms:${data.number}?body=${encodeURIComponent(data.text)}`);
            }
          } catch (error) {
            console.log("Bridge Error: ", error);
          }
        }}
        onShouldStartLoadWithRequest={(request) => {
          const url = request.url;
          if (url.startsWith('tel:') || url.startsWith('sms:') || url.startsWith('mailto:') || url.startsWith('whatsapp:')) {
            Linking.openURL(url).catch(err => console.log('Linking Error:', err));
            return false;
          }
          return true;
        }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        geolocationEnabled={true} 
        allowsInlineMediaPlayback={true} 
        userAgent="Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Mobile Safari/537.36"
        onNavigationStateChange={(navState) => {
          setCanGoBack(navState.canGoBack);
        }}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4F46E5" />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F19' },
  webview: { flex: 1 },
  loadingContainer: { flex: 1, backgroundColor: '#0B0F19', justifyContent: 'center', alignItems: 'center' }
});