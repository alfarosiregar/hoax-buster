import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, get, child, onValue, push, set, update, remove } from 'firebase/database';
import { auth, db } from '../config/firebase';

export interface HistoryItem {
  id: string;
  title: string;
  status: 'hoax' | 'fact' | 'partial';
  date: string;
  time?: string;
  confidence: number;
  timestamp: number;
  summary?: string;
  referenceUrl?: string;
  referenceTitle?: string;
  references?: { url: string; title: string; source_api?: string }[];
  originalText?: string;
  source?: 'komdigi' | 'user' | 'ai';
}

interface UserProfile {
  name: string;
  firstname?: string;
  lastname?: string;
  username: string;
  email: string;
  photoURL?: string;
  createdAt: number;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  history: HistoryItem[];
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  addHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => Promise<void>;
  deleteHistory: (id: string) => Promise<void>;
  deleteMultipleHistory: (ids: string[]) => Promise<void>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  history: [],
  isLoading: true,
  logout: async () => {},
  refreshProfile: async () => {},
  addHistory: async () => {},
  deleteHistory: async () => {},
  deleteMultipleHistory: async () => {},
  updateProfileData: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (uid: string) => {
    try {
      const dbRef = ref(db);
      const snapshot = await get(child(dbRef, `users/${uid}`));
      if (snapshot.exists()) {
        setProfile(snapshot.val() as UserProfile);
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    }
  };

  useEffect(() => {
    let unsubscribeHistory: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser.uid);
        
        const historyRef = ref(db, `history/${currentUser.uid}`);
        unsubscribeHistory = onValue(historyRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            const historyList: HistoryItem[] = Object.keys(data).map(key => ({
              id: key,
              ...data[key]
            }));
            historyList.sort((a, b) => b.timestamp - a.timestamp);
            setHistory(historyList);
          } else {
            setHistory([]);
          }
        });
      } else {
        setProfile(null);
        setHistory([]);
        if (unsubscribeHistory) unsubscribeHistory();
      }
      setIsLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeHistory) unsubscribeHistory();
    };
  }, []);

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.uid);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const addHistory = async (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    if (!user) return;
    try {
      const historyRef = ref(db, `history/${user.uid}`);
      const newDocRef = push(historyRef);
      await set(newDocRef, {
        ...item,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error adding history:', error);
    }
  };

  const deleteHistory = async (id: string) => {
    if (!user) return;
    try {
      const historyItemRef = ref(db, `history/${user.uid}/${id}`);
      await remove(historyItemRef);
    } catch (error) {
      console.error('Error deleting history:', error);
    }
  };

  const deleteMultipleHistory = async (ids: string[]) => {
    if (!user || ids.length === 0) return;
    try {
      const updates: { [key: string]: null } = {};
      ids.forEach(id => {
        updates[`history/${user.uid}/${id}`] = null;
      });
      await update(ref(db), updates);
    } catch (error) {
      console.error('Error deleting multiple history items:', error);
    }
  };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    if (!user) return;
    try {
      const userRef = ref(db, `users/${user.uid}`);
      await update(userRef, data);
      await fetchProfile(user.uid); // Refresh local state immediately
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, history, isLoading, logout, refreshProfile, addHistory, deleteHistory, deleteMultipleHistory, updateProfileData }}>
      {children}
    </AuthContext.Provider>
  );
};
