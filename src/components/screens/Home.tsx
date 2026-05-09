"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { AppScreen } from "../SafeHelpApp";
import { 
  Settings, Users, AlertCircle, Phone, MapPin, User,
  Map, ArrowRight, Mic, Zap, MessageSquare, ShieldAlert
} from "lucide-react";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// 🔥 GOD-MODE PUSH NOTIFICATION SYSTEM
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

if (typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

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
  
  const [shakeEnabled, setShakeEnabled] = useState(false);
  const [shakeSensitivity, setShakeSensitivity] = useState("high");
  const [fastContact, setFastContact] = useState<any>(null);
  const [shakeStatus, setShakeStatus] = useState<"idle" | "detected" | "triggered">("idle");

  const userRef = useMemo(() => (user && db ? doc(db, "users", user.uid) : null), [user, db]);
  const settingsRef = useMemo(() => (user && db ? doc(db, "users", user.uid, "settings", "default") : null), [user, db]);

  const { data: profile } = useDoc(userRef);
  const { data: settings } = useDoc(settingsRef);

  // 🚀 1. HIGH-ACCURACY PUSH TOKEN REGISTRATION (Fix: Device usage added)
  useEffect(() => {
    const registerToken = async () => {
      // Check if it's a real device using Device module
      if (typeof window === 'undefined' || !Device.isDevice || !user || !db) {
        console.log("Push skip: Not a physical device or missing context");
        return;
      }
      
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') return;

        const token = (await Notifications.getExpoPushTokenAsync()).data;
        await setDoc(doc(db, "users", user.uid), { expoPushToken: token }, { merge: true });
        console.log("God Mode: Token Secured ✅");
      } catch (e) {
        console.error("Push Error:", e);
      }
    };
    registerToken();
  }, [user, db]);

  // 🔄 2. SYNC SETTINGS & CONTACTS
  useEffect(() => {
    if (profile?.contacts?.length > 0) {
      const primary = profile.contacts.find((c: any) => c.isPrimary) || profile.contacts[0];
      setFastContact(primary);
    }
  }, [profile]);

  useEffect(() => {
    if (settings) {
      setShakeEnabled(settings.shakeSos || false);
      setShakeSensitivity(settings.shakeSensitivity || "high");
    }
  }, [settings]);

  // 🎙️ 3. SOS TRIGGER LOGIC
  const handleSOSClick = useCallback(() => {
    try {
      const audioUrl = `https://api.voicerss.org/?key=66def89da92b48fbbc5ee6b34eab3456&hl=en-in&v=Jai&c=MP3&src=SOS%20Activated`;
      const sosAudio = new Audio(audioUrl);
      sosAudio.load();
      (window as any).sosVoice = sosAudio;
      sosAudio.play().then(() => { sosAudio.pause(); sosAudio.currentTime = 0; }).catch(() => {});
    } catch (e) {}
    navigateTo("sos-activation");
  }, [navigateTo]);

  // 📱 4. QUICK ACTIONS
  const handleQuickCall = useCallback(() => {
    const phone = fastContact?.phone?.replace(/\s+/g, '') || "+919586875178";
    if ((window as any).ReactNativeWebView) {
      (window as any).ReactNativeWebView.postMessage(JSON.stringify({ action: "CALL", number: phone }));
    }
    window.location.href = `tel:${phone}`;
  }, [fastContact]);

  const handleQuickMessage = useCallback(() => {
    const phone = fastContact?.phone?.replace(/\s+/g, '') || "+919586875178";
    const baseMsg = settings?.sosMessage || "🚨 EMERGENCY! I need help. 🚨";

    const send = (loc: string) => {
      const fullMsg = `${baseMsg}${loc}\n- SafeHelp`;
      if ((window as any).ReactNativeWebView) {
        (window as any).ReactNativeWebView.postMessage(JSON.stringify({ action: "SMS", number: phone, text: fullMsg }));
      }
      window.location.href = `sms:${phone}?body=${encodeURIComponent(fullMsg)}`;
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (p) => send(`\n📍 Maps: https://www.google.com/maps?q=${p.coords.latitude},${p.coords.longitude}`),
        () => send("\n📍 GPS Unavailable"),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else { send(""); }
  }, [fastContact, settings]);

  // ⚡ 5. ULTRA-SENSITIVE SHAKE DETECTION
  const shakeStartTime = useRef<number>(0);
  const cooldown = useRef<number>(0);

  useEffect(() => {
    if (!shakeEnabled || isSOSActive) return;
    const limit = shakeSensitivity === "low" ? 18 : shakeSensitivity === "medium" ? 28 : 38;

    const onMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc) return;
      const now = Date.now();
      if (now < cooldown.current) return;

      if ((Math.abs(acc.x!) + Math.abs(acc.y!) + Math.abs(acc.z!)) > limit) {
        if (shakeStartTime.current === 0) { shakeStartTime.current = now; setShakeStatus("detected"); }
        if (now - shakeStartTime.current >= 500) {
          cooldown.current = now + 4000;
          setShakeStatus("triggered");
          if (navigator.vibrate) navigator.vibrate([500, 100, 500]);
          navigateTo("sos-activation");
        }
      } else { shakeStartTime.current = 0; setShakeStatus("idle"); }
    };

    window.addEventListener('devicemotion', onMotion);
    return () => window.removeEventListener('devicemotion', onMotion);
  }, [shakeEnabled, shakeSensitivity, isSOSActive, navigateTo]);

  return (
    <div className="flex flex-col min-h-screen bg-background relative overflow-x-hidden w-full max-w-[100vw]">
      {/* Header */}
      <div className="p-6 flex justify-between items-center w-full max-w-md mx-auto z-10">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={() => navigateTo("profile")} className="rounded-full bg-secondary w-12 h-12 shadow-sm border border-border/40"><User className="w-6 h-6" /></Button>
          <Button variant="ghost" size="icon" onClick={() => navigateTo("tracking")} className="rounded-full bg-secondary w-12 h-12 shadow-sm border border-border/40"><Map className="w-6 h-6 text-primary" /></Button>
        </div>
        
        <div className="px-5 py-2 rounded-full flex items-center space-x-2 border bg-secondary/30 backdrop-blur-md">
          <div className={cn("w-2.5 h-2.5 rounded-full", isSOSActive ? 'bg-primary animate-pulse' : 'bg-green-500')}></div>
          <span className="text-[11px] font-black uppercase tracking-[0.2em]">{isSOSActive ? t.sosActive : t.systemSafe}</span>
        </div>

        <Button variant="ghost" size="icon" onClick={() => navigateTo("settings")} className="rounded-full bg-secondary w-12 h-12 shadow-sm"><Settings className="w-6 h-6" /></Button>
      </div>

      <div className="flex-1 flex flex-col items-center px-6 pb-12 w-full max-w-md mx-auto space-y-12">
        <div className="text-center mt-6 space-y-2">
          <h1 className="text-4xl font-black tracking-tighter italic">{t.hello}, {userName}</h1>
          <p className="text-muted-foreground font-bold text-sm tracking-wide">{t.tapEmergency}</p>
        </div>

        {/* SOS Button */}
        <div className="relative group">
          <button 
            onClick={handleSOSClick} 
            className={cn(
              "w-72 h-72 rounded-full sos-gradient flex flex-col items-center justify-center transition-all duration-500 active:scale-90 shadow-[0_0_50px_rgba(220,38,38,0.4)] z-10 relative border-8 border-white/10",
              isSOSActive ? 'animate-blink' : 'pulse-primary'
            )}
          >
            <AlertCircle className="w-20 h-20 text-white mb-2" />
            <span className="text-7xl font-black text-white tracking-widest italic">SOS</span>
          </button>
          <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full scale-150 -z-10 animate-pulse"></div>
        </div>

        {/* Controls */}
        <div className="w-full max-w-sm space-y-5">
          <Button onClick={() => navigateTo("voice-command")} className="w-full h-18 rounded-[2rem] bg-primary text-xl font-black italic shadow-xl active:scale-95"><Mic className="w-7 h-7 mr-3" />{t.voiceCommand}</Button>
          
          <div className="grid grid-cols-2 gap-5">
            <Button onClick={handleQuickCall} variant="outline" className="h-24 rounded-[2rem] bg-secondary/20 flex flex-col border-2 border-transparent active:scale-95">
              <Phone className="w-7 h-7 text-green-500 mb-2" />
              <span className="text-[11px] font-black uppercase tracking-widest">{t.quickCall}</span>
            </Button>
            <Button onClick={handleQuickMessage} variant="outline" className="h-24 rounded-[2rem] bg-secondary/20 flex flex-col border-2 border-transparent active:scale-95">
              <MessageSquare className="w-7 h-7 text-blue-400 mb-2" />
              <span className="text-[11px] font-black uppercase tracking-widest">{t.quickSms}</span>
            </Button>
          </div>

          <button onClick={() => navigateTo("contacts")} className="w-full h-24 bg-slate-900 rounded-[2rem] flex items-center justify-between px-8 shadow-2xl active:scale-[0.98] transition-all group relative overflow-hidden">
            <div className="flex items-center space-x-5 z-10">
              <div className="p-3 bg-white/10 rounded-2xl"><Users className="w-7 h-7 text-white" /></div>
              <span className="text-lg font-black uppercase tracking-wider text-white italic">{t.emergencyContacts}</span>
            </div>
            <ArrowRight className="w-6 h-6 text-white/50 z-10" />
            <div className="absolute right-0 top-0 h-full w-24 bg-primary/10 skew-x-[20deg] translate-x-12"></div>
          </button>

          <button 
            onClick={() => {
              const newVal = !shakeEnabled;
              setShakeEnabled(newVal);
              if (user && db) setDoc(doc(db, "users", user.uid, "settings", "default"), { shakeSos: newVal }, { merge: true });
              toast({ title: newVal ? "Shake Enabled" : "Shake Disabled", variant: newVal ? "default" : "destructive" });
            }} 
            className={cn(
              "w-full h-24 rounded-[2rem] flex flex-col items-center justify-center transition-all duration-500 active:scale-95 shadow-lg border-2",
              shakeEnabled ? "bg-gradient-to-br from-orange-500 to-red-600 border-orange-300 text-white" : "bg-secondary/40 border-border/60 text-muted-foreground"
            )}
          >
            <div className="flex items-center space-x-3">
              <Zap className={cn("w-6 h-6", shakeEnabled ? "animate-bounce" : "")} />
              <span className="text-lg font-black uppercase italic tracking-tighter">{t.shakeSos}</span>
            </div>
            <span className="text-[10px] font-bold uppercase opacity-80 mt-1">
              {shakeEnabled ? `${t.activeDetection} (${shakeSensitivity})` : t.sensorDisabled}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}