// React Native Firebase for auth and storage (native performance)
import auth from '@react-native-firebase/auth';
import storage from '@react-native-firebase/storage';

// Firebase JS SDK for Firestore (avoids gRPC native dependency issues on iOS)
import { initializeApp, getApps } from 'firebase/app';
import { initializeFirestore, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit, serverTimestamp, increment, onSnapshot } from 'firebase/firestore';

// Firebase config from environment variables
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase JS SDK app (for Firestore)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firestore with long-polling to avoid WebSocket issues
let firestore;
try {
  firestore = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    experimentalAutoDetectLongPolling: false,
  });
} catch (e) {
  // Firestore already initialized (hot reload)
  const { getFirestore } = require('firebase/firestore');
  firestore = getFirestore(app);
}

console.log('🔥 Firebase initialized: native auth/storage + JS SDK Firestore');

// Export native modules
export { auth, storage };

// Export Firestore instance and helpers
export {
  firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  onSnapshot
};
