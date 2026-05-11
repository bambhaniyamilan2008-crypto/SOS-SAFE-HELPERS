"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldAlert, Heart, User, Users, ArrowRight, Loader2, EyeOff, EarOff, Accessibility, UserCheck } from "lucide-react";
import { useUser, useFirestore } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

interface EmergencySetupProps {
  onComplete: () => void;
  t?: any;
}

export default function EmergencySetup({ onComplete, t }: EmergencySetupProps) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // 3 Contacts ka state
  const [motherPhone, setMotherPhone] = useState("+91 ");
  const [fatherPhone, setFatherPhone] = useState("+91 ");
  const [friendPhone, setFriendPhone] = useState("+91 ");

  // 🌟 NAYA: Disability State (Default: None)
  const [disability, setDisability] = useState("None");

  const formatPhone = (val: string) => {
    let raw = val;
    const prefix = "+91 ";
    if (!raw.startsWith(prefix)) raw = prefix + raw.replace(/^\+91\s?/, "");
    return prefix + raw.slice(prefix.length).replace(/\D/g, "").slice(0, 10);
  };

  const handleSave = async () => {
    if (!user || !db) return;
    
    // Check if at least one contact is valid (10 digits after +91)
    if (motherPhone.length < 14 && fatherPhone.length < 14 && friendPhone.length < 14) {
      toast({
        title: "⚠️ Incomplete",
        description: "Please add at least ONE valid 10-digit emergency number.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    // Array of contacts exactly how App uses them
    const newContacts = [];
    if (motherPhone.length >= 14) newContacts.push({ id: "1", name: "Mummy", relation: "Mother", phone: motherPhone, isPrimary: true });
    if (fatherPhone.length >= 14) newContacts.push({ id: "2", name: "Papa", relation: "Father", phone: fatherPhone, isPrimary: false });
    if (friendPhone.length >= 14) newContacts.push({ id: "3", name: "Friend", relation: "Friend", phone: friendPhone, isPrimary: false });

    try {
      const userRef = doc(db, "users", user.uid);
      
      // 🌟 NAYA: Database save command me disabilityType add kar diya
      await setDoc(userRef, { 
        contacts: newContacts,
        disabilityType: disability 
      }, { merge: true });
      
      // Cache the first one for fast access
      if (typeof window !== 'undefined' && newContacts.length > 0) {
        localStorage.setItem('safehelp_fast_contact', JSON.stringify(newContacts[0]));
      }
      
      toast({ title: "✅ Setup Complete!" });
      onComplete(); // Move to Home
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // 🌟 NAYA: Disability Options Array for clean UI
  const disabilityOptions = [
    { id: "None", label: "General / None", icon: UserCheck, color: "text-slate-500", bg: "bg-slate-500/10" },
    { id: "Visually Impaired", label: "Visually Impaired", icon: EyeOff, color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { id: "Hearing Impaired", label: "Hearing Impaired", icon: EarOff, color: "text-teal-500", bg: "bg-teal-500/10" },
    { id: "Physically Disabled", label: "Physically Disabled", icon: Accessibility, color: "text-amber-500", bg: "bg-amber-500/10" }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background p-6">
      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full space-y-8">
        
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-headline font-bold">Secure Your Circle</h1>
          <p className="text-muted-foreground text-sm">
            Add at least one emergency contact. We will send SOS alerts to these numbers.
          </p>
        </div>

        <div className="space-y-4 mt-8">
          {/* MUMMY CONTACT */}
          <div className="bg-secondary/30 p-4 rounded-3xl border border-border/50 flex items-center space-x-4">
            <div className="w-12 h-12 bg-pink-500/10 rounded-2xl flex items-center justify-center">
              <Heart className="w-6 h-6 text-pink-500" />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Mummy's Number</label>
              <Input 
                value={motherPhone} 
                onChange={(e) => setMotherPhone(formatPhone(e.target.value))} 
                className="h-10 text-lg font-bold border-none bg-transparent p-0 px-1 focus-visible:ring-0" 
                placeholder="+91 0000000000"
                type="tel"           
                inputMode="tel"      
              />
            </div>
          </div>

          {/* PAPA CONTACT */}
          <div className="bg-secondary/30 p-4 rounded-3xl border border-border/50 flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
              <User className="w-6 h-6 text-blue-500" />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Papa's Number</label>
              <Input 
                value={fatherPhone} 
                onChange={(e) => setFatherPhone(formatPhone(e.target.value))} 
                className="h-10 text-lg font-bold border-none bg-transparent p-0 px-1 focus-visible:ring-0" 
                placeholder="+91 0000000000"
                type="tel"           
                inputMode="tel"      
              />
            </div>
          </div>

          {/* FRIEND CONTACT */}
          <div className="bg-secondary/30 p-4 rounded-3xl border border-border/50 flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center">
              <Users className="w-6 h-6 text-green-500" />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Friend's Number</label>
              <Input 
                value={friendPhone} 
                onChange={(e) => setFriendPhone(formatPhone(e.target.value))} 
                className="h-10 text-lg font-bold border-none bg-transparent p-0 px-1 focus-visible:ring-0" 
                placeholder="+91 0000000000"
                type="tel"           
                inputMode="tel"      
              />
            </div>
          </div>
        </div>

        {/* 🌟 NAYA: DISABILITY SELECTOR SECTION */}
        <div className="pt-2 space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-px bg-border/50 flex-1"></div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Select Special Need (If Any)</h3>
            <div className="h-px bg-border/50 flex-1"></div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {disabilityOptions.map((opt) => {
              const isSelected = disability === opt.id;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  onClick={() => setDisability(opt.id)}
                  className={`flex flex-col items-center justify-center p-4 rounded-3xl border-2 transition-all duration-200 ${
                    isSelected 
                      ? "border-primary bg-primary/5 shadow-md scale-[1.02]" 
                      : "border-border/50 bg-secondary/30 hover:bg-secondary/50"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-2 ${isSelected ? opt.bg : 'bg-foreground/5'}`}>
                    <Icon className={`w-5 h-5 ${isSelected ? opt.color : 'text-muted-foreground'}`} />
                  </div>
                  <span className={`text-[11px] font-bold text-center leading-tight ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {opt.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <Button 
          onClick={handleSave} 
          disabled={loading}
          className="w-full h-16 rounded-[2rem] bg-primary text-white text-lg font-bold glow-primary mt-8 flex items-center justify-center space-x-2"
        >
          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
            <>
              <span>Save & Continue</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}