// lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
// 🔥 Naye Cache Engine ke imports add kiye
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

// Yahan hum .env.local se direct data le rahe hain
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Singleton Pattern: Check if already initialized to prevent Turbopack errors
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// 🔥 MAIN FIX: Long polling hata diya aur Local Memory (Persistence) chalu kar di!
// Ab app internet ka wait nahi karegi, memory se 0.1s me data dikhayegi.
const db = initializeFirestore(app, { 
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

// App aur database dono export kar rahe hain taaki baaki files me use kar sakein
export { app, db };