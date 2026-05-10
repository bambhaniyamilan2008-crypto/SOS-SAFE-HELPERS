"use client";

import React, { useState, useEffect, useMemo } from "react";
import Onboarding from "./screens/Onboarding";
import Home from "./screens/Home";
import Contacts from "./screens/Contacts";
import SOSActivation from "./screens/SOSActivation";
import Tracking from "./screens/Tracking";
import Settings from "./screens/Settings";
import Profile from "./screens/Profile";
import Auth from "./screens/Auth";
import VoiceCommand from "./screens/VoiceCommand";
import { useUser, useDoc, useFirestore, useFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { ShieldAlert, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Language, translations } from "@/lib/translations";

export type AppScreen = 
  | "onboarding"
  | "auth" 
  | "home" 
  | "contacts" 
  | "sos-activation" 
  | "tracking" 
  | "settings" 
  | "profile"
  | "voice-command";

export default function SafeHelpApp() {
  const { auth, firestore } = useFirebase();
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  
  const [currentScreen, setCurrentScreen] = useState<AppScreen | "loading" | "setup">("loading");
  const [isSOSActive, setIsSOSActive] = useState(false);
  const [lang, setLang] = useState<Language>('en');

  // 🔥 Yahan hum memory se "mr." wala naam nikalenge
  const [cachedName, setCachedName] = useState("mr.");

  // Load language from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem("lang") as Language;
      if (savedLang && ['en', 'hi', 'gu'].includes(savedLang)) {
        setLang(savedLang);
      }
      
      // ✅ Cache se profile name uthao
      const profileCache = localStorage.getItem('safehelp_profile_cache');
      if (profileCache) {
        try {
          const parsed = JSON.parse(profileCache);
          if (parsed.name) setCachedName(parsed.name);
        } catch (e) {}
      }
    }
  }, []);

  const t = useMemo(() => translations[lang], [lang]);

  const isConfigured = useMemo(() => {
    return !!auth && !!firestore && !!auth.app.options.apiKey && auth.app.options.apiKey.length > 10;
  }, [auth, firestore]);

  const userRef = useMemo(() => {
    if (!user || !db) return null;
    return doc(db, "users", user.uid);
  }, [user, db]);
  
  const { data: profile } = useDoc(userRef);

  useEffect(() => {
    if (!isConfigured) {
      setCurrentScreen("setup");
      return;
    }

    if (!authLoading) {
      if (user) {
        // User is logged in, check onboarding status from localStorage
        const onboardingDone = typeof window !== 'undefined' ? localStorage.getItem("onboardingSeen") === "true" : false;
        
        if (!onboardingDone) {
          setCurrentScreen("onboarding");
        } else {
          // Onboarding done, go straight to home
          if (["loading", "auth", "onboarding"].includes(currentScreen)) {
            setCurrentScreen("home");
          }
        }
      } else {
        setCurrentScreen("auth");
      }
    }
  }, [user, authLoading, isConfigured, profile, currentScreen]);

  const navigateTo = (screen: AppScreen) => {
    setCurrentScreen(screen);
  };

  const handleSetLang = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem("lang", newLang);
  };

  if (currentScreen === "setup") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-background">
        <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-8">
          <ShieldAlert className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-2xl font-headline font-bold mb-4">Setup Required</h1>
        <p className="text-muted-foreground mb-8 max-w-xs leading-relaxed">
          SafeHelp needs a valid Firebase configuration to securely sync your emergency profile.
        </p>
        
        <Button 
          onClick={() => window.location.reload()} 
          className="w-full max-w-sm h-14 rounded-2xl font-bold glow-primary"
        >
          <RefreshCw className="mr-2 w-5 h-5" />
          Reload App
        </Button>
      </div>
    );
  }

  if (currentScreen === "loading") return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Starting...</p>
    </div>
  );

  return (
    <div className="max-w-md mx-auto min-h-screen bg-background relative flex flex-col">
      {currentScreen === "auth" && (
        <Auth onAuthSuccess={() => {}} />
      )}
      {currentScreen === "onboarding" && (
        <Onboarding onComplete={() => {
          localStorage.setItem("onboardingSeen", "true");
          navigateTo("home");
        }} />
      )}
      {currentScreen === "home" && (
        <Home 
          // 🔥 MAGIC HERE: Google ka naam hata diya, ab sirf Profile Name ya 'mr.' dikhega
          userName={profile?.name || cachedName} 
          isSOSActive={isSOSActive}
          navigateTo={navigateTo} 
          t={t}
        />
      )}
      {currentScreen === "contacts" && (
        <Contacts navigateTo={navigateTo} />
      )}
      {currentScreen === "sos-activation" && (
        <SOSActivation 
          onCancel={() => navigateTo("home")}
          onActivated={() => {
            setIsSOSActive(true);
            navigateTo("tracking");
          }}
          t={t}
        />
      )}
      {currentScreen === "tracking" && (
        <Tracking 
          onResolve={() => {
            setIsSOSActive(false);
            navigateTo("home");
          }}
          t={t}
        />
      )}
      {currentScreen === "settings" && (
        <Settings navigateTo={navigateTo} lang={lang} setLang={handleSetLang} t={t} />
      )}
      {currentScreen === "profile" && (
        <Profile navigateTo={navigateTo} />
      )}
      {currentScreen === "voice-command" && (
        <VoiceCommand 
          navigateTo={navigateTo} 
          onSOSTriggered={() => navigateTo("sos-activation")}
          t={t}
        />
      )}
    </div>
  );
}