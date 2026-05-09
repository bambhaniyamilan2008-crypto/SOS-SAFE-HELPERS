// lib/firebase.ts
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  Firestore 
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 🔥 Yahan Typescript ko bata diya ki ye variables kis type ke hain
let app: FirebaseApp;
let db: Firestore;

if (!getApps().length) {
  // Fresh Load (Naya Cache Engine)
  app = initializeApp(firebaseConfig);
  db = initializeFirestore(app, { 
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
  console.log("🔥 Firebase & Offline Cache Started!");
} else {
  // Hot-Reload (Purana Database uthao)
  app = getApp();
  db = getFirestore(app);
  console.log("⚡ Firebase Hot-Reloaded Safely!");
}

export { app, db };