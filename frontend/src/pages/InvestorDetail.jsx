import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { userAPI, connectionAPI, startupAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';

function Section({ title, children }) {
  return (
    <div className="border border-[#2a2a2a] rounded-xl p-5">
      <h2 className="text-[11px] font-bold text-[#555] uppercase tracking-widest mb-4">{title}</h2>
      {children}
    </div>
  );
}

export default function InvestorDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [investor, setInvestor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [connections, setConnections] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [myStartups, setMyStartups] = useState([]);
  const [selectedMatchStartupId, setSelectedMatchStartupId] = useState('');

  // Invite modal states
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedStartupId, setSelectedStartupId] = useState('');
  const [connectMessage, setConnectMessage] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);

  const fetchInvestorData = (startupIdOverride = '') => {
    const params = {};
    const matchId = startupIdOverride || selectedMatchStartupId;
    if (matchId) {
      params.startupId = matchId;
    }

    userAPI.getInvestor(id, params)
      .then(({ data }) => setInvestor(data.investor))
      .catch(() => {
        toast.error('Investor not found');
        navigate('/investors');
      })
      .finally(() => setLoading(false));
  };

  // Initial fetch for investor details
  useEffect(() => {
    if (user?.role === 'founder') {
      startupAPI.getMy()
        .then(({ data }) => {
          const list = data.startups ?? [];
          setMyStartups(list);
          if (list.length > 0) {
            setSelectedMatchStartupId(list[0]._id);
            fetchInvestorData(list[0]._id);
          } else {
            fetchInvestorData();
          }
        })
        .catch(() => {
          fetchInvestorData();
        });
    } else {
      fetchInvestorData();
    }
  }, [id, user]);

  // Refetch when selectedMatchStartupId changes (skip first render handled by startup list fetch)
  const isFirstMatchId = useRef(true);
  useEffect(() => {
    if (isFirstMatchId.current) {
      isFirstMatchId.current = false;
      return;
    }
    fetchInvestorData();
  }, [selectedMatchStartupId]);

  // Load connection and save status for founders
  useEffect(() => {
    if (user && id) {
      if (user.role === 'founder') {
        userAPI.savedInvestors()
          .then(({ data }) => {
            const isSaved = data.investors?.some((inv) => inv._id === id);
            setSaved(!!isSaved);
          })
          .catch(() => {});

        Promise.all([connectionAPI.sent(), connectionAPI.received()])
          .then(([sentRes, recRes]) => {
            const allConns = [
              ...(sentRes.data.connections ?? []),
              ...(recRes.data.connections ?? [])
            ];
            setConnections(allConns);
            const match = allConns.find(c =>
              (c.investor?._id === id || c.investor === id)
            );
            if (match) setConnectionStatus(match.status);
          })
          .catch(() => {});
      }
    }
  }, [id, user]);

  const handleSave = async () => {
    if (!user) { navigate('/login'); return; }
    try {
      const { data } = await userAPI.saveInvestor(id);
      setSaved(data.saved);
      toast.success(data.saved ? 'Saved investor to your list' : 'Removed investor from saved');
    } catch {
      toast.error('Failed to update save status');
    }
  };

  const handleOpenConnectModal = () => {
    if (myStartups.length === 0) {
      toast.error('You need to register a startup first to connect with investors.');
      return;
    }
    
    // Auto-select first available startup
    const isAlreadyRequestSent = (startupId) => {
      return connections.some(c => 
        (c.startup?._id === startupId || c.startup === startupId) &&
        ['pending', 'accepted'].includes(c.status)
      );
    };
    const available = myStartups.filter(s => !isAlreadyRequestSent(s._id));
    if (available.length > 0) {
      setSelectedStartupId(available[0]._id);
    } else {
      setSelectedStartupId('');
    }

    setShowConnectModal(true);
  };

  const handleConnectSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStartupId) {
      toast.error('Please select a startup first');
      return;
    }
    setSendingRequest(true);
    try {
      const { data } = await connectionAPI.inviteInvestor({
        investorId: id,
        startupId: selectedStartupId,
        message: connectMessage,
      });
      setConnections((prev) => [...prev, data.connection]);
      setConnectionStatus(data.connection.status);
      toast.success('Connection request sent to investor! 🎉');
      setShowConnectModal(false);
      setConnectMessage('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send connection request');
    } finally {
      setSendingRequest(false);
    }
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
      <div className="border border-[#2a2a2a] rounded-xl p-6 flex gap-4">
        <div className="skeleton w-16 h-16 rounded-full shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="skeleton w-40 h-4 rounded" />
          <div className="skeleton w-64 h-3 rounded" />
        </div>
      </div>
      <div className="border border-[#2a2a2a] rounded-xl p-6 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-3 rounded" style={{ width: `${80 - i * 10}%` }} />)}
      </div>
    </div>
  );

  if (!investor) return null;

  const isFounder = user?.role === 'founder';
  const availableForModal = myStartups.filter(s => {
    const isAlreadyRequestSent = connections.some(c => 
      (c.startup?._id === s._id || c.startup === s._id) &&
      (c.investor?._id === id || c.investor === id) &&
      ['pending', 'accepted'].includes(c.status)
    );
    return !isAlreadyRequestSent;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-20">
      
      {/* Top Header Card */}
      <div className="border border-[#2a2a2a] rounded-xl p-6 mb-5">
        <div className="flex gap-5 flex-wrap">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-[#00c853] flex items-center justify-center text-2xl font-black text-black shrink-0 overflow-hidden">
            {investor.avatar ? <img src={investor.avatar} alt="" className="w-full h-full object-cover" /> : investor.name[0]}
          </div>

          <div className="flex-1 min-w-60">
            <div className="flex flex-wrap gap-1.5 mb-2">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1e1e1e] text-[#888] font-medium">Investor</span>
              {investor.location && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1e1e1e] text-[#888] font-medium">
                  📍 {investor.location}
                </span>
              )}
              {investor.matchScore !== undefined && investor.matchScore !== null && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#00c853]/15 text-[#00c853] font-bold tracking-wide flex items-center gap-1 group relative cursor-help">
                  ✨ {investor.matchScore}% Match
                  <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-48 bg-[#161616] border border-[#2a2a2a] rounded-lg p-2 text-[9px] text-[#888] font-normal leading-relaxed shadow-xl z-50 text-center">
                    Calculated based on Sector, Stage, and Location match.
                  </span>
                </span>
              )}
            </div>

            <h1 className="text-xl font-black text-white mb-1">{investor.name}</h1>
            <p className="text-sm text-[#888] mb-4">{investor.bio || 'Investor on VentureConnect'}</p>

            <div className="flex flex-wrap gap-2">
              {isFounder && (
                <>
                  {connectionStatus === 'accepted' ? (
                    <button
                      onClick={() => navigate(`/messages?with=${investor._id}&name=${encodeURIComponent(investor.name)}`)}
                      className="btn-al px-4 py-2 text-xs rounded-md"
                    >
                      ✉ Message
                    </button>
                  ) : connectionStatus === 'pending' ? (
                    <button
                      disabled
                      className="btn-ghost border-[#2a2a2a] text-[#555] px-4 py-2 text-xs rounded-md cursor-not-allowed"
                    >
                      ⏳ Pending Response
                    </button>
                  ) : connectionStatus === 'rejected' ? (
                    <button
                      disabled
                      className="btn-ghost border-red-500/20 text-red-400 px-4 py-2 text-xs rounded-md cursor-not-allowed"
                    >
                      Declined
                    </button>
                  ) : (
                    <button onClick={handleOpenConnectModal} className="btn-al px-4 py-2 text-xs rounded-md">
                      🤝 Connect / Invite
                    </button>
                  )}

                  <button onClick={handleSave}
                    className={`btn-ghost px-4 py-2 text-xs rounded-md ${saved ? 'border-[#00c853]/40 text-[#00c853]' : ''}`}>
                    {saved ? '★ Saved' : '☆ Save'}
                  </button>
                </>
              )}

              {!isFounder && user?._id !== investor._id && (
                <button
                  onClick={() => navigate(`/messages?with=${investor._id}&name=${encodeURIComponent(investor.name)}`)}
                  className="btn-al px-4 py-2 text-xs rounded-md"
                >
                  ✉ Message
                </button>
              )}

              {investor.website && (
                <a href={investor.website} target="_blank" rel="noreferrer"
                  className="btn-ghost px-4 py-2 text-xs rounded-md">Website ↗</a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Match Score Selector (Founders only, when multiple startups exist) */}
      {isFounder && myStartups.length > 1 && (
        <div className="flex items-center gap-2 mb-5 bg-[#161616]/40 border border-[#2a2a2a] rounded-xl px-4 py-2.5 w-fit">
          <span className="text-xs text-[#888] font-semibold">Recalculate match score against:</span>
          <select
            value={selectedMatchStartupId}
            onChange={(e) => setSelectedMatchStartupId(e.target.value)}
            className="bg-[#161616] border border-[#2a2a2a] text-xs text-[#00c853] font-bold rounded px-2.5 py-1 focus:outline-none"
          >
            {myStartups.map((s) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Body Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Main Column */}
        <div className="md:col-span-2 space-y-5">
          <Section title="Biography">
            <p className="text-sm text-[#aaa] leading-relaxed whitespace-pre-line">
              {investor.bio || 'This investor has not provided a biography yet.'}
            </p>
          </Section>

          {investor.investorPreferences && (
            <Section title="Investment Preferences">
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-[#666] mb-2 uppercase tracking-wide">Preferred Sectors</h4>
                  {investor.investorPreferences.sectors?.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {investor.investorPreferences.sectors.map((s) => (
                        <span key={s} className="text-xs px-2.5 py-1 rounded bg-[#1e1e1e] border border-[#2a2a2a] text-[#888]">
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#555] italic">No sector preferences specified.</p>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-bold text-[#666] mb-2 uppercase tracking-wide">Preferred Stages</h4>
                  {investor.investorPreferences.stages?.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {investor.investorPreferences.stages.map((s) => (
                        <span key={s} className="text-xs px-2.5 py-1 rounded bg-[#1e1e1e] border border-[#2a2a2a] text-[#888]">
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#555] italic">No stage preferences specified.</p>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-bold text-[#666] mb-2 uppercase tracking-wide">Preferred Locations</h4>
                  {investor.investorPreferences.locations?.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {investor.investorPreferences.locations.map((l) => (
                        <span key={l} className="text-xs px-2.5 py-1 rounded bg-[#1e1e1e] border border-[#2a2a2a] text-[#888]">
                          {l}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#555] italic">No location preferences specified.</p>
                  )}
                </div>
              </div>
            </Section>
          )}
        </div>

        {/* Sidebar Column */}
        <div className="space-y-5">
          <Section title="Contact Information">
            <div className="space-y-3.5">
              {investor.website && (
                <div>
                  <p className="text-[10px] text-[#555] mb-0.5">Website</p>
                  <a href={investor.website} target="_blank" rel="noreferrer" className="text-xs text-[#00c853] hover:underline font-medium break-all">
                    {investor.website}
                  </a>
                </div>
              )}
              {investor.linkedin && (
                <div>
                  <p className="text-[10px] text-[#555] mb-0.5">LinkedIn Profile</p>
                  <a href={investor.linkedin} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline font-medium break-all">
                    {investor.linkedin}
                  </a>
                </div>
              )}
              {investor.location && (
                <div>
                  <p className="text-[10px] text-[#555] mb-0.5">Base Location</p>
                  <p className="text-xs text-white font-semibold">{investor.location}</p>
                </div>
              )}
              {!investor.website && !investor.linkedin && !investor.location && (
                <p className="text-xs text-[#555] italic">No contact information shared.</p>
              )}
            </div>
          </Section>
        </div>
      </div>

      {/* Invite Investor Modal */}
      <AnimatePresence>
        {showConnectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowConnectModal(false)}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6 w-full max-w-md"
            >
              <h2 className="text-base font-black text-white mb-1">Invite {investor.name}</h2>
              <p className="text-xs text-[#888] mb-5">
                Send a connection request to this investor targeting one of your startups.
              </p>

              {availableForModal.length === 0 ? (
                <div className="space-y-4">
                  <p className="text-xs text-amber-500/80 bg-amber-500/5 border border-amber-500/10 rounded-lg p-3 leading-relaxed text-center">
                    ⚠️ You have already sent connection requests or connected all of your startups with this investor.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowConnectModal(false)}
                    className="w-full btn-ghost py-2 text-xs rounded-md"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleConnectSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#888] mb-1.5">Target Startup *</label>
                    <select
                      value={selectedStartupId}
                      onChange={(e) => setSelectedStartupId(e.target.value)}
                      className="al-input bg-[#161616] w-full"
                      required
                    >
                      {availableForModal.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name} ({s.stage})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#888] mb-1.5">Personal Message (Optional)</label>
                    <textarea
                      rows={4}
                      value={connectMessage}
                      onChange={(e) => setConnectMessage(e.target.value)}
                      placeholder="Introduce your startup and explain why you want to connect with them."
                      className="al-input w-full resize-none"
                      maxLength={500}
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setShowConnectModal(false)}
                      className="btn-ghost px-4 py-2 text-xs rounded-md"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={sendingRequest}
                      className="btn-al px-5 py-2 text-xs rounded-md"
                    >
                      {sendingRequest ? 'Sending...' : 'Send Invite'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
