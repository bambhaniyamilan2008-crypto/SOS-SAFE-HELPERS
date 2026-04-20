
"use client";

import { useState, useEffect } from "react";
import SafeHelpApp from "@/components/SafeHelpApp";
import { AlertCircle } from "lucide-react";

export default function Page() {
  const [appState, setAppState] = useState<"splash" | "app">("splash");

  useEffect(() => {
    // Reduced splash time for faster app entry
    const timer = setTimeout(() => {
      setAppState("app");
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  if (appState === "splash") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-6">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-primary blur-3xl opacity-20 rounded-full animate-pulse"></div>
          <AlertCircle className="w-24 h-24 text-primary glow-primary relative z-10" />
        </div>
        <h1 className="text-4xl font-headline font-bold mb-2 tracking-tight">SafeHelp</h1>
        <p className="text-muted-foreground text-lg">Fast Safety Access</p>
      </div>
    );
  }

  return <SafeHelpApp />;
}
