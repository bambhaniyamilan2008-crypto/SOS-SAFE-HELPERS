"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { AppScreen } from "../SafeHelpApp";
import { 
  ArrowLeft, User, Edit, Droplet, Accessibility, Shield, Check, X, 
  ChevronRight, Eye, Ear, Mic, Layers, MoreHorizontal,
  Save, Camera, Heart, Loader2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

interface ProfileProps {
  navigateTo: (screen: AppScreen) => void;
}

const disabilityOptions = [
  { id: "physical", label: "Physical Disability", icon: Accessibility },
  { id: "visual", label: "Visual Impairment", icon: Eye },
  { id: "hearing", label: "Hearing Impairment", icon: Ear },
  { id: "speech", label: "Speech Disability", icon: Mic },
  { id: "multiple", label: "Multiple Disabilities", icon: Layers },
  { id: "other", label: "Other", icon: MoreHorizontal },
];

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function Profile({ navigateTo }: ProfileProps) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDisabilitySheetOpen, setIsDisabilitySheetOpen] = useState(false);
  const [isBloodSheetOpen, setIsBloodSheetOpen] = useState(false);
  
  // 🔥 CACHE ENGINE STATE: Check karega ki phone ki memory mein data hai ya nahi
  const [hasCachedData, setHasCachedData] = useState(false);
  
  const userRef = useMemo(() => {
    if (!user || !db) return null;
    return doc(db, "users", user.uid);
  }, [user, db]);

  const { data: profile, loading } = useDoc(userRef);

  const [formData, setFormData] = useState({
    name: "",
    phone: "+91 ",
    fatherName: "",
    motherName: "",
    bloodGroup: "O+",
    disabilityType: "Physical Disability",
    insuranceId: "",
    profileImage: ""
  });

  // 🔥 FAST CACHE STEP 1: App khulte hi phone ki memory se data turant load karo
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cachedProfile = localStorage.getItem('safehelp_profile_cache');
      if (cachedProfile) {
        try {
          setFormData(JSON.parse(cachedProfile));
          setHasCachedData(true); // Data mil gaya, ab loading screen mat dikhana
        } catch (e) {
          console.error("Cache load error", e);
        }
      }
    }
  }, []);

  // 🔥 FAST CACHE STEP 2: Background mein Firebase se naya data laao aur memory update karo
  useEffect(() => {
    if (profile) {
      const freshData = {
        name: profile.name || "",
        phone: profile.phone || "+91 ",
        fatherName: profile.fatherName || "",
        motherName: profile.motherName || "",
        bloodGroup: profile.bloodGroup || "O+",
        disabilityType: profile.disabilityType || "Physical Disability",
        insuranceId: profile.insuranceId || "",
        profileImage: profile.profileImage || ""
      };
      
      // Agar user edit nahi kar raha hai, tabhi background wala naya data screen par daalo
      if (!isEditing) {
        setFormData(freshData);
      }
      
      // Data hamesha ke liye chupchaap memory mein save kar do
      if (typeof window !== 'undefined') {
        localStorage.setItem('safehelp_profile_cache', JSON.stringify(freshData));
      }
      setHasCachedData(true);
    }
  }, [profile, isEditing]);

  const handleSave = () => {
    if (!user || !db) return;
    const ref = doc(db, "users", user.uid);
    setIsEditing(false); // Optimistic UI: Turant edit mode band
    
    // Save karte waqt naye data ko turant memory (cache) mein daal do
    if (typeof window !== 'undefined') {
      localStorage.setItem('safehelp_profile_cache', JSON.stringify(formData));
    }

    setDoc(ref, formData, { merge: true })
      .then(() => {
        toast({ title: "Profile Updated" });
      })
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ 
          path: ref.path, 
          operation: 'update', 
          requestResourceData: formData 
        }));
      });
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        phone: profile.phone || "+91 ",
        fatherName: profile.fatherName || "",
        motherName: profile.motherName || "",
        bloodGroup: profile.bloodGroup || "O+",
        disabilityType: profile.disabilityType || "Physical Disability",
        insuranceId: profile.insuranceId || "",
        profileImage: profile.profileImage || ""
      });
    }
    setIsEditing(false);
  };

  const handlePhoneChange = (val: string) => {
    let raw = val;
    const prefix = "+91 ";
    if (!raw.startsWith(prefix)) {
      raw = prefix + raw.replace(/^\+91\s?/, "");
    }
    const body = raw.slice(prefix.length).replace(/\D/g, "").slice(0, 10);
    setFormData(prev => ({ ...prev, phone: prefix + body }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, profileImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // 🔥 CACHE ENGINE MAGIC: Agar cache mein data hai (!hasCachedData false hoga), toh Loading bypass kar dega
  if (loading && !hasCachedData) return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Syncing Profile...</p>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />

      <div className="flex items-center justify-between p-6 shrink-0 z-10 border-b border-border/10">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => navigateTo("home")} className="rounded-full bg-secondary w-12 h-12">
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-3xl font-headline font-bold">My Profile</h1>
        </div>
        
        {isEditing ? (
          <div className="flex space-x-2">
            <Button variant="ghost" size="icon" onClick={handleCancel} className="rounded-full bg-secondary text-destructive w-12 h-12">
              <X className="w-6 h-6" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSave} className="rounded-full bg-primary text-white w-12 h-12">
              <Check className="w-6 h-6" />
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} className="rounded-full bg-secondary w-12 h-12">
            <Edit className="w-6 h-6 text-accent" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-24">
        <div className="bg-secondary/30 rounded-[2.5rem] p-8 mb-8 border border-border/50 flex flex-col items-center mt-6">
          <div className="relative mb-6">
            <div 
              onClick={() => isEditing && fileInputRef.current?.click()}
              className={cn(
                "w-32 h-32 rounded-full border-4 p-2 transition-all overflow-hidden relative group",
                isEditing ? "border-primary cursor-pointer" : "border-primary/50"
              )}
            >
              <div className="w-full h-full rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                {formData.profileImage ? (
                  <img src={formData.profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-16 h-16 text-muted-foreground" />
                )}
              </div>
              {isEditing && (
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-8 h-8 text-white mb-1" />
                </div>
              )}
            </div>
          </div>
          
          <div className="text-center w-full">
            {isEditing ? (
              <div className="space-y-3">
                <Input 
                  placeholder="Your Name"
                  value={formData.name} 
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} 
                  className="text-center h-12 text-2xl font-headline font-bold bg-secondary/20 rounded-2xl" 
                />
                <Input 
                  placeholder="Your Number"
                  value={formData.phone} 
                  onChange={(e) => handlePhoneChange(e.target.value)} 
                  className="text-center h-12 text-muted-foreground bg-secondary/20 rounded-2xl font-bold" 
                />
              </div>
            ) : (
              <>
                <h2 className="text-3xl font-headline font-bold tracking-tight">{formData.name || user?.displayName || "Set Name"}</h2>
                <p className="text-lg text-muted-foreground mt-1 font-bold">{formData.phone || "+91 "}</p>
              </>
            )}
          </div>
        </div>

        <div className="space-y-6 mb-8">
          <div className="flex items-center space-x-2 px-2">
            <Heart className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-primary uppercase tracking-widest">Family Details</h3>
          </div>

          <div className="grid gap-4">
            <div className="bg-secondary/30 rounded-3xl p-6 border border-border/50">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Father's Name</label>
              {isEditing ? (
                <Input value={formData.fatherName} onChange={(e) => setFormData(prev => ({ ...prev, fatherName: e.target.value }))} className="h-10 p-0 bg-transparent border-none text-xl font-bold focus-visible:ring-0" />
              ) : (
                <p className="text-xl font-bold mt-1">{formData.fatherName || "Not provided"}</p>
              )}
            </div>
            <div className="bg-secondary/30 rounded-3xl p-6 border border-border/50">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Mother's Name</label>
              {isEditing ? (
                <Input value={formData.motherName} onChange={(e) => setFormData(prev => ({ ...prev, motherName: e.target.value }))} className="h-10 p-0 bg-transparent border-none text-xl font-bold focus-visible:ring-0" />
              ) : (
                <p className="text-xl font-bold mt-1">{formData.motherName || "Not provided"}</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center space-x-2 px-2">
            <Shield className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-primary uppercase tracking-widest">Medical Profile</h3>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-2">Disability Type</label>
            <Sheet open={isDisabilitySheetOpen} onOpenChange={setIsDisabilitySheetOpen}>
              <SheetTrigger asChild>
                <button disabled={!isEditing} className="w-full h-20 bg-secondary/50 border border-border/50 rounded-3xl px-6 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Accessibility className="w-6 h-6 text-accent" />
                    <span className="text-xl font-bold">{formData.disabilityType}</span>
                  </div>
                  {isEditing && <ChevronRight className="w-6 h-6 text-primary" />}
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="bg-card border-t-primary/20 rounded-t-[3rem] p-8">
                <SheetHeader className="mb-8">
                  <SheetTitle className="flex items-center"><Accessibility className="mr-3 text-primary" /> Disability Type</SheetTitle>
                </SheetHeader>
                <div className="grid gap-3">
                  {disabilityOptions.map((opt) => (
                    <button key={opt.id} onClick={() => { setFormData(p => ({ ...p, disabilityType: opt.label })); setIsDisabilitySheetOpen(false); }} className={cn("w-full p-5 rounded-3xl flex items-center space-x-4", formData.disabilityType === opt.label ? "bg-primary text-white" : "bg-secondary")}>
                      <opt.icon className="w-7 h-7" />
                      <span className="text-xl font-bold">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-2">Blood Group</label>
            <Sheet open={isBloodSheetOpen} onOpenChange={setIsBloodSheetOpen}>
              <SheetTrigger asChild>
                <button disabled={!isEditing} className="w-full h-20 bg-secondary/50 border border-border/50 rounded-3xl px-6 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Droplet className="w-6 h-6 text-accent" />
                    <span className="text-xl font-bold">{formData.bloodGroup}</span>
                  </div>
                  {isEditing && <ChevronRight className="w-6 h-6 text-primary" />}
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="bg-card border-t-primary/20 rounded-t-[3rem] p-8">
                <SheetHeader className="mb-8">
                  <SheetTitle className="flex items-center"><Droplet className="mr-3 text-primary" /> Blood Group</SheetTitle>
                </SheetHeader>
                <div className="grid grid-cols-2 gap-4">
                  {bloodGroups.map((group) => (
                    <button key={group} onClick={() => { setFormData(p => ({ ...p, bloodGroup: group })); setIsBloodSheetOpen(false); }} className={cn("h-20 rounded-3xl flex items-center justify-center text-2xl font-bold", formData.bloodGroup === group ? "bg-primary text-white" : "bg-secondary")}>
                      {group}
                    </button>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="bg-secondary/30 rounded-3xl p-6 border border-border/50">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Insurance ID</label>
            <p className="text-xl font-bold mt-1">{formData.insuranceId || "Generating..."}</p>
          </div>
        </div>

        {isEditing && (
          <div className="mt-12">
            <Button onClick={handleSave} size="lg" className="w-full h-20 text-xl rounded-[2rem] glow-primary font-bold flex items-center justify-center space-x-3">
              <Save className="w-6 h-6" />
              <span>Save Changes</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}