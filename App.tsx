
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile, ShopProfile, ProductRequest, Offer, Order, DailyUpdate } from './types';
import Auth from './components/Auth';
import CustomerDashboard from './components/CustomerDashboard';
import ShopOwnerDashboard from './components/ShopOwnerDashboard';
import AdminDashboard from './components/AdminDashboard';
import Confetti from './components/Confetti';
import { dbService } from './databaseService';

const SESSION_KEY = 'locallink_v13_active_user'; 

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
  const [isCloudActive] = useState(dbService.isCloudActive());
  
  const userRef = useRef<UserProfile | ShopProfile | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const addNotification = useCallback((text: string, type: Notification['type']) => {
    const n: Notification = { id: Math.random().toString(36).substr(2, 9), text, type, timestamp: Date.now() };
    setNotifications(prev => [n, ...prev].slice(0, 30));
  }, []);

  useEffect(() => {
    const init = async () => {
      const savedSession = localStorage.getItem(SESSION_KEY);
      const allUsers = await dbService.loadUsers();
      if (savedSession) {
        try {
          const parsed = JSON.parse(savedSession);
          const liveProfile = allUsers.find((u: any) => u.id === parsed.id);
          setUser(liveProfile || parsed);
        } catch (e) {}
      }

      const marketData = await dbService.loadMarketData();
      setRequests(marketData.requests || []);
      setOffers(marketData.offers || []);
      setOrders(marketData.orders || []);
      setUpdates(marketData.updates || []);

      dbService.listenToMarketData((data) => {
        setRequests(data.requests);
        setOffers(data.offers);
        setOrders(data.orders);
        setUpdates(data.updates);
      });
    };
    init();
  }, [addNotification]);

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
      const nOrd = orders.map(o => o.id === oid ? (type === 'shop' ? { ...o, shopRated: true } : { ...o, customerRated: true }) : o);
      setOrders(nOrd);
      const targetOrd = nOrd.find(o => o.id === oid);
      if (targetOrd) await dbService.saveItem(oid, 'order', targetOrd);
      addNotification(`Review submitted!`, 'system');
    }
  };

  const handleUpdateOrder = async (orderId: string, status: Order['status']) => {
    const nOrd = orders.map(o => o.id === orderId ? { ...o, status } : o);
    setOrders(nOrd);
    const targetOrder = nOrd.find(o => o.id === orderId);
    if (targetOrder) {
      await dbService.saveItem(orderId, 'order', targetOrder);
      addNotification("Order status updated!", 'order');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-8">
      {showConfetti && <Confetti />}
      
      {globalPopup && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[3000] animate-bounce-in w-[90%] max-w-sm">
          <div className="bg-indigo-600 border-2 border-indigo-400 text-white px-6 py-4 rounded-[32px] shadow-2xl flex items-center justify-between">
            <p className="font-black text-[10px] uppercase tracking-widest">{globalPopup.message}</p>
            <button onClick={() => setGlobalPopup(null)}>✕</button>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {!user ? (
          <Auth onLogin={handleLogin} />
        ) : (
          <>
            <nav className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🛍️</span>
                <div className="flex flex-col">
                   <h1 className="text-3xl font-black italic tracking-tighter text-indigo-600 leading-none">LocalLink</h1>
                   <div className="flex items-center gap-1.5 mt-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${isCloudActive ? 'bg-green-500 animate-pulse' : 'bg-amber-400'}`}></div>
                      <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                        {isCloudActive ? 'Cloud Active' : 'Local Mode'}
                      </span>
                   </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => setShowNotifications(!showNotifications)} className="relative w-12 h-12 bg-white border border-gray-100 rounded-2xl flex items-center justify-center">
                  <span className="text-xl">🔔</span>
                  {notifications.length > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white">{notifications.length}</span>}
                </button>
                <button onClick={handleLogout} className="text-xs font-black text-gray-400 uppercase tracking-widest hover:text-red-500 px-2">Logout</button>
              </div>
            </nav>

            {user.role === 'admin' ? (
              <AdminDashboard requests={requests} offers={offers} orders={orders} allUsers={[]} onImportData={(data) => {
                dbService.saveUsers(data.users || []);
                setRequests(data.requests || []); setOffers(data.offers || []); setOrders(data.orders || []);
              }} />
            ) : user.role === 'customer' ? (
              <CustomerDashboard 
                user={user as UserProfile} 
                requests={requests.filter(r => r.customerId === user.id)}
                offers={offers.filter(o => requests.some(r => r.id === o.requestId && r.customerId === user.id))}
                orders={orders.filter(o => o.customerId === user.id)}
                updates={updates}
                onNewRequest={async (req) => { 
                  setRequests(prev => [req, ...prev]); 
                  await dbService.saveItem(req.id, 'request', req);
                  addNotification("Broadcasting request...", "system"); 
                }}
                onAcceptOffer={async (order) => {
                  const nReq = requests.map(r => r.id === order.requestId ? { ...r, status: 'fulfilled' as const } : r);
                  const nOff = offers.map(o => o.requestId === order.requestId ? (o.id === order.offerId ? { ...o, status: 'accepted' as const } : { ...o, status: 'rejected' as const }) : o);
                  await dbService.saveItem(order.id, 'order', order);
                  const updatedReq = nReq.find(r => r.id === order.requestId);
                  if (updatedReq) await dbService.saveItem(updatedReq.id, 'request', updatedReq);
                  for (const o of nOff) { if (o.requestId === order.requestId) await dbService.saveItem(o.id, 'offer', o); }
                  setRequests(nReq); setOffers(nOff); setOrders(prev => [order, ...prev]);
                  setShowConfetti(true);
                  setTimeout(() => setShowConfetti(false), 5000);
                  addNotification("Order placed!", 'order');
                }}
                onUpdateUser={(u) => { setUser(u); localStorage.setItem(SESSION_KEY, JSON.stringify(u)); dbService.saveUsers([u]); }}
                onSendMessage={async (id, msg) => { 
                  const targetOff = offers.find(o => o.id === id);
                  if (targetOff) {
                    const updated = { ...targetOff, chatHistory: [...(targetOff.chatHistory || []), msg] };
                    await dbService.saveItem(id, 'offer', updated);
                  }
                }}
                onMarkReceived={async (id) => { 
                  const nOrd = orders.map(o => o.id === id ? { ...o, status: 'delivered' as const } : o);
                  const target = nOrd.find(o => o.id === id);
                  if (target) await dbService.saveItem(id, 'order', target);
                }}
                onSubmitRating={submitRating}
              />
            ) : (
              <ShopOwnerDashboard 
                user={user as ShopProfile}
                requests={requests.filter(r => r.status === 'broadcasted' && (r.category.toLowerCase() === (user as ShopProfile).category.toLowerCase() || (user as ShopProfile).category === 'Other'))}
                totalGlobalRequests={requests.length}
                offers={offers.filter(o => o.shopId === user.id)}
                orders={orders.filter(o => o.shopId === user.id)}
                onPostUpdate={async (upd) => {
                  setUpdates(prev => [upd, ...prev]);
                  await dbService.saveItem(upd.id, 'update', upd);
                  addNotification("Town Square updated!", "system");
                }}
                onSubmitOffer={async (off) => { 
                  setOffers(prev => [off, ...prev]); 
                  await dbService.saveItem(off.id, 'offer', off);
                  addNotification("Quote sent!", "offer"); 
                }}
                onUpdateOrder={handleUpdateOrder}
                onSendMessage={async (id, msg) => { 
                   const targetOff = offers.find(o => o.id === id);
                   if (targetOff) {
                     const updated = { ...targetOff, chatHistory: [...(targetOff.chatHistory || []), msg] };
                     await dbService.saveItem(id, 'offer', updated);
                   }
                }}
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
