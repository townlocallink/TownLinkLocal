
import React, { useState, useEffect } from 'react';
import { UserProfile, ShopProfile, ProductRequest, Offer, Order, MarketplaceStats } from '../types';

interface AdminDashboardProps {
  requests: ProductRequest[];
  offers: Offer[];
  orders: Order[];
  allUsers: (UserProfile | ShopProfile)[];
  onImportData: (data: any) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ requests, offers, orders, allUsers, onImportData }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'activity' | 'growth'>('overview');
  const [dataOrigin, setDataOrigin] = useState<'Fresh' | 'Migrated'>('Fresh');
  const [buildTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    if (allUsers.length > 1 || requests.length > 0) {
      const isMigrated = localStorage.getItem('locallink_migrated_flag');
      if (isMigrated) setDataOrigin('Migrated');
    }
  }, [allUsers, requests]);

  const stats: MarketplaceStats = {
    totalUsers: allUsers.filter(u => u.role === 'customer').length,
    totalShops: allUsers.filter(u => u.role === 'shop_owner').length,
    totalRequests: requests.length,
    totalOrders: orders.length,
    conversionRate: requests.length > 0 ? (orders.length / requests.length) * 100 : 0,
    activeCategories: requests.reduce((acc, req) => {
      acc[req.category] = (acc[req.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };

  const copyInvite = (type: 'shop' | 'customer') => {
    const link = window.location.href;
    const msg = type === 'shop' 
      ? `Namaste! LocalLink join kijiye aur apne shehar ke logon se seedha orders paiye. Try kijiye: ${link}`
      : `Bhai! Ab shehar mein kuch bhi dhundna aasan hai. LocalLink use karein aur saari dukano se ek saath puchiye: ${link}`;
    
    navigator.clipboard.writeText(msg);
    alert('Invite link copied for WhatsApp!');
  };

  const exportData = () => {
    const data = { users: allUsers, requests, offers, orders, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `locallink_town_data_${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target?.result as string);
          if (confirm('Importing will replace all current town data. Proceed?')) {
            localStorage.setItem('locallink_migrated_flag', 'true');
            onImportData(parsed);
            setDataOrigin('Migrated');
          }
        } catch (err) {
          alert('Invalid file format.');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="bg-indigo-900 rounded-[40px] p-8 text-white shadow-2xl border border-indigo-800">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
          <div>
            <h2 className="text-3xl font-black tracking-tighter italic">Town Admin Center</h2>
            <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Marketplace Governance & Growth</p>
          </div>
          
          <div className="flex flex-wrap bg-indigo-950 p-1.5 rounded-2xl border border-indigo-800 shadow-inner">
            {(['overview', 'users', 'activity', 'growth'] as const).map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-indigo-400 hover:text-white'
                }`}
              >
                {tab === 'growth' ? 'Onboarding' : tab}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Local Residents', value: stats.totalUsers, icon: '🏠', color: 'text-blue-300' },
              { label: 'Verified Shops', value: stats.totalShops, icon: '🛡️', color: 'text-purple-300' },
              { label: 'Live Requests', value: stats.totalRequests, icon: '📡', color: 'text-yellow-300' },
              { label: 'Total Sales', value: stats.totalOrders, icon: '📈', color: 'text-green-300' },
            ].map((item, idx) => (
              <div key={idx} className="bg-white/5 p-6 rounded-3xl border border-white/5 backdrop-blur-sm">
                <span className="text-2xl mb-2 block">{item.icon}</span>
                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">{item.label}</p>
                <p className={`text-3xl font-black ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {activeTab === 'growth' && (
        <div className="space-y-6">
          <div className="bg-white rounded-[40px] p-10 border border-gray-100 shadow-sm">
            <h3 className="text-2xl font-black italic mb-2">Onboarding Roadmap</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-10">Steps to launch your local town</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-8 rounded-[32px] border-2 border-indigo-100 bg-indigo-50/20 relative group overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition">🏪</div>
                  <h4 className="font-black text-lg mb-2">1. Register Shops</h4>
                  <p className="text-sm text-gray-500 mb-6 font-medium">Add at least 5 different categories of shops to make the market feel alive.</p>
                  <button onClick={() => copyInvite('shop')} className="w-full bg-indigo-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100">
                      Copy Shop Invite Link
                  </button>
                </div>

                <div className="p-8 rounded-[32px] border-2 border-green-100 bg-green-50/20 relative group overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition">🛒</div>
                  <h4 className="font-black text-lg mb-2">2. Seed Requests</h4>
                  <p className="text-sm text-gray-500 mb-6 font-medium">Invite friends to use the Voice AI "Sahayak" to post real needs from the market.</p>
                  <button onClick={() => copyInvite('customer')} className="w-full bg-green-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-100">
                      Invite Neighbors
                  </button>
                </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-[40px] p-10 text-white shadow-2xl">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                <div>
                   <h3 className="text-2xl font-black italic mb-2">Town Migration</h3>
                   <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Backup or Transfer Marketplace Data</p>
                </div>
                <div className="flex flex-wrap gap-4">
                   <button onClick={exportData} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-500 transition">
                      Export Backup
                   </button>
                   <label className="bg-white text-gray-900 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl cursor-pointer hover:bg-gray-100 transition">
                      Import Backup File
                      <input type="file" accept=".json" className="hidden" onChange={handleFileImport} />
                   </label>
                </div>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden animate-slide-up">
          <div className="p-8 border-b border-gray-100">
            <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest">Marketplace People</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <th className="px-10 py-5">Name / Business</th>
                  <th className="px-10 py-5">Town Details</th>
                  <th className="px-10 py-5">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {allUsers.map((u, i) => (
                  <tr key={i} className="hover:bg-gray-50/30 transition group">
                    <td className="px-10 py-8">
                      <p className="font-black text-gray-900">{'shopName' in u ? u.shopName : u.name}</p>
                      <p className="text-[9px] text-gray-400 uppercase font-black">{u.phoneNumber}</p>
                    </td>
                    <td className="px-10 py-8">
                      <span className="text-xs font-bold text-gray-600">{u.locality || u.city}</span>
                    </td>
                    <td className="px-10 py-8">
                      <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                        u.role === 'customer' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-purple-50 text-purple-600 border border-purple-100'
                      }`}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <footer className="mt-12 flex items-center justify-between border-t border-gray-100 pt-6 px-4">
         <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
               <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></span>
               <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">System Online</span>
            </div>
            <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
               Town Mode: <span className={dataOrigin === 'Migrated' ? 'text-indigo-600' : 'text-amber-500'}>{dataOrigin}</span>
            </div>
         </div>
         <div className="text-[9px] font-black uppercase text-gray-300 tracking-tighter italic">
            LocalLink Build v9.4.0 @ {buildTime}
         </div>
      </footer>

      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.8s ease-out forwards; }
        .animate-slide-up { animation: slide-up 0.5s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
