
import React, { useState } from 'react';
import { Offer, Order, UserProfile } from '../types';

interface OfferListProps {
  offers: Offer[];
  user: UserProfile;
  onAccept: (order: Order) => void;
  onUpdateUser: (user: UserProfile) => void;
  onOpenChat: (offer: Offer) => void;
}

const OfferList: React.FC<OfferListProps> = ({ offers, user, onAccept, onUpdateUser, onOpenChat }) => {
  const [addressModalOffer, setAddressModalOffer] = useState<Offer | null>(null);
  const [tempAddress, setTempAddress] = useState(user.address || '');

  if (offers.length === 0) {
    return (
      <div className="p-12 text-center bg-gray-50 border-2 border-dashed rounded-[32px]">
        <p className="text-gray-400 font-black uppercase text-xs">Waiting for local shops...</p>
      </div>
    );
  }

  const handleConfirmOrder = () => {
    if (!addressModalOffer || !tempAddress.trim()) return;
    onUpdateUser({ ...user, address: tempAddress });
    
    const newOrder: Order = {
      id: Math.random().toString(36).substr(2, 9),
      requestId: addressModalOffer.requestId,
      offerId: addressModalOffer.id,
      customerId: user.id,
      shopId: addressModalOffer.shopId,
      deliveryAddress: tempAddress,
      pinCode: user.pinCode,
      city: user.city,
      status: 'pending',
      customerRated: false,
      shopRated: false,
      createdAt: Date.now()
    };
    onAccept(newOrder);
    setAddressModalOffer(null);
  };

  return (
    <div className="space-y-4">
      {offers.map(offer => (
        <div key={offer.id} className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 hover:border-indigo-600 transition">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="font-black text-gray-900 tracking-tight">{offer.shopName}</h4>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-xs font-black text-indigo-600">
                  {offer.shopRating === 0 ? 'New Seller' : `★ ${offer.shopRating}`}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-indigo-600 tracking-tighter">₹{offer.price}</p>
            </div>
          </div>
          
          {offer.message && (
            <p className="text-sm text-gray-600 mb-4 bg-indigo-50/30 p-4 rounded-2xl border border-indigo-50 font-medium italic">
              "{offer.message}"
            </p>
          )}

          {offer.productImage && (
            <div className="mb-4 rounded-2xl overflow-hidden h-40 w-full border border-gray-100">
              <img src={offer.productImage} className="w-full h-full object-cover" alt="Product offered" />
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => onOpenChat(offer)} className="flex-1 bg-white border-2 border-indigo-100 text-indigo-600 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition relative">
              Direct Chat
              {(offer.chatHistory?.length || 0) > 0 && (
                <span className="absolute -top-2 -right-1 bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-full animate-bounce">
                  {offer.chatHistory?.length}
                </span>
              )}
            </button>
            <button 
              onClick={() => { setAddressModalOffer(offer); setTempAddress(user.address || ''); }}
              className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition shadow-lg shadow-indigo-100"
            >
              Order Now
            </button>
          </div>
        </div>
      ))}

      {addressModalOffer && (
        <div className="fixed inset-0 z-[150] bg-gray-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl p-8 overflow-hidden">
            <h3 className="text-2xl font-black mb-2 italic">Delivery Details</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Confirm your local address</p>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1 ml-1">Full Address</label>
                <textarea className="w-full p-5 bg-gray-50 border-transparent border-2 focus:border-indigo-600 rounded-2xl transition outline-none h-32 text-sm font-medium" placeholder="House No, Landmark, Sector, Town..." value={tempAddress} onChange={(e) => setTempAddress(e.target.value)} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setAddressModalOffer(null)} className="flex-1 py-4 text-xs font-black text-gray-400 uppercase">Cancel</button>
                <button disabled={!tempAddress.trim()} onClick={handleConfirmOrder} className="flex-[2] bg-indigo-600 text-white font-black py-4 rounded-2xl hover:bg-indigo-700 disabled:opacity-50 shadow-xl shadow-indigo-100 uppercase text-[10px] tracking-widest">
                  Confirm Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfferList;
