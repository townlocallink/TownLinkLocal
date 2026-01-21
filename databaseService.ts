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

const firebaseConfig = {
  apiKey: "AIzaSyDiEH7WGW6plRI0oAzPQkPMQpTSHfpaXMQ",
  authDomain: "locallink-town.firebaseapp.com",
  projectId: "locallink-town",
  storageBucket: "locallink-town.firebasestorage.app",
  messagingSenderId: "213164605800",
  appId: "1:213164605800:web:f3c7761b11df9eafe596dd",
  measurementId: "G-C3LCEMNQP5"
};

let app: FirebaseApp;
let db: Firestore;

const getDb = (): Firestore => {
  if (db) return db;
  try {
    const apps = getApps();
    app = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
    db = getFirestore(app);
    return db;
  } catch (e) {
    console.error("Firebase Initialization Critical Error:", e);
    throw new Error("Firestore is currently unavailable.");
  }
};

export const dbService = {
  isCloudActive: () => {
    try {
      getDb();
      return true;
    } catch (e) {
      return false;
    }
  },
  
  loadUsers: async (): Promise<(UserProfile | ShopProfile)[]> => {
    try {
      const firestore = getDb();
      const querySnapshot = await getDocs(collection(firestore, "users"));
      return querySnapshot.docs.map(doc => doc.data() as UserProfile | ShopProfile);
    } catch (e) {
      console.error("Load Users Failed:", e);
      return [];
    }
  },

  listenToMarketData: (callback: (data: any) => void) => {
    let firestore: Firestore;
    try {
      firestore = getDb();
    } catch (e) {
      console.error("Cannot listen to market data - Firestore unavailable.");
      return () => {};
    }
    
    const currentData = {
      requests: [] as ProductRequest[],
      offers: [] as Offer[],
      orders: [] as Order[],
      updates: [] as DailyUpdate[]
    };

    const emit = () => {
      callback({ ...currentData });
    };

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
    try {
      const firestore = getDb();
      for (const user of users) {
        await setDoc(doc(firestore, "users", user.id), user, { merge: true });
      }
    } catch (e) {
      console.error("Save Users Failed:", e);
    }
  },

  updateUserProfile: async (id: string, data: Partial<UserProfile | ShopProfile>) => {
    try {
      const firestore = getDb();
      await setDoc(doc(firestore, "users", id), data, { merge: true });
    } catch (e) {
      console.error("Update User Failed:", e);
    }
  },

  saveItem: async (id: string, type: 'request' | 'offer' | 'order' | 'update', data: any) => {
    try {
      const firestore = getDb();
      const colMap: Record<string, string> = { 'request': 'requests', 'offer': 'offers', 'order': 'orders', 'update': 'updates' };
      const colName = colMap[type] || type;
      await setDoc(doc(firestore, colName, id), data, { merge: true });
    } catch (e) {
      console.error(`Save Item Error (${type}):`, e);
    }
  }
};