// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// FÜGE HIER DEINEN KOPIERTEN CODE VON DER FIREBASE CONSOLE EIN
// Es sieht ungefähr so aus (deine echten Daten nutzen!):
const firebaseConfig = {
  apiKey: "AIzaSyBB50aJ2QNQJwOCffunwkh5iHdXmnB_sSM",
  authDomain: "einkaufs-tracker.firebaseapp.com",
  projectId: "einkaufs-tracker",
  storageBucket: "einkaufs-tracker.firebasestorage.app",
  messagingSenderId: "1073615625714",
  appId: "1:1073615625714:web:7a2494d111b5a296cc1f6b",
  measurementId: "G-G1589Y8V7J"
};

// App initialisieren
const app = initializeApp(firebaseConfig);

// Datenbank exportieren, damit wir sie in App.jsx nutzen können
export const db = getFirestore(app);