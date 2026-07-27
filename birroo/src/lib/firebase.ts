import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, signOut, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { toast } from 'sonner';

// Configurazione per il progetto Firebase di produzione (birroo-production-283c2)
const firebaseConfig = {
  apiKey: "AIzaSyDWTRTFWgp4VheW12U8qrMg8P6VfjGanTQ",
  authDomain: "birroo-production-283c2.firebaseapp.com",
  projectId: "birroo-production-283c2",
  storageBucket: "birroo-production-283c2.firebasestorage.app",
  messagingSenderId: "284112797222",
  appId: "1:284112797222:web:357a6c92e594935cc7b0e7",
  measurementId: "G-B84ML9TZL1"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Analytics Configuration (Safely initialized to prevent adblocker crashes)
export let analytics: any = null;

export const initAnalytics = async () => {
  if (analytics) return; // Already initialized
  try {
    const supported = await isSupported();
    if (supported) {
      analytics = getAnalytics(app);
      console.log("Firebase Analytics Ready - Tracciamento visitatori attivo");
      
      // Initialize Microsoft Clarity
      if (typeof window !== 'undefined') {
        (function(c: any,l: any,a: any,r: any,i: any,t?: any,y?: any){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "xenk8xbfgd");
      }
    }
  } catch (err) {
    console.warn("Analytics non supportato o bloccato nel browser corrente.");
  }
};

export const loginWithGoogle = async () => {
  try {
    // Try popup first (better for desktop/non-iframe)
    await signInWithPopup(auth, googleProvider);
  } catch (error: any) {
    console.error("Login Error:", error);
    
    if (error.code === 'auth/unauthorized-domain') {
       toast.error("Dominio non autorizzato", {
          description: "Aggiungi questo dominio nelle impostazioni Firebase (Authentication > Settings > Authorized Domains).",
          duration: 10000
       });
    } else if (error.code === 'auth/popup-blocked') {
       toast.error("Popup bloccato", {
          description: "Sblocca i popup nelle impostazioni del browser per accedere."
       });
    } else if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
       // Utente ha chiuso il popup o il browser ha ricaricato interrompendo il popup (tipico su mobile).
       console.warn("Popup chiuso dall'utente o interrotto su mobile.");
    } else {
       toast.error("Errore di accesso", {
          description: "Si è verificato un errore durante il login. Riprova. " + (error.message || "")
       });
    }
  }
};
export const logout = () => signOut(auth);

// Handle Firestore Errors properly based on rules
export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: any;
}

export const handleFirestoreError = (error: any, operationType: any, path: string | null = null): void => {
  console.error("Firestore Error:", error);
  if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
     const authInfo = auth.currentUser ? {
        userId: auth.currentUser.uid,
        email: auth.currentUser.email,
        emailVerified: auth.currentUser.emailVerified,
        isAnonymous: auth.currentUser.isAnonymous,
        providerInfo: auth.currentUser.providerData
     } : null;

     const errorInfo: FirestoreErrorInfo = {
         error: error.message,
         operationType,
         path,
         authInfo
     };
     throw new Error(JSON.stringify(errorInfo));
  }
  throw error;
};

export const registerWithEmail = async (email: string, pass: string) => {
  return await createUserWithEmailAndPassword(auth, email, pass);
};

export const loginWithEmail = async (email: string, pass: string) => {
  return await signInWithEmailAndPassword(auth, email, pass);
};

export const resetPassword = async (email: string) => {
  return await sendPasswordResetEmail(auth, email);
};
