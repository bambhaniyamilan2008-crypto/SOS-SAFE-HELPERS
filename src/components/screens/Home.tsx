
"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  MessageSquare
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
  const [shakeEnabled, setShakeEnabled] = useState(false);

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

  // Sync Shake setting with Firestore
  useEffect(() => {
    if (settings) {
      setShakeEnabled(settings.shakeSos || false);
    }
  }, [settings]);

  const primaryContact = useMemo(() => {
    if (!profile?.contacts || profile.contacts.length === 0) return null;
    const starred = profile.contacts.find((c: any) => c.isPrimary);
    if (starred) return starred;
    return profile.contacts[0];
  }, [profile]);

  const toggleShake = async (val: boolean) => {
    setShakeEnabled(val);
    if (user && db) {
      const sRef = doc(db, "users", user.uid, "settings", "default");
      await setDoc(sRef, { shakeSos: val }, { merge: true });
    }
    toast({
      title: val ? "Shake SOS Enabled" : "Shake SOS Disabled",
      description: val ? "Strongly shake your phone to trigger SOS." : "Manual/Voice activation only.",
    });
  };

  const handleQuickCall = () => {
    if (primaryContact && primaryContact.phone) {
      window.location.href = `tel:${primaryContact.phone}`;
    } else {
      toast({
        variant: "destructive",
        title: "No Contact Found",
        description: "Please add an emergency contact first.",
      });
      navigateTo("contacts");
    }
  };

  const handleQuickMessage = () => {
    if (!primaryContact || !primaryContact.phone) {
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
      window.location.href = `sms:${primaryContact.phone}?body=${encodeURIComponent(msg)}`;
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

  // Shake Detection Logic
  useEffect(() => {
    if (!shakeEnabled) return;

    let lastUpdate = 0;
    let lastX = 0, lastY = 0, lastZ = 0;
    const SHAKE_THRESHOLD = 30;
    let lastTriggerTime = 0;

    const handleMotion = (event: DeviceMotionEvent) => {
      const acceleration = event.accelerationIncludingGravity;
      if (!acceleration) return;

      const curTime = Date.now();
      if ((curTime - lastTriggerTime) < 3000) return;

      if ((curTime - lastUpdate) > 100) {
        const diffTime = curTime - lastUpdate;
        lastUpdate = curTime;

        const x = acceleration.x || 0;
        const y = acceleration.y || 0;
        const z = acceleration.z || 0;

        const speed = Math.abs(x + y + z - lastX - lastY - lastZ) / diffTime * 10000;

        if (speed > SHAKE_THRESHOLD) {
          lastTriggerTime = curTime;
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([300, 100, 300]);
          }
          navigateTo("sos-activation");
        }

        lastX = x;
        lastY = y;
        lastZ = z;
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [shakeEnabled, navigateTo]);

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
            "px-4 py-1.5 rounded-full flex items-center space-x-2 border shadow-sm",
            isSOSActive ? "bg-primary/10 border-primary/20" : "bg-green-500/10 border-green-500/20"
          )}>
            <div className={cn("w-2 h-2 rounded-full", isSOSActive ? 'bg-primary animate-pulse' : 'bg-green-500')}></div>
            <span className={cn("text-[10px] font-bold tracking-widest uppercase", isSOSActive ? 'text-primary' : 'text-green-500')}>
              {isSOSActive ? t.sosActive : t.systemSafe}
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

        {/* Shake SOS Toggle at bottom */}
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
                {shakeEnabled ? t.activeDetection : t.sensorDisabled}
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
