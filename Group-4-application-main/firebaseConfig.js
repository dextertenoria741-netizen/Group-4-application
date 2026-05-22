

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
const firebaseConfig = {
  apiKey: "AIzaSyAiXP0GQ4FTs-RtI86EEl98Sm3Tm2eABHo",
  authDomain: "class-scheduling-system-f83ee.firebaseapp.com",
  projectId: "class-scheduling-system-f83ee",
  storageBucket: "class-scheduling-system-f83ee.firebasestorage.app",
  messagingSenderId: "122249286420",
  appId: "1:122249286420:web:7dd08604f1ad4506a76801",
  measurementId: "G-QKQC3ZWFMR",
};
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);



