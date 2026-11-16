import { initializeApp } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc,
  runTransaction, onSnapshot, collection, query, orderBy, limit, serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js";
import { firebaseConfig } from "./config.js";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export {
  doc, getDoc, setDoc, updateDoc, deleteDoc, runTransaction, onSnapshot,
  collection, query, orderBy, limit, serverTimestamp
};

// Devuelve el usuario anónimo actual (lo crea si no existe).
export function asegurarSesion() {
  return new Promise((resolve, reject) => {
    const off = onAuthStateChanged(auth, async (u) => {
      off();
      try { resolve(u ?? (await signInAnonymously(auth)).user); }
      catch (e) { reject(e); }
    });
  });
}
