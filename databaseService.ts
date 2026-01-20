
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  orderBy,
  limit,
  Firestore
} from 'firebase/firestore';
import { UserProfile, ShopProfile, ProductRequest, Offer, Order, DailyUpdate } from './types';

/**
 * Integrated Firebase Configuration for locallink-town
 */
const firebaseConfig = {
  apiKey: "AIzaSyDiEH7WGW6plRI0oAzPQkPMQpTSHfpaXMQ",
  authDomain: "locallink-town.firebaseapp.com",
  projectId: "locallink-town",
  storageBucket: "locallink-town.firebasestorage.app",
  messagingSenderId: "213164605800",
  appId: "1:213164605800:web:f3c7761b11df9eafe596dd",
  measurementId: "G-C3LCEMNQP5"
};

// Initialize Firebase App instance safely
let app: FirebaseApp;
try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
} catch (e) {
  console.error("LocalLink: Firebase App Initialization Failed", e);
}

// Initialize Firestore
let db: Firestore | null = null;
try {
  if (app!) {
    db = getFirestore(app);
    console.log("LocalLink: Cloud Database Initialized Successfully");
  }
} catch (error) {
  console.error("LocalLink: Failed to initialize Firestore service", error);
}

export const dbService = {
  isCloudActive: () => db !== null,
  
  loadUsers: async (): Promise<(UserProfile | ShopProfile)[]> => {
    if (!db) return [];
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      return querySnapshot.docs.map(doc => doc.data() as UserProfile | ShopProfile);
    } catch (e) {
      console.error("Cloud Error: Failed to load users", e);
      return [];
    }
  },

  loadMarketData: async () => {
    if (!db) return { requests: [], offers: [], orders: [], updates: [] };
    try {
      const [reqs, offs, ords, upds] = await Promise.all([
        getDocs(collection(db, "requests")),
        getDocs(collection(db, "offers")),
        getDocs(collection(db, "orders")),
        getDocs(query(collection(db, "updates"), orderBy("createdAt", "desc"), limit(50)))
      ]);

      const now = Date.now();
      return {
        requests: reqs.docs.map(d => d.data() as ProductRequest),
        offers: offs.docs.map(d => d.data() as Offer),
        orders: ords.docs.map(d => d.data() as Order),
        updates: upds.docs.map(d => d.data() as DailyUpdate).filter(u => u.expiresAt > now)
      };
    } catch (e) {
      console.error("Cloud Error: Failed to load market data", e);
      return { requests: [], offers: [], orders: [], updates: [] };
    }
  },

  listenToMarketData: (callback: (data: any) => void) => {
    if (!db) return () => {};
    const collections = ["requests", "offers", "orders", "updates"];
    const unsubscribers = collections.map(colName => {
      return onSnapshot(collection(db!, colName), async () => {
        const data = await dbService.loadMarketData();
        callback(data);
      });
    });
    return () => unsubscribers.forEach(unsub => unsub());
  },

  saveUsers: async (users: (UserProfile | ShopProfile)[]) => {
    if (!db) return;
    try {
      for (const user of users) {
        await setDoc(doc(db, "users", user.id), user, { merge: true });
      }
    } catch (e) {
      console.error("Cloud Error: Failed to save user", e);
    }
  },

  updateUserProfile: async (id: string, data: Partial<UserProfile | ShopProfile>) => {
    if (!db) return;
    try {
      await setDoc(doc(db, "users", id), data, { merge: true });
    } catch (e) {
      console.error("Cloud Error: Failed to update user profile", e);
    }
  },

  saveItem: async (id: string, type: 'request' | 'offer' | 'order' | 'update', data: any) => {
    if (!db) return;
    try {
      const colMap: Record<string, string> = {
        'request': 'requests',
        'offer': 'offers',
        'order': 'orders',
        'update': 'updates'
      };
      const colName = colMap[type] || type;
      await setDoc(doc(db, colName, id), data, { merge: true });
    } catch (e) {
      console.error(`Cloud Error: Failed to save ${type}`, e);
    }
  }
};
