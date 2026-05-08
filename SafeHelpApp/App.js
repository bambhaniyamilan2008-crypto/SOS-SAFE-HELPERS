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
  Linking // 🔥 Call, SMS, Email sab native apps me bhejega
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

    // 1️⃣ HARDWARE & SENSOR SETUP
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

    // 2️⃣ PERFECT BACK BUTTON LOGIC
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

  // 3️⃣ SECURE LOADING STATE
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
        
        // 🔥 ORIGIN WHITELIST: Har tarah ke link ko allow kiya
        originWhitelist={['*', 'http://*', 'https://*', 'tel:*', 'sms:*', 'mailto:*', 'whatsapp:*', 'geo:*']}
        
        // 4️⃣ UNIVERSAL LINK HANDLER (CALL, SMS, MAPS, WHATSAPP)
        onShouldStartLoadWithRequest={(request) => {
          const url = request.url;
          
          if (url.startsWith('tel:') || 
              url.startsWith('sms:') || 
              url.startsWith('mailto:') || 
              url.startsWith('whatsapp:') || 
              url.startsWith('geo:') || 
              url.startsWith('intent:')) {
            
            // Check karega ki phone mein SMS/Dialer app hai ya nahi, aur open karega
            Linking.canOpenURL(url).then(supported => {
              if (supported) {
                Linking.openURL(url);
              } else {
                console.log("No app installed to handle this URL:", url);
              }
            }).catch(err => console.log('Linking Error:', err));
            
            return false; // WebView ko white screen par jaane se rokega
          }
          return true; // Baaki poori website perfectly chalegi
        }}

        // 5️⃣ CORE WEBVIEW SETTINGS
        javaScriptEnabled={true}
        domStorageEnabled={true}
        geolocationEnabled={true} 
        allowsInlineMediaPlayback={true} 
        userAgent="Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Mobile Safari/537.36"
        thirdPartyCookiesEnabled={true}
        sharedCookiesEnabled={true}
        setSupportMultipleWindows={false} 
        
        // 6️⃣ ZOOM LOCK INJECTION
        injectedJavaScript={`
          const meta = document.createElement('meta'); 
          meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0'); 
          meta.setAttribute('name', 'viewport'); 
          document.getElementsByTagName('head')[0].appendChild(meta);
          true;
        `}
        
        // Track history for Back Button
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