import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import MainApp from './pages/MainApp';
import { getFirebaseDb, initFirebase } from './services/firebase';
import { ref, onValue, off, update, serverTimestamp } from 'firebase/database';
import IntroScreen from './components/IntroScreen';
import ErrorBoundary from './components/ErrorBoundary';

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
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
  firebaseInitialized: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [firebaseInitialized, setFirebaseInitialized] = useState(false);

  const refreshUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/auth/me', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setUser(prev => {
          if (!prev || prev.id !== data.id) return data;
          // Merge to keep any local state if needed, but usually data is fresh
          return { ...prev, ...data };
        });
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("refreshUser error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize Firebase from DB config
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const res = await fetch('/api/settings/firebase');
        if (res.ok && mounted) {
          const config = await res.json();
          if (config) {
            await initFirebase(config);
            setFirebaseInitialized(true);
          }
        }
      } catch (e) {
        console.error("Firebase: Initialization error in App.tsx", e);
      }
    };
    init();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Real-time listener for user profile
  useEffect(() => {
    if (!user?.email || !firebaseInitialized) return;

    const db = getFirebaseDb();
    if (!db) return;

    const sanitizedEmail = user.email.replace(/\./g, ',');
    const userRef = ref(db, `users_by_email/${sanitizedEmail}`);
    
    // Sync to Firebase once on login/refresh
    update(userRef, {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      wallet_balance: user.wallet_balance,
      bonus_balance: user.bonus_balance,
      winning_balance: user.winning_balance,
      role: user.role,
      uid: user.uid || '',
      ign: user.ign || '',
      is_verified: user.is_verified,
      last_seen: serverTimestamp()
    }).catch(e => console.error("Initial Firebase sync error:", e));

    const unsubscribe = onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setUser(prev => {
          if (!prev) return prev;
          // Only update if data actually changed to avoid infinite loops
          const hasChanged = 
              prev.name !== data.name || 
              prev.profile_photo_url !== data.profile_photo_url || 
              prev.header_bg_url !== data.header_bg_url ||
              prev.ign !== data.ign ||
              prev.wallet_balance !== data.wallet_balance ||
              prev.bonus_balance !== data.bonus_balance ||
              prev.winning_balance !== data.winning_balance ||
              prev.is_verified !== data.is_verified;

          if (!hasChanged) return prev;
          return { ...prev, ...data };
        });
      }
    });

    return () => {
      off(userRef);
    };
  }, [user?.email, firebaseInitialized]);

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
    <AuthContext.Provider value={{ user, loading, firebaseInitialized, login, logout, refreshUser }}>
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

// Main App Component - v3
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
