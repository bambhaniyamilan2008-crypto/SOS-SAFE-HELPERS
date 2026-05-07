"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth, useFirestore } from "@/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { Shield, Mail, Lock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AuthProps {
  onAuthSuccess: () => void;
}

export default function Auth({ onAuthSuccess }: AuthProps) {
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true); // Login aur Signup ke beech switch karne ke liye
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db) return;

    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Missing Details",
        description: "Please enter both email and password.",
      });
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        // ================= LOGIN LOGIC =================
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: "Welcome back!", description: "Signed in successfully." });
        onAuthSuccess();
      } else {
        // ================= SIGNUP LOGIC =================
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const userRef = doc(db, "users", user.uid);
        
        const timestampFactor = Math.floor(Date.now() / 100000) % 1000;
        const nextNumber = 2001 + timestampFactor;

        // Default profile save karna (Milan as contact)
        await setDoc(userRef, {
          name: email.split('@')[0], // Email ke aage wala hissa naam ban jayega
          phone: "+91 ",
          fatherName: "",
          motherName: "",
          disabilityType: "Physical Disability",
          bloodGroup: "O+",
          insuranceId: `SOS-HELPER-${nextNumber}`,
          profileImage: "",
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

        // Default settings save karna
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

        toast({ title: "Account Created!", description: "Welcome to SafeHelp." });
        onAuthSuccess();
      }
    } catch (error: any) {
      console.error("Auth Error:", error);
      let errorMessage = error.message;
      if (error.code === 'auth/email-already-in-use') errorMessage = "This email is already registered.";
      if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') errorMessage = "Invalid email or password.";
      if (error.code === 'auth/weak-password') errorMessage = "Password should be at least 6 characters.";

      toast({
        variant: "destructive",
        title: isLogin ? "Login Failed" : "Signup Failed",
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
          <Shield className="w-12 h-12 text-primary" />
          <div className="absolute inset-0 bg-primary/5 rounded-[2.5rem] animate-pulse"></div>
        </div>
        <h1 className="text-4xl font-headline font-bold">SafeHelp</h1>
        <p className="text-xl text-muted-foreground">
          {isLogin ? "Secure access to your emergency profile" : "Create your emergency profile"}
        </p>
      </div>

      <form onSubmit={handleEmailAuth} className="space-y-4">
        {/* Email Input */}
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" />
          <input 
            type="email" 
            placeholder="Email Address" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-16 pl-14 pr-4 text-lg rounded-2xl border-2 bg-transparent outline-none focus:border-primary transition-colors"
            required
          />
        </div>

        {/* Password Input */}
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" />
          <input 
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-16 pl-14 pr-4 text-lg rounded-2xl border-2 bg-transparent outline-none focus:border-primary transition-colors"
            required
          />
        </div>

        {/* Submit Button */}
        <Button 
          type="submit"
          disabled={loading}
          size="lg" 
          className="w-full h-16 text-xl rounded-2xl font-bold mt-4 shadow-md transition-all active:scale-95"
        >
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            isLogin ? "Login to SafeHelp" : "Create Account"
          )}
        </Button>
      </form>

      {/* Toggle Login/Signup */}
      <div className="text-center pt-4">
        <button 
          onClick={() => setIsLogin(!isLogin)}
          className="text-primary font-bold text-lg hover:underline"
        >
          {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
        </button>
      </div>

      <div className="text-center pt-8">
        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em]">
          End-to-End Encrypted Safety
        </p>
      </div>
    </div>
  );
}