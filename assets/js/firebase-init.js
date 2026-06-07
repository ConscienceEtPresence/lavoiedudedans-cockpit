/* ============================================================
   Cockpit · Initialisation Firebase + Auth
   ============================================================ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBYlX1AcOP4Yg5rCy9T5tIcrV0WOTT3E24",
  authDomain: "la-voie-du-dedans.firebaseapp.com",
  projectId: "la-voie-du-dedans",
  storageBucket: "la-voie-du-dedans.firebasestorage.app",
  messagingSenderId: "531110328878",
  appId: "1:531110328878:web:322ac57d9504e750b83dbf"
};

export const app  = initializeApp(firebaseConfig);
export const db   = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

/* — Liste blanche des administrateurs (par mail) —
   La vraie sécurité passera aussi par les Firestore Rules.
   Pour l'instant : seuls ces mails peuvent accéder au cockpit.
*/
export const ALLOWED_EMAILS = [
  'ennealyon@gmail.com'
];
