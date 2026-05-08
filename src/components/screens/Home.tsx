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
  
  // 🔥 FAST CACHE STATES (Zero Loading Delay)
  const [shakeEnabled, setShakeEnabled] = useState(false);
  const [shakeSensitivity, setShakeSensitivity] = useState("high");
  const [fastContact, setFastContact] = useState<any>(null);
  const [shakeStatus, setShakeStatus] = useState<"idle" | "detected" | "triggered">("idle");

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

  // 🚀 FAST ENGINE STEP 1: App khulte hi Memory se Contact aur Settings nikal lo (0 seconds)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Load Contact
      const cachedContact = localStorage.getItem('safehelp_fast_contact');
      if (cachedContact) {
        try { setFastContact(JSON.parse(cachedContact)); } catch (e) {}
      }
      // Load Settings
      const cachedSettings = localStorage.getItem('safehelp_fast_settings');
      if (cachedSettings) {
        try {
          const parsed = JSON.parse(cachedSettings);
          setShakeEnabled(parsed.shakeSos || false);
          setShakeSensitivity(parsed.shakeSensitivity || "high");
        } catch (e) {}
      }
    }
  }, []);

  // 🚀 FAST ENGINE STEP 2: Firebase se data aane par Memory ko chupchaap update kar do
  useEffect(() => {
    if (profile && profile.contacts && profile.contacts.length > 0) {
      const starred = profile.contacts.find((c: any) => c.isPrimary);
      const contactToSave = starred || profile.contacts[0];
      setFastContact(contactToSave); // UI update
      if (typeof window !== 'undefined') {
        localStorage.setItem('safehelp_fast_contact', JSON.stringify(contactToSave));
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

  // ⚡ SHAKE TOGGLE LOGIC
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

  // ⚡ BULLET-FAST QUICK CALL
  const handleQuickCall = () => {
    if (fastContact && fastContact.phone) {
      window.location.href = `tel:${fastContact.phone}`;
    } else {
      toast({
        variant: "destructive",
        title: "No Contact Found",
        description: "Please add an emergency contact first.",
      });
      navigateTo("contacts");
    }
  };

  // ⚡ BULLET-FAST QUICK SMS
  const handleQuickMessage = () => {
    if (!fastContact || !fastContact.phone) {
      toast({
        variant: "destructive",
        title: "No Contact Found",
        description: "Please add an emergency contact first.",
      });
      navigateTo("contacts");
      return;
    }

    const customMessage = settings?.sosMessage || "🚨 EMERGENCY! I need help immediately. My live location is attached below. Please respond ASAP. 🚨";
    
    const sendSMS = (lat?: number, lng?: number) => {
      const locationPart = lat && lng ? `\n\n📍 https://maps.google.com/?q=${lat},${lng}` : "";
      const msg = `🚨 EMERGENCY ALERT 🚨\n\n${customMessage}${locationPart}\n\n- Sent via SafeHelp App`;
      window.location.href = `sms:${fastContact.phone}?body=${encodeURIComponent(msg)}`;
    };

    if ("geolocation" in navigator) {
      toast({ title: "Getting location..." });
      navigator.geolocation.getCurrentPosition(
        (pos) => sendSMS(pos.coords.latitude, pos.coords.longitude),
        () => sendSMS(),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      sendSMS();
    }
  };

  // 🔹 Advanced Shake Detection System
  const shakeStartTimeRef = useRef<number>(0);
  const cooldownRef = useRef<number>(0);

  useEffect(() => {
    if (!shakeEnabled || isSOSActive) return;

    const SENSITIVITY_THRESHOLDS: Record<string, number> = {
      low: 15,
      medium: 25,
      high: 35
    };
    
    const threshold = SENSITIVITY_THRESHOLDS[shakeSensitivity] || 35;
    const SHAKE_WINDOW_MS = 500; 
    const COOLDOWN_MS = 3000;    

    const handleMotion = (event: DeviceMotionEvent) => {
      const acceleration = event.accelerationIncludingGravity;
      if (!acceleration) return;

      const now = Date.now();
      if (now < cooldownRef.current) return;

      const x = Math.abs(acceleration.x || 0);
      const y = Math.abs(acceleration.y || 0);
      const z = Math.abs(acceleration.z || 0);
      const totalForce = x + y + z;

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
          
          toast({
            variant: "destructive",
            title: t.emergencyActivated,
            description: "Shake intensity confirmed."
          });
          
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

  return (
    <div className="flex flex-col min-h-screen bg-background relative overflow-y-auto">
      {/* Header Area */}
      <div className="p-6 shrink-0 flex justify-between items-center w-full max-w-md mx-auto z-10">
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigateTo("profile")} 
            className="rounded-full bg-secondary w-12 h-12 border border-border/50"
          >
            <User className="w-6 h-6" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigateTo("tracking")} 
            className="rounded-full bg-secondary w-12 h-12 border border-border/50"
          >
            <Map className="w-6 h-6 text-primary" />
          </Button>
        </div>
        
        <div className="flex flex-col items-center">
          <div className={cn(
            "px-4 py-1.5 rounded-full flex items-center space-x-2 border shadow-sm transition-all",
            isSOSActive ? "bg-primary/10 border-primary/20" : 
            shakeStatus === "detected" ? "bg-orange-500/10 border-orange-500/20" :
            "bg-green-500/10 border-green-500/20"
          )}>
            <div className={cn(
              "w-2 h-2 rounded-full", 
              isSOSActive ? 'bg-primary animate-pulse' : 
              shakeStatus === "detected" ? 'bg-orange-500 animate-bounce' :
              'bg-green-500'
            )}></div>
            <span className={cn(
              "text-[10px] font-bold tracking-widest uppercase", 
              isSOSActive ? 'text-primary' : 
              shakeStatus === "detected" ? 'text-orange-500' :
              'text-green-500'
            )}>
              {isSOSActive ? t.sosActive : shakeStatus === "detected" ? t.shakeDetected : t.systemSafe}
            </span>
          </div>
        </div>

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigateTo("settings")} 
          className="rounded-full bg-secondary w-12 h-12"
        >
          <Settings className="w-6 h-6" />
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center px-6 pb-12 w-full max-w-md mx-auto space-y-10">
        
        {/* Welcome Text */}
        <div className="text-center space-y-1 mt-4">
          <h1 className="text-3xl font-headline font-bold">{t.hello}, {userName}</h1>
          <p className="text-muted-foreground font-medium text-sm">{t.tapEmergency}</p>
        </div>

        {/* SOS Button */}
        <div className="relative flex items-center justify-center w-full">
          <button 
            onClick={() => navigateTo("sos-activation")}
            className={cn(
              "w-64 h-64 rounded-full sos-gradient flex flex-col items-center justify-center transition-all duration-300 active:scale-95 shadow-2xl relative z-10",
              isSOSActive ? 'animate-blink' : 'pulse-primary'
            )}
          >
            <AlertCircle className="w-16 h-16 text-white mb-2" />
            <span className="text-6xl font-headline font-bold text-white tracking-widest">SOS</span>
          </button>
          <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full scale-125 -z-0"></div>
        </div>

        {/* Primary Emergency Actions */}
        <div className="grid grid-cols-1 w-full gap-4 max-w-sm">
          <Button 
            onClick={() => navigateTo("voice-command")}
            className="w-full h-18 rounded-[1.5rem] bg-primary text-white text-lg font-bold glow-primary shadow-lg border-none active:scale-95 transition-all"
          >
            <Mic className="w-6 h-6 mr-3" />
            {t.voiceCommand}
          </Button>
          
          <div className="grid grid-cols-2 gap-4">
            <Button 
              onClick={handleQuickCall}
              variant="outline"
              className="h-20 rounded-[1.5rem] bg-secondary/30 flex flex-col items-center justify-center border-none active:scale-95 transition-all group"
            >
              <Phone className="w-6 h-6 text-green-500 mb-1 group-active:scale-90" />
              <span className="text-[10px] font-bold uppercase tracking-tighter">{t.quickCall}</span>
            </Button>
            <Button 
              onClick={handleQuickMessage}
              variant="outline"
              className="h-20 rounded-[1.5rem] bg-secondary/30 flex flex-col items-center justify-center border-none active:scale-95 transition-all group"
            >
              <MessageSquare className="w-6 h-6 text-blue-400 mb-1 group-active:scale-90" />
              <span className="text-[10px] font-bold uppercase tracking-tighter">{t.quickSms}</span>
            </Button>
          </div>
        </div>

        {/* Secondary Actions & Info */}
        <div className="w-full space-y-4 max-w-sm pt-4">
          <button 
            onClick={() => navigateTo("contacts")} 
            className="w-full h-20 bg-accent rounded-[1.5rem] flex items-center justify-between px-6 shadow-lg active:scale-95 transition-all"
          >
            <div className="flex items-center space-x-4 text-white">
              <div className="p-2.5 bg-white/20 rounded-xl">
                <Users className="w-6 h-6" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-base font-bold uppercase tracking-wider">{t.emergencyContacts}</span>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Advanced Shake SOS Toggle at bottom */}
        <div className="w-full flex flex-col items-center space-y-3 pt-6 pb-4">
          <button 
            onClick={() => toggleShake(!shakeEnabled)}
            className={cn(
              "w-full max-w-sm h-20 rounded-[1.5rem] flex items-center justify-center space-x-4 transition-all duration-300 active:scale-95 shadow-lg border-2",
              shakeEnabled 
                ? "bg-gradient-to-br from-yellow-400 to-orange-500 border-yellow-200/50" 
                : "bg-secondary/40 border-border/50"
            )}
          >
            <Zap className={cn("w-6 h-6", shakeEnabled ? "text-white" : "text-muted-foreground")} />
            <div className="flex flex-col items-start">
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
            <span className={cn("text-[9px] font-bold uppercase tracking-tighter", shakeEnabled ? "text-green-500" : "text-muted-foreground")}>
              {t.status}: {shakeEnabled ? t.enabled : t.disabled}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}