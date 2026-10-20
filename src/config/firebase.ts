import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
// @ts-ignore - getReactNativePersistence is missing from default type definitions but available in React Native
import { initializeAuth, getReactNativePersistence, getAuth, Auth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyB3qhG1w4gNmlkDf3kllx5530ZHvDDs0b4",
  authDomain: "hoaxbuster-bb2276.firebaseapp.com",
  databaseURL: "https://hoaxbuster-bb2276-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "hoaxbuster-bb2276",
  storageBucket: "hoaxbuster-bb2276.firebasestorage.app",
  messagingSenderId: "743556191762",
  appId: "1:743556191762:web:887a6cfb37e5e977606acb"
};

let app: FirebaseApp;
let auth: Auth;

if (getApps().length === 0) {
  // Initialize Firebase and Auth
  app = initializeApp(firebaseConfig);
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} else {
  // Use existing instances (prevents error on Expo Fast Refresh)
  app = getApp();
  auth = getAuth(app);
}

export { app, auth };

// Initialize Realtime Database
export const db = getDatabase(app);

// Initialize Cloud Storage
export const storage = getStorage(app);
