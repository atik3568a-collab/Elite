import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import MainApp from './pages/MainApp';
import { getFirebaseDb, initFirebase } from './services/firebase';
import { ref, onValue, off } from 'firebase/database';
import IntroScreen from './components/IntroScreen';
import ErrorBoundary from './components/ErrorBoundary';

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  wallet_balance: number;
  bonus_balance: number;
  winning_balance: number;
  uid?: string;
  ign?: string;
  referral_code?: string;
  referral_count?: number;
  header_bg_url?: string;
  profile_photo_url?: string;
  is_verified?: number;
  matches_played?: number;
  total_kills?: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [firebaseInitialized, setFirebaseInitialized] = useState(false);

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/auth/me', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Initialize Firebase from DB config
  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/settings/firebase');
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.indexOf("application/json") !== -1) {
            const config = await res.json();
            if (config) {
              await initFirebase(config);
            }
          } else {
            console.warn("Firebase: Received non-JSON response for settings", await res.text());
          }
        }
      } catch (e) {
        console.error("Firebase: Initialization error in App.tsx", e);
      } finally {
        setFirebaseInitialized(true);
      }
    };
    init();
  }, []);

  useEffect(() => {
    refreshUser();
  }, []);

  // Real-time listener for user profile
  useEffect(() => {
    if (!user?.uid || !firebaseInitialized) return;

    const db = getFirebaseDb();
    if (!db) return;

    const userRef = ref(db, `users/${user.uid}`);
    const unsubscribe = onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setUser(prev => {
          if (!prev) return prev;
          // Only update if data actually changed to avoid infinite loops or unnecessary re-renders
          if (prev.name === data.name && 
              prev.profile_photo_url === data.profile_photo_url && 
              prev.header_bg_url === data.header_bg_url &&
              prev.ign === data.ign) {
            return prev;
          }
          return { ...prev, ...data };
        });
      }
    });

    return () => {
      off(userRef);
    };
  }, [user?.uid]);

  const login = (token: string, userData: User) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default function App() {
  const [showIntro, setShowIntro] = useState(true);

  return (
    <ErrorBoundary>
      {showIntro && <IntroScreen onComplete={() => setShowIntro(false)} />}
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ErrorBoundary>
  );
}
