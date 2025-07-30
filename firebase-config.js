import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "Tvoje API key",
  authDomain: "Tvoje authDomain",
  projectId: "Tvoje projectId",
  storageBucket: "Tvoje storageBucket",
  messagingSenderId: "Tvoje messagingSenderId",
  appId: "Tvoje appId",
  measurementId: "Tvoje measurementId"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
