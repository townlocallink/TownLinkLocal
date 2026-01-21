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
  Firestore,
  updateDoc
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

let dbInstance: Firestore | null = null;
let cloudActive = false;

const getDb = (): Firestore | null => {
  if (dbInstance) return dbInstance;
  try {
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    dbInstance = getFirestore(app);
    cloudActive = true;
    return dbInstance;
  } catch (e) {
    console.error("LocalLink Firebase Init Failed:", e);
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

  listenToMarketData: (callback: (data: any) => void) => {
    const firestore = getDb();
    if (!firestore) return () => {};

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