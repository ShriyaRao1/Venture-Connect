import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { userAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { InvestorCardSkeleton } from '../components/Skeletons';

export default function Investors() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [investors, setInvestors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userAPI.investors()
      .then(({ data }) => setInvestors(data.investors ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-black text-white mb-0.5">Investor Network</h1>
        <p className="text-sm text-[#555]">Active angels and VCs on VentureConnect</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => <InvestorCardSkeleton key={i} />)}
        </div>
      ) : investors.length === 0 ? (
        <div className="text-center py-24 border border-[#2a2a2a] rounded-xl">
          <p className="text-[#555] text-sm">No investors listed yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {investors.map((inv, i) => (
            <motion.div key={inv._id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="al-card p-5 flex flex-col items-center text-center gap-2.5">
              <div className="w-14 h-14 rounded-full bg-[#00c853] flex items-center justify-center text-black font-black text-xl overflow-hidden">
                {inv.avatar
                  ? <img src={inv.avatar} alt={inv.name} className="w-full h-full object-cover" />
                  : inv.name[0].toUpperCase()}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white truncate max-w-[120px]">{inv.name}</h3>
                {inv.location && <p className="text-[11px] text-[#555]">📍 {inv.location}</p>}
              </div>
              <p className="text-xs text-[#888] line-clamp-3 leading-relaxed">{inv.bio || 'Investor on VentureConnect'}</p>
              <div className="flex gap-2 justify-center flex-wrap mt-auto">
                {inv.website && (
                  <a href={inv.website} target="_blank" rel="noreferrer"
                    className="text-[10px] text-[#00c853] hover:underline">Web ↗</a>
                )}
                {inv.linkedin && (
                  <a href={inv.linkedin} target="_blank" rel="noreferrer"
                    className="text-[10px] text-blue-400 hover:underline">LinkedIn ↗</a>
                )}
              </div>
              {user && user._id?.toString() !== inv._id?.toString() && (
                <button
                  onClick={() => navigate(`/messages?with=${inv._id}&name=${encodeURIComponent(inv.name)}`)}
                  className="w-full mt-1 text-[10px] px-3 py-1.5 rounded-md bg-[#00c853]/10 text-[#00c853] hover:bg-[#00c853]/20 font-semibold transition-colors">
                  ✉ Message
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
