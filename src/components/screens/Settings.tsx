"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { AppScreen } from "../SafeHelpApp";
import { 
  ArrowLeft, Moon, Type, MessageCircle, Mic, Zap, 
  Settings as SettingsIcon,
  ChevronRight, UserCircle, LogOut, Globe, Sliders,
  Loader2
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useUser, useFirestore, useDoc, useAuth } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { Language } from "@/lib/translations";

interface SettingsProps {
  navigateTo: (screen: AppScreen) => void;
  lang: Language;
  setLang: (lang: Language) => void;
  t: any;
}

export default function Settings({ navigateTo, lang, setLang, t }: SettingsProps) {
  const { user } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  
  const settingsRef = useMemo(() => {
    if (!user || !db) return null;
    return doc(db, "users", user.uid, "settings", "default");
  }, [user, db]);

  const { data: remoteSettings, loading } = useDoc(settingsRef);

  const [settings, setSettings] = useState({
    voiceSos: true,
    shakeSos: true,
    shakeSensitivity: "high",
    largeText: false,
    darkMode: false,
    voiceGuidance: false,
    shareMedical: true,
    notifications: true,
    sosMessage: "🚨 EMERGENCY! I need help immediately. My live location is attached below. Please respond ASAP. 🚨"
  });

  const [tempMessage, setTempMessage] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // 🔥 FAST CACHE ENGINE: Get Settings Instantly from Memory
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cachedSettings = localStorage.getItem('safehelp_fast_settings');
      if (cachedSettings) {
        try { 
          setSettings(prev => ({ ...prev, ...JSON.parse(cachedSettings) })); 
        } catch (e) {}
      }
    }
  }, []);

  // 🔥 BACKGROUND SYNC: Update from Firebase quietly
  useEffect(() => {
    if (remoteSettings) {
      setSettings(prev => ({ ...prev, ...remoteSettings }));
      if (typeof window !== 'undefined') {
        localStorage.setItem('safehelp_fast_settings', JSON.stringify(remoteSettings));
      }
    }
  }, [remoteSettings]);

  useEffect(() => {
    if (settings.largeText) document.documentElement.style.fontSize = "115%";
    else document.documentElement.style.fontSize = "100%";

    if (settings.darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [settings.largeText, settings.darkMode]);

  const updateSetting = (key: keyof typeof settings, value: any) => {
    if (!user || !db) return;
    const newSettings = { ...settings, [key]: value };
    
    // UI mein turant update karo (No Waiting)
    setSettings(newSettings);
    
    // Cache mein turant update karo
    if (typeof window !== 'undefined') {
      localStorage.setItem('safehelp_fast_settings', JSON.stringify(newSettings));
    }
    
    // Firebase par background me bhejo
    const ref = doc(db, "users", user.uid, "settings", "default");
    setDoc(ref, newSettings, { merge: true });
    
    toast({ title: "Setting Updated" });
  };

  const handleEditMessage = () => {
    setTempMessage(settings.sosMessage);
    setIsDialogOpen(true);
  };

  const saveSosMessage = () => {
    updateSetting('sosMessage', tempMessage);
    setIsDialogOpen(false);
  };

  const handleSignOut = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      toast({ title: "Signed out successfully" });
      navigateTo("auth");
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Error signing out", 
        description: error.message 
      });
    }
  };

  const SettingItem = ({ icon: Icon, title, desc, checked, onToggle, onClick }: any) => (
    <div 
      className={cn(
        "flex items-center justify-between p-5 bg-secondary/30 rounded-[2rem] border transition-all", 
        checked ? "border-primary/40 bg-primary/5" : "border-border/50",
        onClick && "cursor-pointer active:scale-[0.98]"
      )}
      onClick={onClick}
    >
      <div className="flex items-center space-x-4">
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", checked ? "bg-primary text-white" : "bg-secondary")}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex flex-col">
          <p className="font-bold text-lg leading-tight">{title}</p>
          <p className="text-xs text-muted-foreground font-medium mt-1">{desc}</p>
        </div>
      </div>
      {onToggle ? (
        <Switch checked={checked} onCheckedChange={onToggle} className="data-[state=checked]:bg-primary" />
      ) : (
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      )}
    </div>
  );

  // ❌ YAHAN SE 'if (loading) return null;' HATA DIYA GAYA HAI

  return (
    <div className="flex flex-col min-h-screen p-6 bg-background">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => navigateTo("home")} className="rounded-full bg-secondary w-12 h-12">
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-3xl font-headline font-bold">{t.settings}</h1>
        </div>
        
        {/* Sync Indicator: Jab internet se data aa raha hoga tab ghoomega, warna ruk jayega */}
        <div className="relative">
          {loading ? (
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          ) : (
            <SettingsIcon className="w-6 h-6 text-muted-foreground opacity-50" />
          )}
        </div>
      </div>

      <div className="flex-1 space-y-8 pb-24">
        {/* Language Selector */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 px-2"><Globe className="w-4 h-4 text-primary" /><h2 className="text-sm font-bold text-primary uppercase tracking-widest">{t.language}</h2></div>
          <div className="grid grid-cols-3 gap-2 bg-secondary/30 p-2 rounded-[2rem]">
            {[
              { id: 'en', label: 'English', flag: '🇺🇸' },
              { id: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
              { id: 'gu', label: 'ગુજરાતી', flag: '🇮🇳' }
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => setLang(option.id as Language)}
                className={cn(
                  "flex flex-col items-center justify-center py-4 rounded-2xl transition-all",
                  lang === option.id 
                    ? "bg-primary text-white shadow-lg scale-105" 
                    : "bg-transparent text-muted-foreground hover:bg-secondary/50"
                )}
              >
                <span className="text-xl mb-1">{option.flag}</span>
                <span className="text-[10px] font-bold uppercase">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-2 px-2"><Zap className="w-4 h-4 text-primary" /><h2 className="text-sm font-bold text-primary uppercase tracking-widest">Activations</h2></div>
          <div className="grid gap-3">
            <SettingItem 
              icon={Mic} 
              title="Voice SOS" 
              desc="Open Voice Monitor" 
              checked={settings.voiceSos} 
              onClick={() => navigateTo("voice-command")}
            />
            <SettingItem icon={Zap} title="Shake SOS" desc="Trigger on movement" checked={settings.shakeSos} onToggle={(v: boolean) => updateSetting('shakeSos', v)} />
          </div>
          
          {settings.shakeSos && (
            <div className="space-y-3 px-2 pt-2">
              <div className="flex items-center space-x-2"><Sliders className="w-4 h-4 text-primary" /><h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t.sensitivity}</h3></div>
              <div className="grid grid-cols-3 gap-2 bg-secondary/20 p-1.5 rounded-2xl">
                {[
                  { id: 'low', label: t.low },
                  { id: 'medium', label: t.medium },
                  { id: 'high', label: t.high }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => updateSetting('shakeSensitivity', opt.id)}
                    className={cn(
                      "py-2.5 rounded-xl text-[10px] font-bold uppercase transition-all",
                      settings.shakeSensitivity === opt.id ? "bg-primary text-white shadow-md" : "text-muted-foreground"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-2 px-2"><Type className="w-4 h-4 text-primary" /><h2 className="text-sm font-bold text-primary uppercase tracking-widest">Display</h2></div>
          <div className="grid gap-3">
            <SettingItem icon={Type} title="Large Text" desc="Font scaling 1.15x" checked={settings.largeText} onToggle={(v: boolean) => updateSetting('largeText', v)} />
            <SettingItem icon={Moon} title="Dark Mode" desc="High contrast theme" checked={settings.darkMode} onToggle={(v: boolean) => updateSetting('darkMode', v)} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-2 px-2"><MessageCircle className="w-4 h-4 text-primary" /><h2 className="text-sm font-bold text-primary uppercase tracking-widest">Alerts</h2></div>
          <div className="grid gap-3">
            <button onClick={handleEditMessage} className="flex items-center justify-between p-5 bg-secondary/30 rounded-[2rem] border border-border/50 text-left">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center"><MessageCircle className="w-6 h-6" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-lg leading-tight">SOS Message</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[180px]">{settings.sosMessage}</p>
                </div>
              </div>
              <div className="px-4 py-2 bg-primary/10 text-primary rounded-xl text-xs font-bold uppercase">Edit</div>
            </button>
          </div>
        </div>

        <div className="space-y-4 pt-4">
          <Button onClick={() => navigateTo("profile")} className="w-full h-20 rounded-[2.5rem] bg-primary text-white flex items-center justify-between px-8 glow-primary">
            <div className="flex items-center space-x-4"><UserCircle className="w-8 h-8" /><span className="text-xl font-bold uppercase tracking-widest">{t.profile} Sync</span></div>
            <ChevronRight className="w-6 h-6" />
          </Button>

          <Button 
            variant="ghost" 
            onClick={handleSignOut}
            className="w-full h-16 rounded-[2rem] bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all font-bold flex items-center justify-center space-x-3"
          >
            <LogOut className="w-6 h-6" />
            <span>Log Out</span>
          </Button>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-[2.5rem] p-8">
          <DialogHeader><DialogTitle>Custom SOS Message</DialogTitle></DialogHeader>
          <Textarea value={tempMessage} onChange={(e) => setTempMessage(e.target.value)} className="min-h-[160px] rounded-2xl text-lg p-6" />
          <DialogFooter className="flex-col gap-3">
            <Button onClick={saveSosMessage} className="w-full h-18 text-xl rounded-2xl glow-primary">Save Changes</Button>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}