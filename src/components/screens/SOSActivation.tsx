"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, X, Check, ShieldAlert } from "lucide-react";

// 🔥 Naye imports add kiye: query, where, getDocs
import { collection, addDoc, serverTimestamp, doc, updateDoc, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase"; 

interface SOSActivationProps {
  onCancel: () => void;
  onActivated: () => void;
  t: any;
}

export default function SOSActivation({ onCancel, onActivated, t }: SOSActivationProps) {
  const [countdown, setCountdown] = useState(3);
  const [locationStatus, setLocationStatus] = useState(t.fetchingLocation);
  const [messageStatus, setMessageStatus] = useState(t.preparingAlert);
  
  const [currentAlertId, setCurrentAlertId] = useState<string | null>(null);
  const alertIdRef = useRef<string | null>(null);
  
  const hasSpokenRef = useRef(false);
  const isActionDoneRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null); 

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedId = localStorage.getItem("activeAlertId");
      if (savedId) {
        setCurrentAlertId(savedId);
        alertIdRef.current = savedId;
      }
    }
  }, []);

  const speakSOS = () => {
    const API_KEY = "66def89da92b48fbbc5ee6b34eab3456"; 
    try {
      const audioUrl = `https://api.voicerss.org/?key=${API_KEY}&hl=en-in&v=Jai&c=MP3&src=SOS%20Activated`;
      const audio = new Audio(audioUrl);
      audio.volume = 1.0;
      audioRef.current = audio;
      audio.play().catch(() => console.log("Voice blocked by browser"));
    } catch (error) { console.error("Voice Error:", error); }
  };

  const fireDashboardAlert = async () => {
    try {
      const docRef = await addDoc(collection(db, "alerts"), {
        userName: "Milan",
        userId: "milan_2103_8", 
        phone: "+91 91041XXXXX", 
        status: "active",
        timestamp: serverTimestamp(),
        type: "Panic Button",
        lat: null, 
        lng: null
      });
      
      setCurrentAlertId(docRef.id);
      alertIdRef.current = docRef.id;
      if (typeof window !== "undefined") {
        localStorage.setItem("activeAlertId", docRef.id);
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLocationStatus(t.locationAttached || "Location Attached");
          
          const activeId = alertIdRef.current || (typeof window !== "undefined" ? localStorage.getItem("activeAlertId") : null);
          if (activeId) {
            await updateDoc(doc(db, "alerts", activeId), { lat, lng });
          }
        },
        (err) => console.error("GPS Error:", err),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } catch (e) { 
      console.error("Firebase Error: ", e); 
    }
  };

  // 🔥 YAHAN HAI ASLI MAGIC (Direct Database Search & Destroy)
  const resolveSOS = async () => {
    try {
      // 1. Agar ID pata hai, toh sidha resolve karo
      let activeId = currentAlertId || alertIdRef.current;
      if (!activeId && typeof window !== "undefined") {
        activeId = localStorage.getItem("activeAlertId");
      }

      if (activeId) {
        await updateDoc(doc(db, "alerts", activeId), {
          status: "resolved",
          resolvedAt: serverTimestamp()
        });
        if (typeof window !== "undefined") localStorage.removeItem("activeAlertId");
      }

      // 2. ULTIMATE BACKUP: Database mein check karo ki Milan ka koi active alert bacha toh nahi?
      // Agar bacha hai toh usko forcefully resolve kar do!
      const q = query(
        collection(db, "alerts"), 
        where("userId", "==", "milan_2103_8"), 
        where("status", "==", "active")
      );
      
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach(async (alertDoc) => {
        await updateDoc(doc(db, "alerts", alertDoc.id), {
          status: "resolved",
          resolvedAt: serverTimestamp()
        });
        console.log("🔥 Forcefully resolved from Database search:", alertDoc.id);
      });

      console.log("✅ DASHBOARD 100% UPDATED: All Alerts Closed");
    } catch (e) {
      console.error("Resolve Error:", e);
    }
  };

  useEffect(() => {
    const audioTimer = setTimeout(() => {
      if (!hasSpokenRef.current) {
        speakSOS();
        hasSpokenRef.current = true;
      }
    }, 500);
    return () => clearTimeout(audioTimer);
  }, []);

  useEffect(() => {
    if (isActionDoneRef.current) return;

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      isActionDoneRef.current = true;
      fireDashboardAlert();
      onActivated();
    }
  }, [countdown, onActivated]);

  const handleCancel = async () => {
    isActionDoneRef.current = true; 
    if (audioRef.current) audioRef.current.pause();
    
    // 🔥 Resolved hone ka poora wait karo
    await resolveSOS();
    
    onCancel();
  };

  const handleSendNow = () => {
    isActionDoneRef.current = true; 
    if (audioRef.current) audioRef.current.pause();
    fireDashboardAlert();
    onActivated();
  };

  return (
    <div className="flex flex-col min-h-screen p-8 justify-between items-center bg-black text-white relative">
      <div className="absolute inset-0 bg-red-600/10 animate-pulse pointer-events-none"></div>

      <div className="relative z-10 w-full text-center space-y-4 pt-12">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-red-600 rounded-full animate-bounce shadow-[0_0_30px_rgba(220,38,38,0.5)]">
            <ShieldAlert className="w-12 h-12 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-black tracking-tight uppercase text-red-600 animate-pulse">
          {t.sosActivated}
        </h1>
        <div className="space-y-1 text-red-100">
          <p className="text-lg font-bold">{messageStatus}</p>
          <div className="flex items-center justify-center space-x-2">
            <MapPin className="w-5 h-5 text-red-600" />
            <span className="text-sm font-bold uppercase tracking-widest">{locationStatus}</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center flex-1 w-full py-12">
        <div className="relative w-64 h-64 rounded-full border-[12px] border-red-600/20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-[12px] border-red-600 border-t-transparent animate-spin-slow"></div>
          <span className="text-9xl font-black text-red-600">
            {countdown}
          </span>
        </div>
      </div>

      <div className="relative z-10 w-full grid grid-cols-2 gap-4 pb-12">
        <Button 
          variant="ghost" 
          onClick={handleCancel} 
          className="h-24 rounded-[2rem] border-2 border-white/20 text-white text-xl font-black bg-white/5 hover:bg-red-600/20 active:scale-95 transition-all flex flex-col"
        >
          <X className="w-8 h-8 mb-1" />
          <span className="text-xs uppercase">I AM SAFE</span>
        </Button>
        <Button 
          onClick={handleSendNow} 
          className="h-24 rounded-[2rem] bg-red-600 text-white text-xl font-black shadow-xl shadow-red-900/40 hover:bg-red-700 active:scale-95 transition-all flex flex-col"
        >
          <Check className="w-8 h-8 mb-1" />
          <span className="text-xs uppercase">{t.sendNow}</span>
        </Button>
      </div>

      <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 1.5s linear infinite;
        }
      `}</style>
    </div>
  );
}