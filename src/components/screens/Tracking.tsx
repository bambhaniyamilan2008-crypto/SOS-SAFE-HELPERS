"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { 
  Phone, 
  MapPin, 
  MessageSquare, 
  Share2, 
  Layers,
  Plus,
  Minus,
  Map as MapIcon,
  Loader2,
  Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc } from "firebase/firestore";

const DEFAULT_COORDS: [number, number] = [21.7645, 72.1519];

interface TrackingProps {
  onResolve: () => void;
  t: any;
}

export default function Tracking({ onResolve, t }: TrackingProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const db = useFirestore();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  const [coords, setCoords] = useState<[number, number]>(DEFAULT_COORDS);
  const [lastUpdate, setLastUpdate] = useState<string>("Initializing...");
  const [mapType, setMapType] = useState<"normal" | "satellite">("normal");
  const [heading, setHeading] = useState<number>(0);
  const [isMounted, setIsMounted] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  
  // 🔥 GOD MODE: Fast Cache State
  const [fastContact, setFastContact] = useState<any>(null);

  const LRef = useRef<any>(null);
  const MapContainerRef = useRef<any>(null);
  const TileLayerRef = useRef<any>(null);
  const MarkerRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);

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

  // 🔥 FAST CACHE ENGINE: Get Contact Instantly from Memory
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cachedContact = localStorage.getItem('safehelp_fast_contact');
      if (cachedContact) {
        try { setFastContact(JSON.parse(cachedContact)); } catch (e) {}
      }
    }
  }, []);

  useEffect(() => {
    if (profile && profile.contacts && profile.contacts.length > 0) {
      const starred = profile.contacts.find((c: any) => c.isPrimary);
      const contactToSave = starred || profile.contacts[0];
      setFastContact(contactToSave); 
      if (typeof window !== 'undefined') {
        localStorage.setItem('safehelp_fast_contact', JSON.stringify(contactToSave));
      }
    }
  }, [profile]);

  useEffect(() => {
    setIsMounted(true);
    const loadLeaflet = async () => {
      try {
        const L = (await import("leaflet")).default;
        const { MapContainer, TileLayer, Marker } = await import("react-leaflet");
        LRef.current = L;
        MapContainerRef.current = MapContainer;
        TileLayerRef.current = TileLayer;
        MarkerRef.current = Marker;
        setLeafletLoaded(true);
      } catch (error) {
        console.error("Leaflet load failed:", error);
      }
    };
    loadLeaflet();

    let watchId: number;
    if ("geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newCoords: [number, number] = [position.coords.latitude, position.coords.longitude];
          setCoords(newCoords);
          const now = new Date();
          setLastUpdate(`${t.lastUpdate}: ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`);
          if (position.coords.heading !== null) setHeading(position.coords.heading);
        },
        () => setLastUpdate(t.gpsWeak),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [t.lastUpdate, t.gpsWeak]);

  const handleShare = async () => {
    const lat = coords[0];
    const lng = coords[1];
    const url = `https://maps.google.com/?q=${lat},${lng}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'SafeHelp SOS', text: '🚨 EMERGENCY! I need help immediately. My live tracking:', url });
      } catch (err) {}
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: "Link Copied" });
    }
  };

  // 🔥 GOD MODE: TRIPLE ATTACK SMS (No Blocking)
  const handleMessageClick = () => {
    let phoneToMessage = "+919586875178"; 
    if (fastContact && fastContact.phone) phoneToMessage = fastContact.phone;
    else if (profile && profile.contacts && profile.contacts.length > 0) {
      const starred = profile.contacts.find((c: any) => c.isPrimary) || profile.contacts[0];
      phoneToMessage = starred.phone;
    } 

    const cleanPhone = phoneToMessage.replace(/\s+/g, '');
    const customMessage = settings?.sosMessage || "🚨 EMERGENCY! I need help immediately. My live location is attached below. Please respond ASAP. 🚨";
    const lat = coords[0];
    const lng = coords[1];
    
    const messageBody = `🚨 EMERGENCY ALERT 🚨\n\n${customMessage}\n\n📍 Live Tracking: https://maps.google.com/?q=${lat},${lng}\n\n- Sent via SafeHelp App`;
    const encodedMsg = encodeURIComponent(messageBody);

    if (typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
      (window as any).ReactNativeWebView.postMessage(JSON.stringify({ action: "SMS", number: cleanPhone, text: messageBody }));
    }

    setTimeout(() => {
      if (window.top) window.top.location.href = `sms:${cleanPhone}?body=${encodedMsg}`;
      else window.location.href = `sms:${cleanPhone}?body=${encodedMsg}`;
    }, 100);

    setTimeout(() => {
      const link = document.createElement('a');
      link.href = `sms:${cleanPhone}?body=${encodedMsg}`;
      link.target = '_top';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, 200);
  };

  // 🔥 GOD MODE: TRIPLE ATTACK CALL (No Blocking)
  const handleCallSupport = () => {
    let phoneToCall = "+919586875178"; 
    if (fastContact && fastContact.phone) phoneToCall = fastContact.phone;
    else if (profile && profile.contacts && profile.contacts.length > 0) {
      const starred = profile.contacts.find((c: any) => c.isPrimary) || profile.contacts[0];
      phoneToCall = starred.phone;
    } 

    const cleanPhone = phoneToCall.replace(/\s+/g, '');

    if (typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
      (window as any).ReactNativeWebView.postMessage(JSON.stringify({ action: "CALL", number: cleanPhone }));
    }

    setTimeout(() => {
      if (window.top) window.top.location.href = `tel:${cleanPhone}`;
      else window.location.href = `tel:${cleanPhone}`;
    }, 100);

    setTimeout(() => {
      const link = document.createElement('a');
      link.href = `tel:${cleanPhone}`;
      link.target = '_top';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, 200);
  };

  const customMarkerIcon = useMemo(() => {
    if (!leafletLoaded || !LRef.current) return null;
    return LRef.current.divIcon({
      className: 'custom-div-icon',
      html: `
        <div class="relative flex items-center justify-center" style="transform: rotate(${heading}deg);">
          <div class="absolute w-12 h-12 bg-primary/30 rounded-full animate-ping"></div>
          <div class="relative w-10 h-10 bg-primary rounded-full border-4 border-white flex items-center justify-center shadow-lg">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><polygon points="12 2 19 21 12 17 5 21 12 2"/></svg>
          </div>
        </div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
  }, [heading, leafletLoaded]);

  if (!isMounted) return null;

  return (
    <div className="flex flex-col h-screen bg-background relative overflow-hidden" ref={mapContainerRef}>
      {/* MAP LAYER */}
      <div className="absolute inset-0 z-0 bg-secondary/20 flex items-center justify-center">
        {leafletLoaded && MapContainerRef.current ? (
          <MapContainerRef.current 
            center={coords} 
            zoom={16} 
            zoomControl={false}
            style={{ height: '100%', width: '100%' }}
            attributionControl={false}
            whenReady={(map: any) => { mapInstanceRef.current = map.target; }}
          >
            <TileLayerRef.current
              url={mapType === "normal" 
                ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"}
            />
            {customMarkerIcon && <MarkerRef.current position={coords} icon={customMarkerIcon} />}
          </MapContainerRef.current>
        ) : (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="font-bold text-muted-foreground uppercase tracking-widest text-xs">Loading Live Map...</p>
          </div>
        )}
      </div>

      {/* TOP OVERLAYS - GPS STATUS INDICATORS */}
      <div className="absolute top-0 left-0 right-0 z-10 p-6 flex flex-col space-y-3 pointer-events-none">
        <div className="flex items-start justify-between pointer-events-auto">
           <div className="flex flex-col space-y-2">
             <div className="backdrop-blur-xl border rounded-full px-5 py-2.5 flex items-center space-x-3 bg-primary text-white border-primary/20 shadow-2xl">
                <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse"></div>
                <span className="text-[11px] font-bold uppercase tracking-widest">{t.liveTracking}</span>
             </div>
             
             {/* GPS TIME INDICATOR */}
             <div className="backdrop-blur-md bg-black/50 border border-white/10 rounded-full px-4 py-2 self-start shadow-lg flex items-center space-x-2">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">{lastUpdate}</span>
             </div>
           </div>
           
           <Button variant="ghost" size="icon" onClick={handleShare} className="bg-background/90 rounded-full w-12 h-12 shadow-xl border border-border/50">
             <Share2 className="w-6 h-6 text-primary" />
           </Button>
        </div>
      </div>

      {/* MAP CONTROLS */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center space-y-4">
        <Button onClick={() => mapInstanceRef.current?.zoomIn()} className="w-12 h-12 rounded-2xl bg-background/95 shadow-2xl text-primary border border-border/50"><Plus className="w-6 h-6" /></Button>
        <Button onClick={() => mapInstanceRef.current?.zoomOut()} className="w-12 h-12 rounded-2xl bg-background/95 shadow-2xl text-primary border border-border/50"><Minus className="w-6 h-6" /></Button>
        <Button onClick={() => setMapType(prev => prev === "normal" ? "satellite" : "normal")} className="w-12 h-12 rounded-2xl bg-background/95 shadow-2xl text-primary border border-border/50"><Layers className="w-6 h-6" /></Button>
      </div>

      {/* BOTTOM PANEL */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-6 pointer-events-none">
        <div className="max-w-md mx-auto w-full flex flex-col space-y-4 items-end">
          <Button 
            onClick={() => window.open(`https://maps.google.com/?q=${coords[0]},${coords[1]}`, "_blank")} 
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-11 pointer-events-auto font-bold px-5 flex items-center space-x-2 shadow-xl"
          >
            <MapIcon className="w-4 h-4" /> 
            <span className="text-[10px] uppercase">{t.openFullMap}</span>
          </Button>

          <div className="bg-background/95 backdrop-blur-2xl rounded-[2.5rem] p-6 space-y-5 shadow-2xl border border-border/30 pointer-events-auto w-full">
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={handleCallSupport} variant="outline" className="h-16 rounded-2xl bg-secondary/30 border-none group">
                <Phone className="w-6 h-6 text-green-500 mr-2 group-active:scale-90 transition-transform" />
                <span className="text-[10px] uppercase font-bold">{t.callSupport}</span>
              </Button>
              <Button onClick={handleMessageClick} variant="outline" className="h-16 rounded-2xl bg-secondary/30 border-none group">
                <MessageSquare className="w-6 h-6 text-blue-400 mr-2 group-active:scale-90 transition-transform" />
                <span className="text-[10px] uppercase font-bold">{t.message}</span>
              </Button>
            </div>
            <Button onClick={onResolve} className="w-full h-20 rounded-[2rem] bg-green-500 text-white font-bold text-xl glow-primary active:scale-95 transition-all">
              {t.imSafe}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}