
'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { initializeFirestore, Firestore, getFirestore, terminate } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig } from './config';

export type FirebaseServices = {
  app: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
};

let cachedServices: FirebaseServices | null = null;

/**
 * Initializes Firebase services with robust settings for cloud development.
 * Uses experimentalForceLongPolling to prevent gRPC connectivity issues.
 */
export function initializeFirebase(): FirebaseServices {
  if (cachedServices) return cachedServices;

  const config = firebaseConfig;
  
  const hasRequiredConfig = !!(
    config.apiKey && 
    config.apiKey.length > 10 &&
    config.projectId &&
    config.authDomain
  );

  if (!hasRequiredConfig) {
    return { app: null, firestore: null, auth: null };
  }

  try {
    const app = getApps().length > 0 ? getApp() : initializeApp(config);
    
    // 🔥 Robust Firestore initialization
    // We try to initialize with settings first. If it's already initialized, we fetch the existing instance.
    let firestore: Firestore;
    try {
      firestore = initializeFirestore(app, {
        experimentalForceLongPolling: true,
      });
    } catch (e) {
      // If initialization fails because it's already active, get the default instance
      firestore = getFirestore(app);
    }
    
    const auth = getAuth(app);

    cachedServices = { app, firestore, auth };
    return cachedServices;
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    return { app: null, firestore: null, auth: null };
  }
}

export * from './provider';
export * from './client-provider';
export * from './auth/use-user';
export * from './firestore/use-doc';
export * from './firestore/use-collection';
