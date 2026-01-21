
import { initializeApp, getApps, getApp } from 'firebase/app';
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

// Hardcoded Firebase configuration from your project
const firebaseConfig = {
  apiKey: "AIzaSyDiEH7WGW6plRI0oAzPQkPMQpTSHfpaXMQ",
  authDomain: "locallink-town.firebaseapp.com",
  projectId: "locallink-town",
  storageBucket: "locallink-town.firebasestorage.app",
  messagingSenderId: "213164605800",
  appId: "1:213164605800:web:f3c7761b11df9eafe596dd",
  measurementId: "G-C3LCEMNQP5"
};

let db: Firestore | null = null;
let cloudActive = false;

const getDb = (): Firestore | null => {
  if (db) return db;
  try {
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    db = getFirestore(app);
    cloudActive = true;
    return db;
  } catch (e) {
    console.warn("LocalLink: Database connection failed.", e);
    return null;
  }
};

export const dbService = {
  isCloudActive: () => {
    getDb();
    return cloudActive;
  },
  
  loadUsers: async (): Promise<(UserProfile | ShopProfile)[]> => {
    const firestore = getDb();
    if (!firestore) return [];
    try {
      const querySnapshot = await getDocs(collection(firestore, "users"));
      return querySnapshot.docs.map(doc => doc.data() as UserProfile | ShopProfile);
    } catch (e) {
      return [];
    }
  },

  loadMarketData: async () => {
    const firestore = getDb();
    if (!firestore) return { requests: [], offers: [], orders: [], updates: [] };
    try {
      const [reqs, offs, ords, upds] = await Promise.all([
        getDocs(collection(firestore, "requests")),
        getDocs(collection(firestore, "offers")),
        getDocs(collection(firestore, "orders")),
        getDocs(query(collection(firestore, "updates"), orderBy("createdAt", "desc"), limit(50)))
      ]);

      return {
        requests: reqs.docs.map(d => d.data() as ProductRequest),
        offers: offs.docs.map(d => d.data() as Offer),
        orders: ords.docs.map(d => d.data() as Order),
        updates: upds.docs.map(d => d.data() as DailyUpdate).filter(u => u.expiresAt > Date.now())
      };
    } catch (e) {
      console.error("Load Market Data Error:", e);
      return { requests: [], offers: [], orders: [], updates: [] };
    }
  },

  listenToMarketData: (callback: (data: any) => void) => {
    const firestore = getDb();
    if (!firestore) return () => {};

    // Initial state object
    const currentData = {
      requests: [] as ProductRequest[],
      offers: [] as Offer[],
      orders: [] as Order[],
      updates: [] as DailyUpdate[]
    };

    const emit = () => callback({ ...currentData });

    const unsubscribers = [
      onSnapshot(collection(firestore, "requests"), (snap) => {
        currentData.requests = snap.docs.map(d => d.data() as ProductRequest);
        emit();
      }),
      onSnapshot(collection(firestore, "offers"), (snap) => {
        currentData.offers = snap.docs.map(d => d.data() as Offer);
        emit();
      }),
      onSnapshot(collection(firestore, "orders"), (snap) => {
        currentData.orders = snap.docs.map(d => d.data() as Order);
        emit();
      }),
      onSnapshot(query(collection(firestore, "updates"), orderBy("createdAt", "desc"), limit(20)), (snap) => {
        currentData.updates = snap.docs.map(d => d.data() as DailyUpdate).filter(u => u.expiresAt > Date.now());
        emit();
      })
    ];

    return () => unsubscribers.forEach(unsub => unsub());
  },

  saveUsers: async (users: (UserProfile | ShopProfile)[]) => {
    const firestore = getDb();
    if (!firestore) return;
    try {
      for (const user of users) {
        await setDoc(doc(firestore, "users", user.id), user, { merge: true });
      }
    } catch (e) {}
  },

  updateUserProfile: async (id: string, data: Partial<UserProfile | ShopProfile>) => {
    const firestore = getDb();
    if (!firestore) return;
    try {
      await setDoc(doc(firestore, "users", id), data, { merge: true });
    } catch (e) {}
  },

  saveItem: async (id: string, type: 'request' | 'offer' | 'order' | 'update', data: any) => {
    const firestore = getDb();
    if (!firestore) return;
    try {
      const colMap: Record<string, string> = { 'request': 'requests', 'offer': 'offers', 'order': 'orders', 'update': 'updates' };
      const colName = colMap[type] || type;
      await setDoc(doc(firestore, colName, id), data, { merge: true });
    } catch (e) {
      console.error(`Save Item Error (${type}):`, e);
    }
  }
};
