"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, X, Check, ShieldAlert, Shield, Activity, Flame, LifeBuoy, MessageSquare } from "lucide-react"; 

// 🔥 FIREBASE IMPORTS
import { collection, addDoc, serverTimestamp, doc, updateDoc, query, where, getDocs, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase"; 
import { useUser } from "@/firebase";

// ❌ EXPO IMPORTS HATA DIYE! WEB MEIN INKI ZAROORAT NAHI HAI.

interface SOSActivationProps {
  onCancel: () => void;
  onActivated: () => void;
  t: any;
}

export default function SOSActivation({ onCancel, onActivated, t }: SOSActivationProps) {
  const { user } = useUser();
  
  const [countdown, setCountdown] = useState(3);
  const [locationStatus, setLocationStatus] = useState(t.fetchingLocation || "Fetching Location...");
  const [messageStatus, setMessageStatus] = useState(t.preparingAlert || "Preparing Alert...");
  
  const [userDisability, setUserDisability] = useState("None");
  const [showCategories, setShowCategories] = useState(false);
  const [timerActive, setTimerActive] = useState(true);
  
  const hasSpokenRef = useRef(false);
  const isActionDoneRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null); 
  const alertIdRef = useRef<string | null>(null);

  // 🌟 SETUP SE STARRED (PRIMARY) CONTACT NIKALNA
  const getStarredContact = () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('safehelp_fast_contact');
      if (saved) return JSON.parse(saved);
    }
    return null;
  };

  useEffect(() => {
    const fetchDisability = async () => {
      if (user?.uid && db) {
        try {
          const userSnap = await getDoc(doc(db, "users", user.uid));
          if (userSnap.exists() && userSnap.data().disabilityType) {
            setUserDisability(userSnap.data().disabilityType);
          }
        } catch (error) { console.error("Disability fetch error:", error); }
      }
    };
    fetchDisability();
  }, [user]);

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

  // 🚀 MAIN LOGIC: CHECK INTERNET AND FIRE ALERT (WEB NATIVE)
  const checkInternetAndFire = async (category = "SOS Activated") => {
    try {
      // ✅ WEB NATIVE INTERNET CHECK (No package needed)
      if (typeof window !== 'undefined' && navigator.onLine) {
        // 🌐 ONLINE: Seedha Firebase Dashboard pe bhejo
        fireDashboardAlert(category);
        onActivated(); // Tracking page pe jao
      } else {
        // 📶 OFFLINE: SMS Fallback chalao
        handleOfflineSMS(category);
      }
    } catch (error) {
      console.error("Network check failed, defaulting to offline SMS", error);
      handleOfflineSMS(category);
    }
  };

  // 📶 OFFLINE SMS HANDLER (WEB NATIVE)
  const handleOfflineSMS = async (category: string) => {
    setMessageStatus("OFFLINE MODE: Opening SMS...");
    const starred = getStarredContact();
    
    if (!starred) {
       alert("No Starred Contact found! Please setup contacts first.");
       onCancel();
       return;
    }

    // Get Offline GPS Coords
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=$${latitude},${longitude}`;
        const smsBody = `🚨 EMERGENCY ALERT! 🚨\nType: ${category}\nI need urgent help. My current location:\n📍 ${googleMapsLink}`;

        // ✅ WEB NATIVE SMS OPENER (No package needed)
        window.location.href = `sms:${starred.phone}?body=${encodeURIComponent(smsBody)}`;
        
        // SMS app open hone ke baad Tracking Screen par le jao
        onActivated();
      },
      (err) => {
        alert("GPS Error: Could not get location for SMS.");
        // Agar GPS fail bhi ho jaye, tab bhi SMS kholega bina location ke
        const backupBody = `🚨 EMERGENCY ALERT! 🚨\nType: ${category}\nI need urgent help! (Location unavailable due to GPS error)`;
        window.location.href = `sms:${starred.phone}?body=${encodeURIComponent(backupBody)}`;
        
        onActivated();
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  // 🌐 ONLINE DASHBOARD SENDER
  const fireDashboardAlert = async (alertCategory: string) => {
    try {
      let finalName = user?.displayName || "Unknown User";
      let finalPhone = "Not Provided";
      const finalUserId = user?.uid || "unknown_id";

      if (typeof window !== 'undefined') {
        const cachedProfile = localStorage.getItem('safehelp_profile_cache');
        if (cachedProfile) {
          try {
            const parsed = JSON.parse(cachedProfile);
            if (parsed.name) finalName = parsed.name;
            if (parsed.phone) finalPhone = parsed.phone;
          } catch (e) {}
        }
      }

      const docRef = await addDoc(collection(db, "alerts"), {
        userName: finalName, 
        userId: finalUserId, 
        phone: finalPhone, 
        status: "active",
        timestamp: serverTimestamp(),
        type: alertCategory, 
        lat: null, 
        lng: null
      });
      
      alertIdRef.current = docRef.id;

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          if (alertIdRef.current) {
            await updateDoc(doc(db, "alerts", alertIdRef.current), { lat, lng });
          }
        },
        (err) => console.error("GPS Error: ", err),
        { enableHighAccuracy: true }
      );
    } catch (e) { console.error("Firebase Error: ", e); }
  };

  const handleCancel = async () => {
    if (audioRef.current) audioRef.current.pause();
    try {
      const q = query(collection(db, "alerts"), where("status", "==", "active"));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const updatePromises = querySnapshot.docs.map((alertDoc) => {
          return updateDoc(doc(db, "alerts", alertDoc.id), {
            status: "resolved",
            resolvedAt: serverTimestamp()
          });
        });
        await Promise.all(updatePromises);
      }
    } catch (error) {}
    onCancel(); 
  };

  const triggerSpecificEmergency = (type: string) => {
    isActionDoneRef.current = true;
    checkInternetAndFire(type);
  };

  const handleSendNow = () => {
    if (audioRef.current) audioRef.current.pause();
    setTimerActive(false); 
    if (userDisability === "Visually Impaired") {
      isActionDoneRef.current = true;
      checkInternetAndFire("🔴 HIGH URGENCY: Visually Impaired");
    } else {
      setShowCategories(true);
    }
  };

  useEffect(() => {
    if (!timerActive || isActionDoneRef.current) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setTimerActive(false);
      if (userDisability === "Visually Impaired") {
        isActionDoneRef.current = true;
        checkInternetAndFire("🔴 HIGH URGENCY: Visually Impaired");
      } else {
        setShowCategories(true);
      }
    }
  }, [countdown, timerActive, userDisability]);

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
          {t.sosActivated || "SOS Activated"}
        </h1>
        <div className="space-y-1 text-red-100">
          <p className="text-lg font-bold">{messageStatus}</p>
          <div className="flex items-center justify-center space-x-2">
            <MapPin className="w-5 h-5 text-red-600" />
            <span className="text-sm font-bold uppercase tracking-widest">{locationStatus}</span>
          </div>
        </div>
      </div>

      {showCategories ? (
        <div className="relative z-10 w-full flex flex-col items-center justify-center flex-1 py-8 animate-in zoom-in duration-300">
          <h2 className="text-xl font-black uppercase text-red-500 mb-6 tracking-widest text-center">Select Type</h2>
          <div className="grid grid-cols-2 gap-4 w-full max-w-xs mx-auto">
            <Button onClick={() => triggerSpecificEmergency("🚓 Police / Threat")} className="h-28 bg-blue-600 rounded-[2rem] flex flex-col items-center justify-center shadow-lg active:scale-95 transition-all">
              <Shield className="w-10 h-10 text-white mb-2" />
              <span className="text-xs font-black uppercase text-white tracking-widest">Police</span>
            </Button>
            <Button onClick={() => triggerSpecificEmergency("🚑 Medical / Ambulance")} className="h-28 bg-rose-600 rounded-[2rem] flex flex-col items-center justify-center shadow-lg active:scale-95 transition-all">
              <Activity className="w-10 h-10 text-white mb-2" />
              <span className="text-xs font-black uppercase text-white tracking-widest">Medical</span>
            </Button>
            <Button onClick={() => triggerSpecificEmergency("🔥 Fire / Accident")} className="h-28 bg-orange-600 rounded-[2rem] flex flex-col items-center justify-center shadow-lg active:scale-95 transition-all">
              <Flame className="w-10 h-10 text-white mb-2" />
              <span className="text-xs font-black uppercase text-white tracking-widest">Fire</span>
            </Button>
            <Button onClick={() => triggerSpecificEmergency("🆘 General Help")} className="h-28 bg-slate-700 rounded-[2rem] flex flex-col items-center justify-center shadow-lg active:scale-95 transition-all">
              <LifeBuoy className="w-10 h-10 text-white mb-2" />
              <span className="text-xs font-black uppercase text-white tracking-widest">General</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex flex-col items-center justify-center flex-1 w-full py-12">
          <div className="relative w-64 h-64 rounded-full border-[12px] border-red-600/20 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-[12px] border-red-600 border-t-transparent animate-spin-slow"></div>
            <span className="text-9xl font-black text-red-600">{countdown}</span>
          </div>
        </div>
      )}

      <div className={`relative z-10 w-full pb-12 ${showCategories ? 'flex justify-center' : 'grid grid-cols-2 gap-4'}`}>
        <Button 
          variant="ghost" 
          onClick={handleCancel} 
          className={`h-24 rounded-[2rem] border-2 border-white/20 text-white text-xl font-black bg-white/5 hover:bg-red-600/20 active:scale-95 transition-all flex flex-col ${showCategories ? 'w-full max-w-xs' : ''}`}
        >
          <X className="w-8 h-8 mb-1" />
          <span className="text-xs uppercase">I AM SAFE</span>
        </Button>
        
        {!showCategories && (
          <Button 
            onClick={handleSendNow} 
            className="h-24 rounded-[2rem] bg-red-600 text-white text-xl font-black shadow-xl shadow-red-900/40 hover:bg-red-700 active:scale-95 transition-all flex flex-col"
          >
            <Check className="w-8 h-8 mb-1" />
            <span className="text-xs uppercase">{t.sendNow || "SEND NOW"}</span>
          </Button>
        )}
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