import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCbYasoah0sZbOnMa7kE4dSMyAId7i0oM0",
  authDomain: "safehelp-2026.firebaseapp.com",
  projectId: "safehelp-2026",
  storageBucket: "safehelp-2026.firebasestorage.app",
  messagingSenderId: "629905965135",
  appId: "1:629905965135:web:3e9cac98d33baf4ca7aa3a"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);