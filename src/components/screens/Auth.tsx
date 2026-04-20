
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth, useFirestore } from "@/firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { Shield, Smartphone, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AuthProps {
  onAuthSuccess: () => void;
}

export default function Auth({ onAuthSuccess }: AuthProps) {
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    if (!auth || !db) {
      toast({
        variant: "destructive",
        title: "Configuration Error",
        description: "Firebase services are not initialized. Please refresh and try again.",
      });
      return;
    }
    
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      
      let userSnap;
      try {
        userSnap = await getDoc(userRef);
      } catch (err: any) {
        console.warn("Firestore fetch error during login:", err);
      }
      
      if (!userSnap || !userSnap.exists()) {
        const timestampFactor = Math.floor(Date.now() / 100000) % 1000;
        const nextNumber = 2001 + timestampFactor;

        // Default profile with Milan as primary contact as requested
        await setDoc(userRef, {
          name: user.displayName || "Safe User",
          phone: "+91 ",
          fatherName: "",
          motherName: "",
          disabilityType: "Physical Disability",
          bloodGroup: "O+",
          insuranceId: `SOS-HELPER-${nextNumber}`,
          profileImage: user.photoURL || "",
          contacts: [
            {
              id: "default-contact-milan",
              name: "Milan",
              phone: "+91 9586875178",
              relation: "Friend",
              isPrimary: true
            }
          ]
        }, { merge: true });

        // Initialize default settings
        const settingsRef = doc(db, "users", user.uid, "settings", "default");
        await setDoc(settingsRef, {
          voiceSos: true,
          shakeSos: false,
          largeText: false,
          darkMode: false,
          voiceGuidance: false,
          shareMedical: true,
          notifications: true,
          sosMessage: "🚨 EMERGENCY! I need help immediately. My live location is attached below. Please respond ASAP. 🚨"
        }, { merge: true });
      }
      
      toast({
        title: "Welcome back!",
        description: `Signed in as ${user.displayName}`,
      });
      onAuthSuccess();
    } catch (error: any) {
      console.error("Auth Error:", error);
      let errorMessage = error.message || "Could not sign in.";
      
      if (error.code === 'auth/popup-blocked') {
        errorMessage = "Sign-in popup was blocked by your browser. Please allow popups.";
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = "Google Sign-in is not enabled in Firebase project settings.";
      } else if (error.message?.includes('offline')) {
        errorMessage = "Network error. Please check your internet connection.";
      }

      toast({
        variant: "destructive",
        title: "Login Failed",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen p-8 justify-center space-y-10 bg-background">
      <div className="space-y-4 text-center">
        <div className="w-24 h-24 bg-primary/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 relative">
          < Shield className="w-12 h-12 text-primary" />
          <div className="absolute inset-0 bg-primary/5 rounded-[2.5rem] animate-pulse"></div>
        </div>
        <h1 className="text-4xl font-headline font-bold">SafeHelp</h1>
        <p className="text-xl text-muted-foreground">Secure access to your emergency profile</p>
      </div>

      <div className="space-y-4">
        <Button 
          onClick={handleGoogleSignIn} 
          disabled={loading}
          size="lg" 
          variant="outline"
          className="w-full h-20 text-xl rounded-[2rem] border-2 flex items-center justify-center space-x-4 shadow-sm hover:bg-secondary/20 transition-all active:scale-95"
        >
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          ) : (
            <img src="https://www.google.com/favicon.ico" className="w-6 h-6" alt="Google" />
          )}
          <span className="font-bold">{loading ? "Connecting..." : "Continue with Google"}</span>
        </Button>

        <Button 
          variant="secondary"
          disabled
          className="w-full h-20 text-xl rounded-[2rem] flex items-center justify-center space-x-4 opacity-50 cursor-not-allowed"
        >
          <Smartphone className="w-6 h-6" />
          <span className="font-bold">Phone Login (Soon)</span>
        </Button>
      </div>

      <div className="text-center pt-8">
        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em]">
          End-to-End Encrypted Safety
        </p>
      </div>
    </div>
  );
}
