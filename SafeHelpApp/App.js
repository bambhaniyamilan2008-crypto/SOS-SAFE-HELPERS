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
  Text
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { Accelerometer } from 'expo-sensors';

export default function App() {
  const webViewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  
  // 🔥 ANTI-CRASH SHIELD: Website tab tak load nahi hogi jab tak permissions clear na hon
  const [isAppSafeAndReady, setIsAppSafeAndReady] = useState(false);

  useEffect(() => {
    let shakeSubscription;

    const setupSafeHardware = async () => {
      try {
        // 1. Sabse pehle aaram se Location Permission maango (Bina website load kiye)
        let { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          Alert.alert(
            "Location Required", 
            "SOS feature chalane ke liye location allow karna zaroori hai.",
            [{ text: "OK" }]
          );
        }

        // 2. Shake Sensor ko safely background mein start karo
        Accelerometer.setUpdateInterval(200);
        shakeSubscription = Accelerometer.addListener(data => {
          const force = Math.sqrt(data.x**2 + data.y**2 + data.z**2);
          if (force > 3.8) {
            Vibration.vibrate([200, 100, 200]);
            // Agar website load ho chuki hai, tabhi SOS trigger karo
            if (webViewRef.current) {
              webViewRef.current.injectJavaScript(`
                try { if(typeof window.triggerSOS === 'function') window.triggerSOS(); } catch(e) {}
                true;
              `);
            }
          }
        });

      } catch (error) {
        console.warn("Hardware setup issue: ", error);
      } finally {
        // 3. Permissions handle hone ke baad Website ko load hone ki permission do
        setIsAppSafeAndReady(true);
      }
    };

    setupSafeHardware();

    // 4. Back Button Logic
    const backAction = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true; 
      }
      return false; 
    };

    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);

    return () => {
      backHandler.remove();
      if (shakeSubscription) shakeSubscription.remove();
    };
  }, [canGoBack]);

  // ==========================================
  // LOADING SCREEN (Anti-Crash Shield Active)
  // ==========================================
  if (!isAppSafeAndReady) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={{ color: '#fff', marginTop: 15, fontWeight: 'bold' }}>Securing Connection...</Text>
      </View>
    );
  }

  // ==========================================
  // SAFE WEBVIEW LOAD (WITH GOOGLE LOGIN & ZOOM FIX)
  // ==========================================
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />
      
      <WebView 
        ref={webViewRef}
        source={{ uri: 'https://sos-safe-helpers.vercel.app/' }} 
        style={styles.webview}
        
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        geolocationEnabled={true} 
        allowsInlineMediaPlayback={true} 
        
        // 🔥 FIX 1: GOOGLE LOGIN HACK 🔥
        // Google ko lagega ki asli Chrome browser chal raha hai, app nahi
        userAgent="Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Mobile Safari/537.36"
        thirdPartyCookiesEnabled={true}
        sharedCookiesEnabled={true}
        setSupportMultipleWindows={false} // Google ko bahar naya Chrome tab kholne se rokega
        
        // 🔥 FIX 2: ZOOM LOCK (Anti-Zoom Script) 🔥
        // Website khulte hi uski zoom karne ki taqat khatam kar dega
        injectedJavaScript={`
          const meta = document.createElement('meta'); 
          meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0'); 
          meta.setAttribute('name', 'viewport'); 
          document.getElementsByTagName('head')[0].appendChild(meta);
          true;
        `}
        
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
  loadingContainer: { 
    flex: 1, 
    backgroundColor: '#0B0F19', 
    justifyContent: 'center', 
    alignItems: 'center'
  }
});