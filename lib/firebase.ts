import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAWAU1httOrLUZEpvG4fkcvJing-e_T_68",
  authDomain: "russell-s-mobile-blade.firebaseapp.com",
  projectId: "russell-s-mobile-blade",
  storageBucket: "russell-s-mobile-blade.firebasestorage.app",
  messagingSenderId: "4535132226",
  appId: "1:4535132226:web:ad521f1b61c771ec674ddb",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
