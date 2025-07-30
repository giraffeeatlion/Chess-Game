import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCAvomsT_UL6o1wpeTxkJi9DotdGhm6Thk",
  authDomain: "react-chess-game-a6655.firebaseapp.com",
  projectId: "react-chess-game-a6655",
  storageBucket: "react-chess-game-a6655.firebasestorage.app",
  messagingSenderId: "616306369744",
  appId: "1:616306369744:web:eecb3e9036f924cda72ad5"
};

const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore
const db = getFirestore(app);

// NEW: Initialize Firebase Authentication
const auth = getAuth(app);

// Export both services
export { db, auth };