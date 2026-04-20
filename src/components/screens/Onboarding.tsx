
"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { ArrowRight, ShieldAlert, MapPin, SignalLow, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingProps {
  onComplete: () => void;
}

const slides = [
  {
    title: "Tap or speak to send SOS",
    description: "Instant emergency activation at your fingertips.",
    image: PlaceHolderImages.find(img => img.id === "onboarding-1")?.imageUrl || "https://picsum.photos/seed/safehelp1/600/400",
    icon: ShieldAlert,
    color: "bg-primary",
    hint: "safety assistance"
  },
  {
    title: "Share live location with family",
    description: "Keep your loved ones updated in real-time.",
    image: PlaceHolderImages.find(img => img.id === "onboarding-2")?.imageUrl || "https://picsum.photos/seed/safehelp2/600/400",
    icon: MapPin,
    color: "bg-blue-500",
    hint: "family connection"
  },
  {
    title: "Works even without internet",
    description: "Safety that doesn't depend on network coverage.",
    image: PlaceHolderImages.find(img => img.id === "onboarding-3")?.imageUrl || "https://picsum.photos/seed/safehelp3/600/400",
    icon: SignalLow,
    color: "bg-green-500",
    hint: "emergency signal"
  }
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const next = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  const SlideIcon = slides[currentSlide].icon;

  return (
    <div className="flex flex-col min-h-screen p-8 justify-between bg-background">
      {/* Skip Button */}
      <div className="flex justify-end pt-2">
        <Button 
          variant="ghost" 
          onClick={onComplete}
          className="text-muted-foreground hover:text-foreground font-bold flex items-center space-x-1 rounded-full px-4 h-10"
        >
          <span>Skip</span>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex flex-col items-center text-center space-y-10 py-6 flex-1 justify-center">
        {/* Visual Container */}
        <div className="relative w-full max-w-sm aspect-[4/3] rounded-[3rem] overflow-hidden shadow-2xl bg-secondary group">
          <Image 
            src={slides[currentSlide].image} 
            alt={slides[currentSlide].title} 
            fill 
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            data-ai-hint={slides[currentSlide].hint}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
          
          {/* Floating Icon */}
          <div className={cn(
            "absolute bottom-6 right-6 w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-xl animate-bounce",
            slides[currentSlide].color
          )}>
            <SlideIcon className="w-8 h-8" />
          </div>
        </div>

        {/* Text Content */}
        <div className="space-y-4 max-w-xs animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-3xl font-headline font-bold text-foreground leading-tight tracking-tight">
            {slides[currentSlide].title}
          </h2>
          <p className="text-muted-foreground text-xl leading-relaxed font-medium">
            {slides[currentSlide].description}
          </p>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="flex flex-col space-y-10 pb-8">
        {/* Indicator Dots */}
        <div className="flex justify-center space-x-3">
          {slides.map((_, i) => (
            <div 
              key={i} 
              className={cn(
                "h-2.5 rounded-full transition-all duration-500",
                i === currentSlide ? 'w-10 bg-primary shadow-[0_0_10px_rgba(0,0,0,0.1)]' : 'w-2.5 bg-muted'
              )} 
            />
          ))}
        </div>

        {/* Action Button */}
        <Button 
          onClick={next} 
          size="lg" 
          className="w-full h-20 text-2xl rounded-[2rem] glow-primary font-bold shadow-xl active:scale-95 transition-all"
        >
          {currentSlide === slides.length - 1 ? "Start Protecting" : "Next ➡️"}
          {currentSlide < slides.length - 1 && <ArrowRight className="ml-3 w-8 h-8" />}
        </Button>
      </div>
    </div>
  );
}
