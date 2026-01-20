
import React, { useState } from 'react';
import { ProductRequest, ShopProfile, Offer } from '../types';

interface OfferFormProps {
  request: ProductRequest;
  shop: ShopProfile;
  onClose: () => void;
  onSubmit: (offer: Offer) => void;
}

const OfferForm: React.FC<OfferFormProps> = ({ request, shop, onClose, onSubmit }) => {
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');
  const [image, setImage] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newOffer: Offer = {
      id: Math.random().toString(36).substr(2, 9),
      requestId: request.id,
      shopId: shop.id,
      shopName: shop.shopName,
      shopRating: shop.rating,
      price: parseFloat(price),
      message: message || undefined,
      productImage: image || undefined,
      createdAt: Date.now(),
      chatHistory: []
    };
    onSubmit(newOffer);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-xl mb-4 border border-indigo-50">
        <p className="text-[10px] text-indigo-600 uppercase font-black tracking-widest mb-1">Request Summary</p>
        <p className="text-sm font-medium italic">"{request.description}"</p>
      </div>

      <div>
        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Your Quote (₹)</label>
        <input required type="number" className="w-full p-4 bg-gray-50 border-transparent border-2 focus:border-indigo-600 rounded-2xl transition outline-none font-bold text-lg" placeholder="0.00" value={price} onChange={e => setPrice(e.target.value)} />
      </div>

      <div>
        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Message for Customer (Optional)</label>
        <textarea className="w-full p-4 bg-gray-50 border-transparent border-2 focus:border-indigo-600 rounded-2xl transition outline-none h-24 text-sm" placeholder="Tell them about availability, warranty, or quality..." value={message} onChange={e => setMessage(e.target.value)} />
      </div>

      <div>
        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Reference Photo (Optional)</label>
        {image && <img src={image} className="w-full h-32 object-cover rounded-2xl mb-3 border shadow-sm" />}
        <input type="file" accept="image/*" className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" onChange={handleImageChange} />
      </div>

      <button type="submit" className="w-full bg-indigo-600 text-white font-black p-5 rounded-2xl mt-2 hover:bg-indigo-700 transition shadow-xl shadow-indigo-100 uppercase tracking-widest text-[10px]">
        Send to Customer
      </button>
    </form>
  );
};

export default OfferForm;
