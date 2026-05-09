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
  const audioRef = useRef<HTMLAudioElement | null>(null); 

  // 🔥 PERFECT VOICE ENGINE: Sirf "SOS Activated" bolega
  const speakSOS = async () => {
    // Aapki Working API Key
    const API_KEY = "66def89da92b48fbbc5ee6b34eab3456"; 

    // Validation: Agar key khali hai toh ruk jao
    if (!API_KEY || API_KEY.length < 10) return;

    try {
      if (audioRef.current) {
        audioRef.current.pause(); 
      }

      // VoiceRSS URL - Language: English India, Voice: Jai (Clear Male)
      const text = "SOS Activated";
      const url = `https://api.voicerss.org/?key=${API_KEY}&hl=en-in&v=Jai&c=MP3&src=${encodeURIComponent(text)}`;
      
      const audio = new Audio(url);
      audioRef.current = audio;

      // Play audio with error handling
      await audio.play().catch((err) => {
        console.log("Audio Playback Blocked: Tap screen to enable sound.");
      });
      
    } catch (error) {
      console.error("Voice Error:", error);
    }
  };

  useEffect(() => {
    // Screen load hote hi awaaz nikalega
    if (!hasSpokenRef.current) {
      speakSOS();
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
  }, []);

  useEffect(() => {
    if (isActionDoneRef.current) return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        if (!isActionDoneRef.current) setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      isActionDoneRef.current = true;
      // Timer khatam hone par live tracking ka message (optional)
      // speakSOS(); // Agar yahan bhi awaaz chahiye toh chalu rakhein
      onActivated();
    }
  }, [countdown, onActivated]);

  const handleCancel = () => {
    isActionDoneRef.current = true; 
    if (audioRef.current) {
      audioRef.current.pause();
    }
    onCancel();
  };

  const handleSendNow = () => {
    isActionDoneRef.current = true; 
    if (audioRef.current) {
      audioRef.current.pause();
    }
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