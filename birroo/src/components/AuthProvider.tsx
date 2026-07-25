import * as React from 'react';
import { db, auth, loginWithGoogle, logout, handleFirestoreError } from "../lib/firebase";
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';

import { toast } from 'sonner';

interface UserProfile {
  userId: string;
  email: string;
  vehicleName: string;
  tankCapacity: number;
  consumptionPer100Km: number;
  preferredFuelType: string;
  currentTankPercentage: number;
  totalSavings: number;
  lastSavingsAmount?: number | null;
  actionRadiusKm?: number | null;
  currentTankPrice?: number | null;
  highwayMode?: boolean;
  includeStalePrices?: boolean;
  autoUpdateSniperPrice?: boolean;
  blacklistedStations?: string[];
  createdAt?: any;
  updatedAt?: any;
}

const AuthContext = React.createContext<{
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
}>({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
  updateProfileData: async () => {}
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refreshProfile = React.useCallback(async (uid?: string, email?: string) => {
    setLoading(true);
    try {
      if (uid) {
        const docRef = doc(db, 'users', uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        } else {
          const nowStr = new Date().toISOString();
          const newProfile = {
            userId: uid,
            email: email || '',
            vehicleName: '',
            tankCapacity: 0,
            consumptionPer100Km: 0,
            preferredFuelType: 'Benzina',
            currentTankPercentage: 0,
            totalSavings: 0,
            actionRadiusKm: 5,
            blacklistedStations: [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          await setDoc(docRef, newProfile);
          const stateProfile = { ...newProfile, createdAt: nowStr, updatedAt: nowStr };
          setProfile(stateProfile as UserProfile);
        }
      } else {
        // Guest mode: load from localStorage
        const saved = localStorage.getItem('birroo_guest_profile');
        if (saved) {
          setProfile(JSON.parse(saved));
        } else {
          // Default initial guest profile
          const guestProfile: UserProfile = {
            userId: 'guest',
            email: 'guest@birroo.local',
            vehicleName: '',
            tankCapacity: 0,
            consumptionPer100Km: 0,
            preferredFuelType: 'Benzina',
            currentTankPercentage: 0,
            totalSavings: 0,
            actionRadiusKm: 5,
            blacklistedStations: [],
          };
          setProfile(guestProfile);
        }
      }
    } catch (e) {
      console.error("Error fetching profile", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfileData = async (data: Partial<UserProfile>) => {
    if (!profile) return;
    
    const safeData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
    if (Object.keys(safeData).length === 0) return;
    
    const newProfile = { ...profile, ...safeData };
    setProfile(newProfile as UserProfile);

    if (user) {
      try {
         const docRef = doc(db, 'users', user.uid);
         await updateDoc(docRef, { ...safeData, updatedAt: serverTimestamp() });
      } catch (e) {
         handleFirestoreError(e, 'update', `users/${user.uid}`);
      }
    } else {
      // Save guest data
      localStorage.setItem('birroo_guest_profile', JSON.stringify(newProfile));
    }
  };

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        refreshProfile(u.uid, u.email || '');
      } else {
        // Try to load guest profile
        refreshProfile();
      }
    });
    return () => unsubscribe();
  }, [refreshProfile]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile: () => user ? refreshProfile(user.uid, user.email || '') : Promise.resolve(), updateProfileData }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => React.useContext(AuthContext);
