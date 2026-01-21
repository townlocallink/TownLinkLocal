import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile, ShopProfile, ProductRequest, Offer, Order, DailyUpdate } from './types';
import Auth from './components/Auth';
import CustomerDashboard from './components/CustomerDashboard';
import ShopOwnerDashboard from './components/ShopOwnerDashboard';
import AdminDashboard from './components/AdminDashboard';
import Confetti from './components/Confetti';
import { dbService } from './databaseService';

const SESSION_KEY = 'locallink_v14_active_user';

interface Notification {
  id: string;
  text: string;
  type: 'order' | 'offer' | 'chat' | 'system' | 'lead';
  timestamp: number;
}

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | ShopProfile | null>(null);
  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [updates, setUpdates] = useState<DailyUpdate[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [globalPopup, setGlobalPopup] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [isCloudActive, setIsCloudActive] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const addNotification = useCallback((text: string, type: Notification['type']) => {
    const n: Notification = {
      id: Math.random().toString(36).substr(2, 9),
      text,
      type,
      timestamp: Date.now()
    };
    setNotifications(prev => [n, ...prev].slice(0, 30));
  }, []);

  useEffect(() => {
    let unsubscribe = () => {};

    const initApp = async () => {
      // 1. Restore session (DO NOT wait for Firestore)
      const savedSession = localStorage.getItem(SESSION_KEY);
      if (savedSession) {
        try {
          const parsed = JSON.parse(savedSession);
          setUser(parsed);
        } catch (e) {
          console.error("Session restore failed", e);
        }
      }

      // 2. Start Firestore listeners (non-blocking)
      unsubscribe = dbService.listenToMarketData((data) => {
        setRequests(data.requests || []);
        setOffers(data.offers || []);
        setOrders(data.orders || []);
        setUpdates(data.updates || []);
      });

      // 3. Cloud status (non-blocking)
      setIsCloudActive(dbService.isCloudActive());

      // 🔑 IMPORTANT: App is ready regardless of Firestore state
      setIsInitializing(false);
    };

    initApp();
    return () => unsubscribe();
  }, []);

  const handleLogin = (u: UserProfile | ShopProfile) => {
    setUser(u);
    localStorage.setItem(SESSION_KEY, JSON.stringify(u));
    dbService.saveUsers([u]);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  const submitRating = async (tid: string, r: number, oid: string, type: 'shop' | 'customer') => {
    const userToUpdate = (await dbService.loadUsers()).find(u => u.id === tid);
    if (userToUpdate) {
      const updatedTotal = (userToUpdate.totalRatings || 0) + 1;
      const updatedRating = Number((((userToUpdate.rating * (updatedTotal - 1)) + r) / updatedTotal).toFixed(1));
      await dbService.updateUserProfile(tid, { rating: updatedRating, totalRatings: updatedTotal });

      const targetOrd = orders.find(o => o.id === oid);
      if (targetOrd) {
        const updatedOrder = type === 'shop'
          ? { ...targetOrd, shopRated: true }
          : { ...targetOrd, customerRated: true };
        await dbService.saveItem(oid, 'order', updatedOrder);
      }
      addNotification(`Review submitted!`, 'system');
    }
  };

  const handleUpdateOrder = async (orderId: string, status: Order['status']) => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (targetOrder) {
      const updatedOrder = { ...targetOrder, status };
      await dbService.saveItem(orderId, 'order', updatedOrder);
      addNotification("Order status updated!", 'order');
    }
  };

  if (isInitializing && user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-indigo-600 font-black uppercase tracking-widest text-xs">
          Syncing Town Data...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-8">
      {showConfetti && <Confetti />}

      <div className="max-w-6xl mx-auto">
        {!user ? (
          <Auth onLogin={handleLogin} />
        ) : (
          <>
            <nav className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🛍️</span>
                <div className="flex flex-col">
                  <h1 className="text-3xl font-black italic tracking-tighter text-indigo-600 leading-none">
                    LocalLink
                  </h1>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${isCloudActive ? 'bg-green-500 animate-pulse' : 'bg-amber-400'}`}></div>
                    <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                      {isCloudActive ? 'Cloud Sync Active' : 'Offline Mode'}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={handleLogout} className="text-xs font-black text-gray-400 uppercase tracking-widest hover:text-red-500">
                Logout
              </button>
            </nav>

            {user.role === 'admin' ? (
              <AdminDashboard requests={requests} offers={offers} orders={orders} allUsers={[]} onImportData={(data) => {
                dbService.saveUsers(data.users || []);
              }} />
            ) : user.role === 'customer' ? (
              <CustomerDashboard
                user={user as UserProfile}
                requests={requests.filter(r => r.customerId === user.id)}
                offers={offers}
                orders={orders.filter(o => o.customerId === user.id)}
                updates={updates}
                onNewRequest={async (req) => {
                  await dbService.saveItem(req.id, 'request', req);
                  addNotification("Request broadcasted!", "system");
                }}
                onAcceptOffer={async (order) => {
                  await dbService.saveItem(order.id, 'order', order);
                  setShowConfetti(true);
                  setTimeout(() => setShowConfetti(false), 5000);
                  addNotification("Order confirmed!", 'order');
                }}
                onSubmitRating={submitRating}
              />
            ) : (
              <ShopOwnerDashboard
                user={user as ShopProfile}
                requests={requests}
                offers={offers.filter(o => o.shopId === user.id)}
                orders={orders.filter(o => o.shopId === user.id)}
                onUpdateOrder={handleUpdateOrder}
                onSubmitRating={submitRating}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default App;
