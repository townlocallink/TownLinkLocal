
import React, { useState } from 'react';
import { UserProfile, ProductRequest, Offer, Order, DirectMessage, DailyUpdate } from '../types';
import ChatAgent from './ChatAgent';
import RequestList from './RequestList';
import OfferList from './OfferList';
import DirectChat from './DirectChat';

interface CustomerDashboardProps {
  user: UserProfile;
  requests: ProductRequest[];
  offers: Offer[];
  orders: Order[];
  updates: DailyUpdate[];
  onNewRequest: (req: ProductRequest) => void;
  onAcceptOffer: (order: Order) => void;
  onUpdateUser: (user: UserProfile) => void;
  onSendMessage: (offerId: string, msg: DirectMessage, recipientId: string) => void;
  onMarkReceived: (orderId: string) => void;
  onSubmitRating: (targetId: string, rating: number, orderId: string, type: 'shop') => void;
}

const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ 
  user, requests, offers, orders, updates, onNewRequest, onAcceptOffer, onUpdateUser, onSendMessage, onMarkReceived, onSubmitRating
}) => {
  const [showChat, setShowChat] = useState(false);
  const [activeChatOfferId, setActiveChatOfferId] = useState<string | null>(null);
  const [ratingModal, setRatingModal] = useState<{orderId: string, shopId: string} | null>(null);

  const activeChatOffer = offers.find(o => o.id === activeChatOfferId);

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Hello, {user.name}!</h2>
            <span className="bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border border-indigo-100">{user.city} - {user.pinCode}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              {user.totalRatings === 0 ? 'New Buyer' : `★ ${user.rating} (${user.totalRatings} ratings)`}
            </span>
          </div>
        </div>
        <button onClick={() => setShowChat(true)} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition">
          + New Request
        </button>
      </header>

      {/* Town Square Feed */}
      {updates.length > 0 && (
        <section>
          <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-4 flex items-center gap-2 px-2">
            <span className="bg-orange-100 p-1 rounded-lg">🔥</span> Town Square (Live)
          </h3>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {updates.map(update => (
              <div key={update.id} className="min-w-[280px] bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col shrink-0">
                {update.image && (
                  <div className="h-32 w-full overflow-hidden">
                    <img src={update.image} className="w-full h-full object-cover" alt="Update" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-[10px]">🏪</div>
                    <span className="text-[10px] font-black uppercase text-indigo-600 truncate">{update.shopName}</span>
                  </div>
                  <p className="text-sm font-bold text-gray-800 line-clamp-2 italic">"{update.text}"</p>
                  <p className="text-[8px] font-black text-gray-300 uppercase mt-2 tracking-widest">
                    Posted {Math.round((Date.now() - update.createdAt) / 60000)} mins ago
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Trust & Safety Banner */}
      <div className="bg-blue-600 rounded-[32px] p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-blue-100 border border-blue-500">
         <div className="flex items-center gap-4">
           <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-2xl backdrop-blur-sm">🛡️</div>
           <div>
             <h4 className="font-black text-lg">Safe Hyperlocal Shopping</h4>
             <p className="text-xs text-blue-100 font-medium">No advance payment required. Chat with shops, check availability, and Pay on Delivery!</p>
           </div>
         </div>
         <div className="flex gap-2">
            <div className="bg-white/10 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">Verified Shops Only</div>
            <div className="bg-white/10 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">Local Delivery</div>
         </div>
      </div>

      {showChat && (
        <div className="fixed inset-0 z-[110] bg-gray-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl h-[85vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col">
            <ChatAgent user={user} onClose={() => setShowChat(false)} onFinalized={(req) => { onNewRequest(req); setShowChat(false); }} />
          </div>
        </div>
      )}

      {activeChatOffer && (
        <div className="fixed inset-0 z-[120] bg-gray-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <DirectChat 
            currentUser={user} 
            otherPartyName={activeChatOffer.shopName} 
            history={activeChatOffer.chatHistory || []} 
            onSendMessage={(text) => onSendMessage(activeChatOffer.id, { senderId: user.id, text, timestamp: Date.now() }, activeChatOffer.shopId)}
            onClose={() => setActiveChatOfferId(null)} 
          />
        </div>
      )}

      {ratingModal && (
        <div className="fixed inset-0 z-[130] bg-gray-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[40px] shadow-2xl max-w-sm w-full text-center">
            <h3 className="text-2xl font-black mb-2 italic">How was it?</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Rate your experience with the shop</p>
            <div className="flex justify-center gap-4 mb-8">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} onClick={() => {
                  onSubmitRating(ratingModal.shopId, star, ratingModal.orderId, 'shop');
                  setRatingModal(null);
                }} className="text-4xl hover:scale-125 transition grayscale hover:grayscale-0">⭐</button>
              ))}
            </div>
            <button onClick={() => setRatingModal(null)} className="text-xs font-black text-gray-400 uppercase">Skip for now</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section>
          <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="bg-indigo-100 p-1 rounded-lg">📦</span> My Requests
          </h3>
          <RequestList requests={requests} offers={offers} userType="customer" />
        </section>

        <section>
          <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="bg-green-100 p-1 rounded-lg">🏷️</span> Shop Quotes
          </h3>
          <OfferList 
            offers={offers.filter(o => requests.some(r => r.id === o.requestId && r.status === 'broadcasted'))} 
            user={user}
            onAccept={onAcceptOffer}
            onUpdateUser={onUpdateUser}
            onOpenChat={(off) => setActiveChatOfferId(off.id)}
          />
        </section>
      </div>

      <section className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
        <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-6">📜 Recent Orders</h3>
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="p-12 text-center text-gray-300 font-black uppercase text-xs">No active orders</div>
          ) : (
            orders.map(order => (
              <div key={order.id} className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <p className="font-black text-gray-900">Order #{order.id.slice(0, 5).toUpperCase()}</p>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                      order.status === 'delivered' ? 'bg-green-100 text-green-700' : 
                      order.status === 'out_for_delivery' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'
                    }`}>
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 mt-1">📍 {order.deliveryAddress}</p>
                  
                  {order.status === 'pending' && (
                     <p className="text-[11px] font-black text-indigo-600 mt-2 bg-indigo-50 inline-block px-3 py-1 rounded-lg">🕒 Estimated Delivery: 1-3 Hours</p>
                  )}
                  {order.status === 'out_for_delivery' && (
                     <p className="text-[11px] font-black text-green-600 mt-2 bg-green-50 inline-block px-3 py-1 rounded-lg animate-pulse">🚚 Arriving in 10-30 Minutes!</p>
                  )}
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto">
                  {order.status === 'out_for_delivery' && (
                    <button onClick={() => { onMarkReceived(order.id); setRatingModal({orderId: order.id, shopId: order.shopId}); }} className="bg-green-600 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex-1 sm:flex-none">
                      Received Order
                    </button>
                  )}
                  {order.status === 'delivered' && !order.shopRated && (
                     <button onClick={() => setRatingModal({orderId: order.id, shopId: order.shopId})} className="bg-yellow-400 text-black px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex-1 sm:flex-none hover:bg-yellow-500 transition shadow-lg shadow-yellow-100">
                        Rate Shop
                     </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default CustomerDashboard;
