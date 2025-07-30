import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Tvoje Firebase konfigurace
const firebaseConfig = {
  apiKey: "AIzaSyCweM-p_XTzZlgMX89xDW2umG0pxfo3WRQ",
  authDomain: "tinky-rozlucka.firebaseapp.com",
  projectId: "tinky-rozlucka",
  storageBucket: "tinky-rozlucka.firebasestorage.app",
  messagingSenderId: "756403512507",
  appId: "1:756403512507:web:53c0af432b78e925b1b59e",
  measurementId: "G-XNQRVV2KW5"
};

// Inicializace Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
