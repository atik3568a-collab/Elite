import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';

const defaultFirebaseConfig = {
  apiKey: "AIzaSyBr0bf5OYNlYhv_nzgQDxoa_yyWcqmx8F4",
  authDomain: "elite-ff-tunament.firebaseapp.com",
  databaseURL: "https://elite-ff-tunament-default-rtdb.firebaseio.com",
  projectId: "elite-ff-tunament",
  storageBucket: "elite-ff-tunament.firebasestorage.app",
  messagingSenderId: "926806930190",
  appId: "1:926806930190:web:bb23d085f9dc1b502a9d5f",
  measurementId: "G-66B6695QL0"
};

let app: FirebaseApp | null = null;
let db: Database | null = null;
let initialized = false;

// Initialize with default config immediately
if (getApps().length === 0) {
  try {
    app = initializeApp(defaultFirebaseConfig);
    db = getDatabase(app);
    initialized = true;
    console.log("Firebase: Default configuration initialized");
  } catch (e) {
    console.error("Firebase: Default initialization failed", e);
  }
} else {
  app = getApps()[0];
  db = getDatabase(app);
  initialized = true;
}

export const initFirebase = async (config: any) => {
  if (!config) return { app, db };
  
  try {
    const currentConfig = (app as any)?.options;
    // Compare apiKey and databaseURL to avoid redundant re-initialization
    const isSame = currentConfig && 
                   currentConfig.apiKey === config.apiKey && 
                   currentConfig.databaseURL === config.databaseURL;

    if (!isSame) {
      // Use a unique name for custom apps to avoid conflicts
      const appName = 'custom-app-' + Date.now();
      app = initializeApp(config, appName);
      db = getDatabase(app);
      initialized = true;
      console.log("Firebase: Custom configuration initialized:", appName);
    }
  } catch (e) {
    console.error('Firebase: Custom initialization failed', e);
  }
  
  return { app, db };
};

export const getFirebaseDb = () => db;

export const isFirebaseConfigured = () => initialized && !!db;
