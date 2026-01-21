import React, { useState } from 'react';
import { ShopProfile, ProductRequest, Offer, Order, DirectMessage, DailyUpdate } from '../types';
import OfferForm from './OfferForm';
import DirectChat from './DirectChat';
import { generatePromoBanner } from '../geminiService';

interface ShopOwnerDashboardProps {
  user: ShopProfile;
  requests: ProductRequest[];
  totalGlobalRequests: number;
  offers: Offer[];
  orders: Order[];
  onPostUpdate: (update: DailyUpdate) => void;
  onSubmitOffer: (offer: Offer) => void;
  onUpdateOrder: (orderId: string, status: Order['status']) => void;
  onSendMessage: (offerId: string, msg: DirectMessage, recipientId: string) => void;
  onSubmitRating: (targetId: string, rating: number, orderId: string, type: 'customer') => void;
}

const ShopOwnerDashboard: React.FC<ShopOwnerDashboardProps> = ({ 
  user, requests, totalGlobalRequests, offers, orders, onPostUpdate, onSubmitOffer, onUpdateOrder, onSendMessage, onSubmitRating
}) => {
  const [selectedRequest, setSelectedRequest] = useState<ProductRequest | null>(null);
  const [activeChatOfferId, setActiveChatOfferId] = useState<string | null>(null);
  const [ratingModal, setRatingModal] = useState<{orderId: string, customerId: string} | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateText, setUpdateText] = useState('');
  const [updateImage, setUpdateImage] = useState<string | null>(null);
  const [isGeneratingBanner, setIsGeneratingBanner] = useState(false);
  const [promoInput, setPromoInput] = useState('');

  const activeChatOffer = offers.find(o => o.id === activeChatOfferId);

  // Robust filtering: Only match category if it's not "Other" or matches specifically
  const filteredRequests = requests.filter(r => {
    if (r.status !== 'broadcasted') return false;
    
    const shopCat = (user.category || '').toLowerCase().trim();
    const reqCat = (r.category || '').toLowerCase().trim();
    
    return shopCat === 'other' || reqCat === shopCat;
  });

  const handlePostUpdate = () => {
    if (!updateText.trim()) return;
    const update: DailyUpdate = {
      id: 'upd_' + Math.random().toString(36).substr(2, 9),
      shopId: user.id,
      shopName: user.shopName,
      text: updateText,
      image: updateImage || undefined,
      createdAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000)
    };
    onPostUpdate(update);
    setShowUpdateModal(false);
    setUpdateText('');
    setUpdateImage(null);
  };

  const handleGenerateBanner = async () => {
    if (!promoInput.trim()) return;
    setIsGeneratingBanner(true);
    const banner = await generatePromoBanner(user.shopName, promoInput);
    if (banner) {
      setUpdateImage(banner);
      setUpdateText(`Special Promotion: ${promoInput}`);
    }
    setIsGeneratingBanner(false);
  };

  return (
    <div className="space-y-6">
      <header className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">{user.shopName}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="bg-indigo-600 text-white text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-widest">{user.category} Specialist</span>
            <span className="text-xs font-bold text-gray-400">
              {user.totalRatings === 0 ? 'New Seller' : `★ ${user.rating} (${user.totalRatings} ratings)`}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
           <button onClick={() => setShowUpdateModal(true)} className="bg-orange-500 text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-orange-100 hover:bg-orange-600">
             Post to Town Square
           </button>
           <div className="bg-indigo-50 px-4 py-2 rounded-2xl hidden md:block">
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Live Activity</p>
              <p className="text-lg font-black text-indigo-700">{totalGlobalRequests} Live Requests</p>
           </div>
        </div>
      </header>

      {showUpdateModal && (
        <div className="fixed inset-0 z-[150] bg-gray-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[40px] shadow-2xl max-w-lg w-full">
            <h3 className="text-2xl font-black mb-2 italic">Town Square Update</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Attract local buyers instantly</p>
            <div className="space-y-4">
              <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
                <p className="text-[10px] font-black text-indigo-600 uppercase mb-3">AI Storefront Designer</p>
                <div className="flex gap-2">
                  <input 
                    className="flex-1 bg-white border border-indigo-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 ring-indigo-500"
                    placeholder="Describe a deal (e.g. 20% off sweets)"
                    value={promoInput}
                    onChange={e => setPromoInput(e.target.value)}
                  />
                  <button 
                    onClick={handleGenerateBanner}
                    disabled={isGeneratingBanner || !promoInput}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                  >
                    {isGeneratingBanner ? '🖌️ Designing...' : '🎨 AI Banner'}
                  </button>
                </div>
              </div>
              <textarea 
                className="w-full p-4 bg-gray-50 border-transparent border-2 focus:border-orange-500 rounded-2xl transition outline-none h-24 text-sm"
                placeholder="What's happening at the shop?"
                value={updateText}
                onChange={e => setUpdateText(e.target.value)}
              />
              {updateImage && (
                <div className="relative group">
                  <img src={updateImage} className="h-48 w-full object-cover rounded-2xl border shadow-sm" />
                  <button onClick={() => setUpdateImage(null)} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 shadow-lg">✕</button>
                </div>
              )}
              <div className="flex gap-3 mt-4">
                <label className="bg-gray-100 p-4 rounded-2xl cursor-pointer text-xl hover:bg-gray-200 transition">
                  📷
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const r = new FileReader();
                      r.onload = (ev) => setUpdateImage(ev.target?.result as string);
                      r.readAsDataURL(file);
                    }
                  }} />
                </label>
                <button onClick={handlePostUpdate} className="flex-1 bg-orange-500 text-white font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest shadow-lg shadow-orange-100">
                  Broadcast to Town
                </button>
                <button onClick={() => setShowUpdateModal(false)} className="px-4 py-4 text-gray-400 font-black uppercase text-[10px]">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <section>
        <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-6 flex items-center gap-2">
          <span className="bg-indigo-100 p-1 rounded-lg">📡</span> Nearby Leads ({filteredRequests.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredRequests.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-white border-2 border-dashed border-gray-200 rounded-[32px]">
              <p className="text-gray-400 font-black text-lg uppercase">Scanning for leads...</p>
              <p className="text-[10px] text-gray-300 mt-2 uppercase font-bold">New requests will appear here automatically</p>
            </div>
          ) : (
            filteredRequests.map(req => {
              const myOffer = offers.find(o => o.requestId === req.id);
              return (
                <div key={req.id} className={`p-6 rounded-[32px] shadow-sm border transition flex flex-col h-full ${
                    myOffer?.status === 'accepted' ? 'bg-green-50 border-green-500' : 
                    myOffer?.status === 'rejected' ? 'bg-white border-gray-100 opacity-60 grayscale-[0.5]' : 
                    'bg-white border-gray-100 hover:border-indigo-600'
                }`}>
                  <div className="flex justify-between items-start mb-4">
                    <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">{req.category}</span>
                    <span className="text-[10px] font-bold text-gray-300">REQ: {req.id.slice(0,4)}</span>
                  </div>
                  <p className="text-gray-900 text-sm font-semibold leading-relaxed bg-white/50 p-4 rounded-2xl mb-auto border border-gray-50">{req.description}</p>
                  
                  <div className="mt-6">
                    {myOffer ? (
                      <div>
                        {myOffer.status === 'accepted' ? (
                            <div className="text-center">
                                <p className="text-xs font-black text-green-700 uppercase tracking-widest mb-2 animate-bounce">🎉 Order Won!</p>
                                <button onClick={() => setActiveChatOfferId(myOffer.id)} className="w-full bg-green-600 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest">
                                    Message Customer
                                </button>
                            </div>
                        ) : myOffer.status === 'rejected' ? (
                            <div className="bg-gray-50 p-4 rounded-2xl border text-center">
                                <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Offer Not Accepted</p>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <button onClick={() => setActiveChatOfferId(myOffer.id)} className="flex-1 bg-white border-2 border-indigo-100 text-indigo-600 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest">
                                Chat {(myOffer.chatHistory?.length || 0) > 0 && `(${myOffer.chatHistory?.length})`}
                                </button>
                                <div className="flex-[1.5] bg-indigo-50 text-indigo-700 text-[10px] font-black py-3 rounded-2xl text-center border border-indigo-100 uppercase tracking-widest">
                                Quote: ₹{myOffer.price}
                                </div>
                            </div>
                        )}
                      </div>
                    ) : (
                      <button onClick={() => setSelectedRequest(req)} className="w-full bg-indigo-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100">
                        Send Quote
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {selectedRequest && (
        <div className="fixed inset-0 z-[100] bg-gray-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl p-8 h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black italic">Submit Quote</h3>
              <button onClick={() => setSelectedRequest(null)} className="text-gray-400 p-2 hover:bg-gray-100 rounded-full transition">✕</button>
            </div>
            <OfferForm request={selectedRequest} shop={user} onClose={() => setSelectedRequest(null)} onSubmit={onSubmitOffer} />
          </div>
        </div>
      )}

      <section>
        <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-6">📦 Order Pipeline</h3>
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="p-10 text-center text-gray-300 bg-white rounded-[32px] border border-gray-100 font-black uppercase text-xs">Waiting for sales...</div>
          ) : (
            orders.map(order => (
              <div key={order.id} className="bg-white p-6 rounded-[32px] border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center shadow-sm gap-4">
                <div className="flex-1">
                  <p className="font-black text-gray-900">Order #{order.id.slice(0, 4).toUpperCase()}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1 italic">Deliver to: {order.deliveryAddress}</p>
                </div>
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 w-full sm:w-auto">
                  <span className={`text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-widest ${
                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                    order.status === 'out_for_delivery' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {order.status.replace(/_/g, ' ')}
                  </span>
                  {order.status === 'pending' && (
                    <button onClick={() => onUpdateOrder(order.id, 'out_for_delivery')} className="bg-gray-900 text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-black transition w-full sm:w-auto shadow-lg shadow-gray-100">
                      Dispatch
                    </button>
                  )}
                  {order.status === 'delivered' && !order.customerRated && (
                    <button onClick={() => setRatingModal({orderId: order.id, customerId: order.customerId})} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest w-full sm:w-auto">
                      Rate Customer
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {activeChatOffer && (
        <div className="fixed inset-0 z-[120] bg-gray-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <DirectChat 
            currentUser={user} 
            otherPartyName="Local Customer" 
            history={activeChatOffer.chatHistory || []} 
            onSendMessage={(text) => onSendMessage(activeChatOffer.id, { senderId: user.id, text, timestamp: Date.now() }, activeChatOffer.requestId)}
            onClose={() => setActiveChatOfferId(null)} 
          />
        </div>
      )}
    </div>
  );
};

export default ShopOwnerDashboard;