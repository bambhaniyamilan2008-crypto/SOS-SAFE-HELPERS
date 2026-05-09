"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, X, Check, ShieldAlert } from "lucide-react";

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
  const audioTagRef = useRef<HTMLAudioElement | null>(null);

  const speakSOS = () => {
    const API_KEY = "66def89da92b48fbbc5ee6b34eab3456"; 
    const text = "SOS Activated";
    const url = `https://api.voicerss.org/?key=${API_KEY}&hl=en-in&v=Jai&c=MP3&src=${encodeURIComponent(text)}`;
    
    if (audioTagRef.current) {
      audioTagRef.current.src = url;
      audioTagRef.current.volume = 1.0;
      audioTagRef.current.play().catch((err) => {
        console.log("Audio requires interaction.", err);
      });
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasSpokenRef.current) {
        speakSOS();
        hasSpokenRef.current = true;
      }
    }, 600);

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => setLocationStatus(t.locationAttached),
        () => setLocationStatus(t.gpsWeak),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }

    return () => clearTimeout(timer);
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
      onActivated();
    }
  }, [countdown, onActivated]);

  return (
    <div className="flex flex-col min-h-screen p-8 justify-between items-center bg-black text-white relative">
      <audio ref={audioTagRef} style={{ display: 'none' }} preload="auto" />
      <div className="absolute inset-0 bg-primary/10 animate-pulse pointer-events-none"></div>
      
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
          onClick={onCancel} 
          className="h-24 rounded-[2rem] border-2 border-white/20 text-white text-xl font-bold bg-white/5 hover:bg-white/10 active:scale-95 transition-all flex flex-col items-center justify-center"
        >
          <X className="w-8 h-8 mb-1" />
          <span>{t.cancel}</span>
        </Button>
        <Button 
          onClick={onActivated} 
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