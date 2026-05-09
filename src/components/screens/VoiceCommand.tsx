"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { AppScreen } from "../SafeHelpApp";
import { 
  ArrowLeft, 
  Mic, 
  MicOff, 
  AlertCircle, 
  CheckCircle2, 
  ShieldAlert,
  Loader2,
  MessageSquare
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface VoiceCommandProps {
  navigateTo: (screen: AppScreen) => void;
  onSOSTriggered: () => void;
  t: any;
}

// 🔥 YAHAN MAINEY AAPKE SAARE NAYE SENTENCES ADD KAR DIYE HAIN (Bina dot ke taaki voice perfect catch kare)
const EMERGENCY_KEYWORDS = [
  "help", 
  "help me", 
  "save me", 
  "madad", 
  "bachao", 
  "emergency", 
  "police", 
  "accident",
  // Campus & Student Emergency Sentences:
  "i need medical help",
  "i am unable to move",
  "i am lost and need assistance",
  "i am in an unsafe situation",
  "i need help reaching my classroom",
  "i need hostel or campus support",
  "i cannot speak right now",
  "please check my location",
  "i need wheelchair assistance",
  "i need help during an exam or campus event"
];

export default function VoiceCommand({ navigateTo, onSOSTriggered, t }: VoiceCommandProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [manualText, setManualText] = useState("");
  const [status, setStatus] = useState<"idle" | "listening" | "emergency" | "normal" | "no-emergency">("idle");
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const { toast } = useToast();

  const processText = (text: string, isManual: boolean = false) => {
    const lowerTranscript = text.toLowerCase();
    const hasEmergency = EMERGENCY_KEYWORDS.some(k => lowerTranscript.includes(k));
    
    if (hasEmergency) {
      setStatus("emergency");
      triggerSOS();
    } else if (text.trim().length > 0) {
      setStatus("no-emergency");
      if (isManual) {
        toast({
          title: "Status Check",
          description: t.noEmergency,
        });
      }
      // Reset status after delay
      setTimeout(() => {
        if (status !== "emergency") {
          setStatus(isListeningRef.current ? "listening" : "idle");
        }
      }, 3000);
    }
  };

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      isListeningRef.current = true;
      setStatus("listening");
      setError(null);
    };

    recognition.onend = () => {
      // If we are supposed to be listening, restart it
      if (isListeningRef.current && status !== "emergency") {
        try {
          recognition.start();
        } catch (e) {
          // Ignore errors on restart
        }
      } else {
        setIsListening(false);
        isListeningRef.current = false;
        if (status !== "emergency") {
          setStatus("idle");
        }
      }
    };

    recognition.onerror = (event: any) => {
      const err = event.error;
      if (err === 'aborted' || err === 'no-speech' || err === 'audio-capture') {
        return;
      }
      
      console.warn("Speech Recognition Info:", err);
      if (err === 'not-allowed') {
        setError("Microphone access denied.");
        setIsListening(false);
        isListeningRef.current = false;
      }
    };

    recognition.onresult = (event: any) => {
      let current = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        current += event.results[i][0].transcript;
      }
      setTranscript(current);
      processText(current);
    };

    recognitionRef.current = recognition;
    
    return () => {
      isListeningRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const triggerSOS = () => {
    isListeningRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([500, 200, 500, 200, 500]);
    }

    toast({ 
      variant: "destructive", 
      title: t.emergencyDetected,
      description: "Activating SOS protocols immediately."
    });
    
    onSOSTriggered();
  };

  const toggleListening = () => {
    if (isListening) {
      isListeningRef.current = false;
      setIsListening(false);
      recognitionRef.current?.stop();
    } else {
      setError(null);
      setTranscript("");
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.error("Start failed:", e);
      }
    }
  };

  const handleManualCheck = () => {
    if (!manualText.trim()) return;
    processText(manualText, true);
    setManualText("");
  };

  return (
    <div className="flex flex-col min-h-screen p-6 bg-background">
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-8 shrink-0">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigateTo("home")} 
            className="rounded-full bg-secondary w-12 h-12"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-3xl font-headline font-bold">Safe Command</h1>
        </div>
        {isListening && (
          <div className="flex items-center space-x-2 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{t.voiceMonitor}</span>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center space-y-8 w-full max-w-sm mx-auto overflow-y-auto pb-6">
        {/* Status Indicator (Top) */}
        <div className="w-full flex flex-col items-center space-y-6">
          <button 
            onClick={toggleListening} 
            className="relative group transition-transform active:scale-90"
          >
            {isListening && (
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping scale-150 opacity-40"></div>
            )}
            <div className={cn(
              "w-48 h-48 rounded-full flex items-center justify-center transition-all shadow-2xl relative z-10 border-8",
              isListening ? "bg-primary glow-primary border-white/20" : "bg-secondary hover:bg-secondary/80 border-transparent"
            )}>
              {isListening ? (
                <Mic className="w-16 h-16 text-white animate-pulse" />
              ) : (
                <MicOff className="w-16 h-16 text-muted-foreground" />
              )}
            </div>
          </button>

          <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">
            {isListening ? t.monitoring : t.tapMic}
          </p>

          <div className={cn(
            "text-xl font-bold transition-all duration-300 flex items-center justify-center space-x-2 bg-card px-8 py-4 rounded-[2rem] shadow-sm border",
            status === "idle" && "text-muted-foreground border-border",
            status === "listening" && "text-primary animate-pulse border-primary/20",
            status === "emergency" && "text-destructive scale-105 border-destructive/50",
            status === "no-emergency" && "text-green-500 border-green-500/20"
          )}>
            {status === "idle" && <span>{t.voiceSosIdle}</span>}
            {status === "listening" && (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{t.monitoring}</span>
              </>
            )}
            {status === "emergency" && (
              <>
                <ShieldAlert className="w-6 h-6 animate-bounce" />
                <span>{t.emergencyDetected}</span>
              </>
            )}
            {status === "no-emergency" && (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>{t.noEmergency}</span>
              </>
            )}
          </div>
        </div>

        {/* Live Transcript (Middle) */}
        <div className={cn(
          "w-full rounded-[2rem] p-6 border-2 border-dashed flex items-center justify-center bg-secondary/10 transition-colors min-h-[120px]",
          status === "emergency" ? "border-destructive bg-destructive/5" : "border-primary/20"
        )}>
          {error ? (
            <p className="text-destructive font-bold text-center text-sm">{error}</p>
          ) : (
            <p className="text-xl font-headline italic text-center text-foreground/80 leading-relaxed">
              "{transcript || "Voice transcript will appear here..."}"
            </p>
          )}
        </div>

        {/* Manual Input (Bottom) */}
        <div className="w-full space-y-4 bg-secondary/30 p-6 rounded-[2.5rem] border border-border/50">
          <div className="flex items-center space-x-3 mb-2 px-1">
            <MessageSquare className="w-5 h-5 text-primary" />
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t.testKeywords}</p>
          </div>
          <div className="flex space-x-2">
            <Input 
              placeholder={t.typeMessage} 
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualCheck()}
              className="h-14 rounded-2xl bg-background border-none shadow-inner font-medium text-base"
            />
            <Button 
              onClick={handleManualCheck}
              className="h-14 rounded-2xl glow-primary font-bold px-6 shrink-0"
            >
              {t.check}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Footer Accessibility Note */}
      <div className="text-center pt-4 shrink-0">
        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em]">
          End-to-End Secure Safety
        </p>
      </div>
    </div>
  );
}