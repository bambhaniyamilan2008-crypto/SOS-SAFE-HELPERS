
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Accessibility, 
  Eye, 
  Ear, 
  Mic, 
  Layers, 
  MoreHorizontal, 
  Droplet, 
  ChevronRight,
  ShieldCheck,
  ArrowRight,
  Loader2
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useUser, useFirestore } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";

interface MedicalSetupProps {
  onComplete: (data: { disabilityType: string; bloodGroup: string }) => void;
  onSkip: () => void;
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

export default function MedicalSetup({ onComplete, onSkip }: MedicalSetupProps) {
  const { user } = useUser();
  const db = useFirestore();
  const [selectedDisability, setSelectedDisability] = useState("");
  const [selectedBloodGroup, setSelectedBloodGroup] = useState("");
  const [isDisabilitySheetOpen, setIsDisabilitySheetOpen] = useState(false);
  const [isBloodSheetOpen, setIsBloodSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user || !db) return;
    setSaving(true);
    try {
      const data = {
        disabilityType: selectedDisability,
        bloodGroup: selectedBloodGroup
      };
      const ref = doc(db, "users", user.uid);
      await setDoc(ref, data, { merge: true });
      onComplete(data);
    } catch (error) {
      console.error("Failed to save medical data:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen p-8 bg-background">
      <div className="flex-1 space-y-12 flex flex-col justify-center py-8">
        <div className="space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-6">
            <ShieldCheck className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl font-headline font-bold leading-tight">
            Medical <span className="text-primary">Profile</span>
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Sharing this info helps first responders provide the right care quickly.
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-bold uppercase tracking-widest text-primary ml-1">Disability Type</label>
            <Sheet open={isDisabilitySheetOpen} onOpenChange={setIsDisabilitySheetOpen}>
              <SheetTrigger asChild>
                <button className="w-full h-18 bg-secondary/50 border border-border/50 rounded-2xl px-6 flex items-center justify-between group active:scale-[0.98] transition-all">
                  <div className="flex items-center space-x-4">
                    <Accessibility className="w-6 h-6 text-accent" />
                    <span className={cn(
                      "text-xl font-bold",
                      selectedDisability ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {selectedDisability || "Select Type"}
                    </span>
                  </div>
                  <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="bg-card border-t-primary/20 rounded-t-[2.5rem] p-8 max-h-[85vh] overflow-y-auto">
                <SheetHeader className="mb-8">
                  <SheetTitle className="text-2xl font-headline text-left flex items-center">
                    <Accessibility className="mr-3 text-primary" /> Disability Type
                  </SheetTitle>
                  <SheetDescription className="text-left text-lg">
                    Which best describes your condition?
                  </SheetDescription>
                </SheetHeader>
                <div className="grid gap-3">
                  {disabilityOptions.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setSelectedDisability(opt.label);
                        setIsDisabilitySheetOpen(false);
                      }}
                      className={cn(
                        "w-full p-5 rounded-2xl flex items-center space-x-4 transition-all text-left",
                        selectedDisability === opt.label 
                          ? "bg-primary text-white scale-[1.02] shadow-lg" 
                          : "bg-secondary/80 hover:bg-secondary text-foreground"
                      )}
                    >
                      <opt.icon className={cn("w-7 h-7", selectedDisability === opt.label ? "text-white" : "text-accent")} />
                      <span className="text-xl font-bold">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold uppercase tracking-widest text-primary ml-1">Blood Group</label>
            <Sheet open={isBloodSheetOpen} onOpenChange={setIsBloodSheetOpen}>
              <SheetTrigger asChild>
                <button className="w-full h-18 bg-secondary/50 border border-border/50 rounded-2xl px-6 flex items-center justify-between group active:scale-[0.98] transition-all">
                  <div className="flex items-center space-x-4">
                    <Droplet className="w-6 h-6 text-accent" />
                    <span className={cn(
                      "text-xl font-bold",
                      selectedBloodGroup ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {selectedBloodGroup || "Select Group"}
                    </span>
                  </div>
                  <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="bg-card border-t-primary/20 rounded-t-[2.5rem] p-8">
                <SheetHeader className="mb-8">
                  <SheetTitle className="text-2xl font-headline text-left flex items-center">
                    <Droplet className="mr-3 text-primary" /> Blood Group
                  </SheetTitle>
                  <SheetDescription className="text-left text-lg">
                    Select your blood type
                  </SheetDescription>
                </SheetHeader>
                <div className="grid grid-cols-2 gap-4">
                  {bloodGroups.map((group) => (
                    <button
                      key={group}
                      onClick={() => {
                        setSelectedBloodGroup(group);
                        setIsBloodSheetOpen(false);
                      }}
                      className={cn(
                        "h-20 rounded-2xl flex items-center justify-center text-2xl font-bold transition-all",
                        selectedBloodGroup === group 
                          ? "bg-primary text-white shadow-lg scale-105" 
                          : "bg-secondary/80 text-foreground"
                      )}
                    >
                      {group}
                    </button>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="flex items-center justify-center space-x-2 text-muted-foreground pb-4">
          <Mic className="w-5 h-5 animate-pulse text-accent" />
          <p className="text-sm font-medium">SafeHelp Voice Ready</p>
        </div>
      </div>

      <div className="space-y-4 pt-4 pb-8">
        <Button 
          onClick={handleSave} 
          disabled={!selectedDisability || !selectedBloodGroup || saving}
          size="lg" 
          className="w-full h-18 text-xl rounded-2xl glow-primary font-bold transition-all"
        >
          {saving ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <>Save & Continue <ArrowRight className="ml-2 w-6 h-6" /></>
          )}
        </Button>
        <Button 
          variant="ghost" 
          onClick={onSkip}
          disabled={saving}
          className="w-full text-muted-foreground text-lg h-12"
        >
          I'll do this later
        </Button>
      </div>
    </div>
  );
}
