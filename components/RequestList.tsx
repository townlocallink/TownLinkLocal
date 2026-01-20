
import React, { useState } from 'react';
import { ProductRequest, Offer } from '../types';

interface RequestListProps {
  requests: ProductRequest[];
  offers: Offer[];
  userType: 'customer' | 'shop';
}

const RequestList: React.FC<RequestListProps> = ({ requests, offers }) => {
  const [selectedReq, setSelectedReq] = useState<ProductRequest | null>(null);

  if (requests.length === 0) {
    return (
      <div className="p-8 text-center bg-gray-50 border-2 border-dashed rounded-2xl">
        <p className="text-gray-400 italic">No active requests.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map(req => {
        const reqOffers = offers.filter(o => o.requestId === req.id);
        return (
          <div key={req.id} className="bg-white p-4 rounded-2xl shadow-sm border group">
            <div className="flex justify-between items-start mb-2">
              <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded ${
                req.status === 'broadcasted' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
              }`}>
                {req.status}
              </span>
              <span className="text-xs text-gray-400">
                {new Date(req.createdAt).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm font-bold text-indigo-600 mb-1">{req.category}</p>
            <p className="text-gray-800 text-sm line-clamp-2">{req.description}</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {reqOffers.length} {reqOffers.length === 1 ? 'offer' : 'offers'} received
              </span>
              <button 
                onClick={() => setSelectedReq(req)}
                className="text-xs font-bold text-indigo-600 group-hover:underline"
              >
                View Details →
              </button>
            </div>
          </div>
        );
      })}

      {selectedReq && (
        <div className="fixed inset-0 z-[70] bg-black bg-opacity-60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 overflow-hidden animate-fade-in max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Request Details</h3>
              <button onClick={() => setSelectedReq(null)} className="text-gray-400 p-2 hover:bg-gray-100 rounded-full">✕</button>
            </div>
            
            <div className="overflow-y-auto flex-1 space-y-4 pr-2">
              <div className="bg-indigo-50 p-4 rounded-xl">
                <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold uppercase mb-2 inline-block">
                  {selectedReq.category}
                </span>
                <p className="text-gray-800 leading-relaxed font-medium">
                  {selectedReq.description}
                </p>
              </div>

              {selectedReq.image && (
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Reference Image Provided</label>
                  <img src={selectedReq.image} className="w-full h-auto rounded-xl border shadow-inner" alt="Customer reference" />
                </div>
              )}

              <div className="pt-4 border-t">
                <p className="text-xs text-gray-400">Request ID: {selectedReq.id}</p>
                <p className="text-xs text-gray-400">Created: {new Date(selectedReq.createdAt).toLocaleString()}</p>
              </div>
            </div>

            <button 
              onClick={() => setSelectedReq(null)}
              className="mt-6 w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestList;
