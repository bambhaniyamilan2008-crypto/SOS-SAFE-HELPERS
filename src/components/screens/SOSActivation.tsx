"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, X, Check, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface SOSActivationProps {
  onCancel: () => void;
  onActivated: () => void;
  t: any;
}

export default function SOSActivation({ onCancel, onActivated, t }: SOSActivationProps) {
  const [countdown, setCountdown] = useState(3);
  const [locationStatus, setLocationStatus] = useState(t.fetchingLocation);
  const [messageStatus, setMessageStatus] = useState(t.preparingAlert);
  
  const hasSpokenRef = useRef(false);
  const isActionDoneRef = useRef(false);
  
  // 🔥 API WALI AUDIO KO CONTROL KARNE KA REF
  const audioRef = useRef<HTMLAudioElement | null>(null); 

  // 🔥 NAYA API-BASED VOICE ENGINE (Limit aane par chup ho jayega)
  const speak = async (text: string) => {
    // 👉 STEP 1: YAHAN APNI API KEY DALO
    const API_KEY = "66def89da92b48fbbc5ee6b34eab3456"; 

    // Jab tak aap key nahi daloge, system chup rahega
    if (API_KEY === "66def89da92b48fbbc5ee6b34eab3456") return;

    try {
      if (audioRef.current) {
        audioRef.current.pause(); // Agar purani awaaz chal rahi hai toh rok do
      }

      // VoiceRSS API URL (Indian English 'Jai' ki clear awaaz ke sath)
      const url = `https://api.voicerss.org/?key=${API_KEY}&hl=en-in&v=Jai&c=MP3&src=${encodeURIComponent(text)}`;
      const audio = new Audio(url);
      audioRef.current = audio;

      // Agar limit (quota) khatam ho gayi, ya network issue aaya
      // toh API MP3 file nahi degi, aur audio object fail ho jayega.
      // Yeh `.catch()` usko chupchap ignore kar dega (Chup ho jayega!)
      await audio.play().catch(() => {
        console.log("API Limit Reached or Blocked. System is staying silent.");
      });
      
    } catch (error) {
      // Kisi bhi error par koi awaz nahi, app smooth chalti rahegi
    }
  };

  useEffect(() => {
    if (!hasSpokenRef.current) {
      speak(`${t.sosActivated}. Alerts will be sent in 3 seconds.`);
      hasSpokenRef.current = true;
    }

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => setLocationStatus(t.locationAttached),
        () => setLocationStatus(t.gpsWeak),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }

    const messageTimer = setTimeout(() => {
      if (!isActionDoneRef.current) {
        setMessageStatus(t.sendingSms);
      }
    }, 1500);

    return () => clearTimeout(messageTimer);
  }, [t]);

  useEffect(() => {
    if (isActionDoneRef.current) return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        if (!isActionDoneRef.current) setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      isActionDoneRef.current = true;
      speak("Emergency alerts sent. Tracking is live.");
      onActivated();
    }
  }, [countdown, onActivated]);

  // 🔥 SAFE CANCEL BUTTON
  const handleCancel = () => {
    isActionDoneRef.current = true; 
    if (audioRef.current) {
      audioRef.current.pause(); // API wali awaaz turant rok dega
    }
    onCancel();
  };

  // 🔥 SAFE SEND BUTTON
  const handleSendNow = () => {
    isActionDoneRef.current = true; 
    if (audioRef.current) {
      audioRef.current.pause();
    }
    speak("Emergency alerts sent. Tracking is live.");
    onActivated();
  };

  return (
    <div className="flex flex-col min-h-screen p-8 justify-between items-center bg-black text-white relative">
      <div className="absolute inset-0 bg-primary/10 animate-pulse pointer-events-none"></div>
      <div className="absolute top-0 left-0 w-full h-1 bg-primary animate-blink"></div>

      <div className="relative z-10 w-full text-center space-y-4 pt-12">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-primary rounded-full glow-primary animate-bounce">
            <ShieldAlert className="w-12 h-12 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-headline font-bold tracking-tight uppercase text-primary animate-pulse">
          {t.sosActivated}
        </h1>
        <div className="space-y-1">
          <p className="text-lg font-bold text-white/90">{messageStatus}</p>
          <div className="flex items-center justify-center space-x-2 text-primary">
            <MapPin className="w-5 h-5" />
            <span className="text-sm font-bold uppercase tracking-widest">{locationStatus}</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center flex-1 w-full py-12">
        <div className="relative w-64 h-64 rounded-full border-[12px] border-primary/20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-[12px] border-primary border-t-transparent animate-spin-slow"></div>
          <span className="text-9xl font-headline font-bold text-primary transition-all scale-110">
            {countdown}
          </span>
        </div>
        <p className="mt-8 text-muted-foreground font-bold uppercase tracking-[0.3em] text-xs">
          {t.autoSending} {countdown}s
        </p>
      </div>

      <div className="relative z-10 w-full grid grid-cols-2 gap-4 pb-12">
        <Button 
          variant="ghost" 
          onClick={handleCancel} 
          className="h-24 rounded-[2rem] border-2 border-white/20 text-white text-xl font-bold bg-white/5 hover:bg-white/10 active:scale-95 transition-all flex flex-col items-center justify-center"
        >
          <X className="w-8 h-8 mb-1" />
          <span>{t.cancel}</span>
        </Button>
        <Button 
          onClick={handleSendNow} 
          className="h-24 rounded-[2rem] bg-primary text-white text-xl font-bold glow-primary hover:bg-primary/90 active:scale-95 transition-all flex flex-col items-center justify-center"
        >
          <Check className="w-8 h-8 mb-1" />
          <span>{t.sendNow}</span>
        </Button>
      </div>

      <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 2s linear infinite;
        }
      `}</style>
    </div>
  );
}