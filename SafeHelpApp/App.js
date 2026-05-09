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
  Linking 
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { Accelerometer } from 'expo-sensors';

export default function App() {
  const webViewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isAppSafeAndReady, setIsAppSafeAndReady] = useState(false);
  const exitAppTimerRef = useRef(0);

  useEffect(() => {
    let shakeSubscription;

    const setupApp = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert("Permission Needed", "SOS and Location features require permission.", [{ text: "OK" }]);
        }

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
        
        // 🔥 ULTIMATE BYPASS 1: Direct Bridge from Website
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

        // 🔥 ULTIMATE BYPASS 2: Link Interceptor (Agar HTML tag click hua toh)
        onShouldStartLoadWithRequest={(request) => {
          const url = request.url;
          if (url.startsWith('tel:') || url.startsWith('sms:') || url.startsWith('mailto:') || url.startsWith('whatsapp:')) {
            Linking.openURL(url).catch(err => console.log('Linking Error:', err));
            return false; // WebView ko URL kholne se rokta hai aur phone ko de deta hai
          }
          return true; // Baaki website normal chalegi
        }}

        javaScriptEnabled={true}
        domStorageEnabled={true}
        geolocationEnabled={true} 
        allowsInlineMediaPlayback={true} 
        userAgent="Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Mobile Safari/537.36"
        
        injectedJavaScript={`
          const meta = document.createElement('meta'); 
          meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0'); 
          meta.setAttribute('name', 'viewport'); 
          document.getElementsByTagName('head')[0].appendChild(meta);
          true;
        `}
        
        onNavigationStateChange={(navState) => {
          setCanGoBack(navState.canGoBack);
          
          // 🔥 ULTIMATE BYPASS 3: Fallback Navigation Catcher
          if (navState.url.startsWith('tel:') || navState.url.startsWith('sms:')) {
            if (webViewRef.current) {
              webViewRef.current.stopLoading(); // WebView ko rok do
            }
            Linking.openURL(navState.url).catch(e => console.log(e));
          }
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