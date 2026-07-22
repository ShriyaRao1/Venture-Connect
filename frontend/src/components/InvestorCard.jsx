import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function InvestorCard({ inv, isSaved, onToggleSave, connectionStatus, onConnect, delay = 0, currentUser }) {
  const navigate = useNavigate();
  const isFounder = currentUser?.role === 'founder';

  const handleCardClick = () => {
    navigate(`/investors/${inv._id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.04 }}
      onClick={handleCardClick}
      className="al-card p-5 flex flex-col items-center text-center gap-2.5 relative cursor-pointer hover:border-[#00c853]/40 transition-all"
    >
      {/* Save Button (Founder Only) */}
      {isFounder && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave(inv._id);
          }}
          className={`absolute top-3 right-3 text-sm p-1 rounded-full hover:bg-white/10 transition-colors ${
            isSaved ? 'text-[#00c853]' : 'text-[#555]'
          }`}
          title={isSaved ? 'Remove from saved' : 'Save investor'}
        >
          {isSaved ? '★' : '☆'}
        </button>
      )}

      {/* Avatar */}
      <div className="w-14 h-14 rounded-full bg-[#00c853] flex items-center justify-center text-black font-black text-xl overflow-hidden shrink-0">
        {inv.avatar ? (
          <img src={inv.avatar} alt={inv.name} className="w-full h-full object-cover" />
        ) : (
          inv.name[0].toUpperCase()
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 w-full">
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          <h3 className="text-sm font-bold text-white truncate max-w-[130px]">{inv.name}</h3>
          {inv.matchScore !== undefined && inv.matchScore !== null && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-[#00c853]/15 text-[#00c853] font-bold shrink-0">
              {inv.matchScore}%
            </span>
          )}
        </div>
        {inv.location && <p className="text-[11px] text-[#555] mt-0.5">📍 {inv.location}</p>}
      </div>

      {/* Bio */}
      <p className="text-xs text-[#888] line-clamp-3 leading-relaxed h-[54px] w-full">
        {inv.bio || 'Investor on VentureConnect'}
      </p>

      {/* Links */}
      <div className="flex gap-2 justify-center flex-wrap mt-auto">
        {inv.website && (
          <a
            href={inv.website}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[10px] text-[#00c853] hover:underline"
          >
            Web ↗
          </a>
        )}
        {inv.linkedin && (
          <a
            href={inv.linkedin}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[10px] text-blue-400 hover:underline"
          >
            LinkedIn ↗
          </a>
        )}
      </div>

      {/* Actions */}
      {isFounder ? (
        <div className="w-full mt-2 space-y-1.5">
          {connectionStatus === 'accepted' ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/messages?with=${inv._id}&name=${encodeURIComponent(inv.name)}`);
              }}
              className="w-full text-[10px] px-3 py-1.5 rounded-md bg-[#00c853] text-black hover:bg-[#00b047] font-semibold transition-colors flex items-center justify-center gap-1"
            >
              ✉ Message
            </button>
          ) : connectionStatus === 'pending' ? (
            <button
              disabled
              onClick={(e) => e.stopPropagation()}
              className="w-full text-[10px] px-3 py-1.5 rounded-md bg-[#2a2a2a] text-[#888] font-semibold cursor-not-allowed"
            >
              ⏳ Pending Response
            </button>
          ) : connectionStatus === 'rejected' ? (
            <button
              disabled
              onClick={(e) => e.stopPropagation()}
              className="w-full text-[10px] px-3 py-1.5 rounded-md bg-red-500/10 text-red-400 font-semibold cursor-not-allowed"
            >
              Declined
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onConnect(inv);
              }}
              className="w-full text-[10px] px-3 py-1.5 rounded-md bg-[#00c853]/10 text-[#00c853] hover:bg-[#00c853]/20 font-semibold transition-colors"
            >
              🤝 Connect
            </button>
          )}
        </div>
      ) : (
        /* Message button for general users/investors viewing other investors (excluding self) */
        currentUser && currentUser._id?.toString() !== inv._id?.toString() && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/messages?with=${inv._id}&name=${encodeURIComponent(inv.name)}`);
            }}
            className="w-full mt-2 text-[10px] px-3 py-1.5 rounded-md bg-[#00c853]/10 text-[#00c853] hover:bg-[#00c853]/20 font-semibold transition-colors"
          >
            ✉ Message
          </button>
        )
      )}
    </motion.div>
  );
}
