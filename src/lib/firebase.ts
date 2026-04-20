// lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";

// Yahan hum .env.local se direct data le rahe hain
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, // Ensure this maps to "safehelp-2026" in .env.local
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Singleton Pattern: Check if already initialized to prevent Turbopack errors
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Long Polling wala Network Fix (jo aapne kaha tha)
const db = initializeFirestore(app, { 
  experimentalForceLongPolling: true, 
});

// App aur database dono export kar rahe hain taaki baaki files me use kar sakein
export { app, db };