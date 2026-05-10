"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { AppScreen } from "../SafeHelpApp";

import { 
  Settings, 
  Users, 
  AlertCircle, 
  Phone, 
  MapPin, 
  User,
  Map,
  ArrowRight,
  Mic,
  Zap,
  MessageSquare,
  ShieldAlert
} from "lucide-react";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface HomeProps {
  userName: string; 
  isSOSActive: boolean;
  navigateTo: (screen: AppScreen) => void;
  t: any;
}

export default function Home({ userName, isSOSActive, navigateTo, t }: HomeProps) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  // States for Features
  const [shakeEnabled, setShakeEnabled] = useState(false);
  const [shakeSensitivity, setShakeSensitivity] = useState("high");
  const [fastContact, setFastContact] = useState<any>(null);
  const [shakeStatus, setShakeStatus] = useState<"idle" | "detected" | "triggered">("idle");

  // 🔥 ULTRA GOD MODE: Profile Sync for "Milan" Removal
  const [godName, setGodName] = useState(userName);

  // Firestore Refs
  const userRef = useMemo(() => {
    if (!user || !db) return null;
    return doc(db, "users", user.uid);
  }, [user, db]);

  const settingsRef = useMemo(() => {
    if (!user || !db) return null;
    return doc(db, "users", user.uid, "settings", "default");
  }, [user, db]);

  const { data: profile } = useDoc(userRef);
  const { data: settings } = useDoc(settingsRef);

  // 🛠️ 1. SCREEN LOCK & OVERFLOW PREVENTION
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.style.overflowX = 'hidden';
      document.documentElement.style.overflowX = 'hidden';
    }
  }, []);

  // 🛠️ 2. BOOT ENGINE: Fast Cache Load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Load Contact Cache
      const cachedContact = localStorage.getItem('safehelp_fast_contact');
      if (cachedContact) {
        try { setFastContact(JSON.parse(cachedContact)); } catch (e) { console.error("Cache Error", e); }
      }
      
      // Load Settings Cache
      const cachedSettings = localStorage.getItem('safehelp_fast_settings');
      if (cachedSettings) {
        try {
          const parsed = JSON.parse(cachedSettings);
          setShakeEnabled(parsed.shakeSos || false);
          setShakeSensitivity(parsed.shakeSensitivity || "high");
        } catch (e) { console.error("Settings Cache Error", e); }
      }

      // Load Profile Name Cache (The "Milan" Fix)
      const cachedProfile = localStorage.getItem('safehelp_profile_cache');
      if (cachedProfile) {
        try {
          const parsed = JSON.parse(cachedProfile);
          if (parsed.name) setGodName(parsed.name);
        } catch (e) { console.error("Profile Cache Error", e); }
      }
    }
  }, []);

  // 🛠️ 3. LIVE SYNC: Background Data Refresher
  useEffect(() => {
    if (profile) {
      if (profile.name) setGodName(profile.name);
      
      if (profile.contacts && profile.contacts.length > 0) {
        const starred = profile.contacts.find((c: any) => c.isPrimary) || profile.contacts[0];
        setFastContact(starred); 
        if (typeof window !== 'undefined') {
          localStorage.setItem('safehelp_fast_contact', JSON.stringify(starred));
        }
      }
    }
  }, [profile]);

  useEffect(() => {
    if (settings) {
      setShakeEnabled(settings.shakeSos || false);
      setShakeSensitivity(settings.shakeSensitivity || "high");
      if (typeof window !== 'undefined') {
        localStorage.setItem('safehelp_fast_settings', JSON.stringify(settings));
      }
    }
  }, [settings]);

  // 🛠️ 4. SOS TRIGGER: Audio Initialization for APK
  const handleSOSClick = () => {
    try {
      const API_KEY = "66def89da92b48fbbc5ee6b34eab3456";
      const audioUrl = `https://api.voicerss.org/?key=${API_KEY}&hl=en-in&v=Jai&c=MP3&src=SOS%20Activated`;
      
      const sosAudio = new Audio(audioUrl);
      sosAudio.load(); 
      
      // Pass to Global Window for next screen
      (window as any).sosVoice = sosAudio;
      
      // Silent play to unlock audio context on mobile browsers
      sosAudio.play().then(() => {
        sosAudio.pause(); 
        sosAudio.currentTime = 0;
      }).catch((err) => console.log("Audio unlock interaction needed", err));
    } catch (e) {
      console.error("SOS Audio Trigger error", e);
    }
    
    navigateTo("sos-activation");
  };

  // 🛠️ 5. SHAKE TOGGLE: Persistence Logic
  const toggleShake = async (val: boolean) => {
    setShakeEnabled(val);
    if (typeof window !== 'undefined') {
      const currentCache = JSON.parse(localStorage.getItem('safehelp_fast_settings') || '{}');
      currentCache.shakeSos = val;
      localStorage.setItem('safehelp_fast_settings', JSON.stringify(currentCache));
    }
    
    if (user && db) {
      const sRef = doc(db, "users", user.uid, "settings", "default");
      await setDoc(sRef, { shakeSos: val }, { merge: true });
    }
    
    toast({
      title: val ? "Shake SOS Enabled" : "Shake SOS Disabled",
      description: val ? "Strongly shake your phone to trigger SOS." : "Manual/Voice activation only.",
    });
  };

  // 🛠️ 6. QUICK CALL ENGINE: WebView + Native Tel Link
  const handleQuickCall = () => {
    let phoneToCall = fastContact?.phone || "+91 0000000000"; 
    const cleanPhone = phoneToCall.replace(/\s+/g, '');

    // 🔥 APK SUPPORT: Send message to React Native WebView
    if (typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
      (window as any).ReactNativeWebView.postMessage(JSON.stringify({ action: "CALL", number: cleanPhone }));
    }

    // Standard Web Fallback
    setTimeout(() => {
      window.location.href = `tel:${cleanPhone}`;
    }, 100);
  };

  // 🛠️ 7. QUICK SMS ENGINE: High Accuracy GPS Logic
  const handleQuickMessage = () => {
    let phoneToMessage = fastContact?.phone || "+91 0000000000"; 
    const cleanPhone = phoneToMessage.replace(/\s+/g, '');
    const customMessage = settings?.sosMessage || "🚨 EMERGENCY! I need help immediately. Please respond ASAP. 🚨";

    const fireSMS = (locationLink: string) => {
      const msg = `🚨 EMERGENCY ALERT 🚨\n\n${customMessage}${locationLink}\n\n- Sent via SafeHelp App`;
      
      // 🔥 APK SUPPORT: Send message to React Native WebView
      if (typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
        (window as any).ReactNativeWebView.postMessage(JSON.stringify({ action: "SMS", number: cleanPhone, text: msg }));
      }

      // Standard Web Fallback
      setTimeout(() => {
        window.location.href = `sms:${cleanPhone}?body=${encodeURIComponent(msg)}`;
      }, 100);
    };

    if ("geolocation" in navigator) {
      toast({ title: "Locking precise GPS location..." });
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const locLink = `\n\n📍 Live Location: https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;
          fireSMS(locLink);
        },
        (err) => {
          console.error("GPS Error", err);
          fireSMS("\n\n📍 Location: GPS unavailable."); 
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 } 
      );
    } else {
      fireSMS("");
    }
  };

  // 🛠️ 8. SHAKE DETECTOR CORE: Math & Timing Logic
  const shakeStartTimeRef = useRef<number>(0);
  const cooldownRef = useRef<number>(0);

  useEffect(() => {
    if (!shakeEnabled || isSOSActive) return;

    const SENSITIVITY_THRESHOLDS: Record<string, number> = { low: 15, medium: 25, high: 35 };
    const threshold = SENSITIVITY_THRESHOLDS[shakeSensitivity] || 35;
    const SHAKE_WINDOW_MS = 500; 
    const COOLDOWN_MS = 3000;    

    const handleMotion = (event: DeviceMotionEvent) => {
      const acceleration = event.accelerationIncludingGravity;
      if (!acceleration) return;

      const now = Date.now();
      if (now < cooldownRef.current) return;

      const totalForce = Math.abs(acceleration.x || 0) + Math.abs(acceleration.y || 0) + Math.abs(acceleration.z || 0);

      if (totalForce > threshold) {
        if (shakeStartTimeRef.current === 0) {
          shakeStartTimeRef.current = now;
          setShakeStatus("detected");
        }

        if (now - shakeStartTimeRef.current >= SHAKE_WINDOW_MS) {
          cooldownRef.current = now + COOLDOWN_MS; 
          shakeStartTimeRef.current = 0;
          setShakeStatus("triggered");
          
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([400, 100, 400]);
          }
          
          toast({ variant: "destructive", title: t.emergencyActivated });
          navigateTo("sos-activation");
        }
      } else {
        shakeStartTimeRef.current = 0;
        setShakeStatus("idle");
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => {
      window.removeEventListener('devicemotion', handleMotion);
      shakeStartTimeRef.current = 0;
    };
  }, [shakeEnabled, shakeSensitivity, isSOSActive, navigateTo, t, toast]);

  // 🛠️ 9. UI RENDER ENGINE
  return (
    <div className="flex flex-col min-h-screen bg-background relative overflow-x-hidden w-full max-w-[100vw]">
      {/* HEADER SECTION */}
      <div className="p-6 shrink-0 flex justify-between items-center w-full max-w-md mx-auto z-10">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={() => navigateTo("profile")} className="rounded-full bg-secondary w-12 h-12 border border-border/50 shadow-sm active:scale-90 transition-all">
            <User className="w-6 h-6" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigateTo("tracking")} className="rounded-full bg-secondary w-12 h-12 border border-border/50 shadow-sm active:scale-90 transition-all">
            <Map className="w-6 h-6 text-primary" />
          </Button>
        </div>
        
        <div className="flex flex-col items-center">
          <div className={cn(
            "px-4 py-1.5 rounded-full flex items-center space-x-2 border shadow-sm transition-all", 
            isSOSActive ? "bg-primary/10 border-primary/20" : "bg-green-500/10 border-green-500/20"
          )}>
            <div className={cn("w-2.5 h-2.5 rounded-full", isSOSActive ? 'bg-primary animate-pulse' : 'bg-green-500')}></div>
            <span className={cn("text-[10px] font-bold tracking-widest uppercase", isSOSActive ? 'text-primary' : 'text-green-500')}>
              {isSOSActive ? t.sosActive : t.systemSafe}
            </span>
          </div>
        </div>

        <Button variant="ghost" size="icon" onClick={() => navigateTo("settings")} className="rounded-full bg-secondary w-12 h-12 active:scale-90 transition-all">
          <Settings className="w-6 h-6" />
        </Button>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col items-center px-6 pb-12 w-full max-w-md mx-auto space-y-10">
        
        {/* WELCOME SECTION */}
        <div className="text-center space-y-1 mt-4">
          <h1 className="text-3xl font-headline font-bold leading-tight">
            {t.hello}, <span className="text-primary">{godName}</span>
          </h1>
          <p className="text-muted-foreground font-medium text-sm px-4">{t.tapEmergency}</p>
        </div>

        {/* SOS BUTTON CENTRAL */}
        <div className="relative flex items-center justify-center w-full">
          <button 
            onClick={handleSOSClick} 
            className={cn(
              "w-64 h-64 rounded-full sos-gradient flex flex-col items-center justify-center transition-all duration-300 active:scale-95 shadow-[0_20px_50px_rgba(220,38,38,0.3)] relative z-10", 
              isSOSActive ? 'animate-blink' : 'pulse-primary'
            )}
          >
            <AlertCircle className="w-16 h-16 text-white mb-2" />
            <span className="text-6xl font-headline font-bold text-white tracking-widest">SOS</span>
          </button>
          <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full scale-125 -z-0"></div>
        </div>

        {/* ACTION GRID */}
        <div className="grid grid-cols-1 w-full gap-4 max-w-sm">
          <Button 
            onClick={() => navigateTo("voice-command")} 
            className="w-full h-20 rounded-[1.5rem] bg-primary text-white text-lg font-bold glow-primary shadow-lg border-none active:scale-95 transition-all"
          >
            <Mic className="w-6 h-6 mr-3" />
            {t.voiceCommand}
          </Button>
          
          <div className="grid grid-cols-2 gap-4">
            <Button onClick={handleQuickCall} variant="outline" className="h-20 rounded-[1.5rem] bg-secondary/30 flex flex-col items-center justify-center border-none active:scale-95 transition-all group">
              <Phone className="w-6 h-6 text-green-500 mb-1 group-active:scale-90 transition-transform" />
              <span className="text-[10px] font-bold uppercase tracking-tighter">{t.quickCall}</span>
            </Button>
            <Button onClick={handleQuickMessage} variant="outline" className="h-20 rounded-[1.5rem] bg-secondary/30 flex flex-col items-center justify-center border-none active:scale-95 transition-all group">
              <MessageSquare className="w-6 h-6 text-blue-400 mb-1 group-active:scale-90 transition-transform" />
              <span className="text-[10px] font-bold uppercase tracking-tighter">{t.quickSms}</span>
            </Button>
          </div>
        </div>

        {/* CONTACTS NAVIGATION BAR */}
        <div className="w-full space-y-4 max-w-sm pt-4">
          <button 
            onClick={() => navigateTo("contacts")} 
            className="w-full h-20 bg-accent rounded-[2rem] flex items-center justify-between px-8 shadow-lg active:scale-95 transition-all group"
          >
            <div className="flex items-center space-x-4 text-white">
              <div className="p-2.5 bg-white/20 rounded-xl group-hover:bg-white/30 transition-colors">
                <Users className="w-6 h-6" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-base font-bold uppercase tracking-wider">{t.emergencyContacts}</span>
              </div>
            </div>
            <ArrowRight className="w-6 h-6 text-white group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* SHAKE STATUS TOGGLE */}
        <div className="w-full flex flex-col items-center space-y-3 pt-6 pb-8">
          <button 
            onClick={() => toggleShake(!shakeEnabled)} 
            className={cn(
              "w-full max-w-sm h-20 rounded-[2rem] flex items-center justify-center space-x-4 transition-all duration-300 active:scale-95 shadow-lg border-2", 
              shakeEnabled ? "bg-gradient-to-br from-yellow-400 to-orange-500 border-yellow-200/50" : "bg-secondary/40 border-border/50"
            )}
          >
            <Zap className={cn("w-6 h-6", shakeEnabled ? "text-white" : "text-muted-foreground")} />
            <div className="flex flex-col items-start text-left">
              <span className={cn("text-base font-bold uppercase tracking-tight", shakeEnabled ? "text-white" : "text-muted-foreground")}>
                {t.shakeSos}
              </span>
              <span className={cn("text-[10px] font-bold uppercase opacity-80", shakeEnabled ? "text-white/90" : "text-muted-foreground/80")}>
                {shakeEnabled ? `${t.activeDetection} (${t[shakeSensitivity] || 'high'})` : t.sensorDisabled}
              </span>
            </div>
          </button>
          <div className="flex items-center space-x-2">
            <div className={cn("w-2 h-2 rounded-full", shakeEnabled ? "bg-green-500 animate-pulse" : "bg-muted")}></div>
            <span className="text-[9px] font-bold uppercase tracking-tighter text-muted-foreground">
              {t.status}: {shakeEnabled ? t.enabled : t.disabled}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}