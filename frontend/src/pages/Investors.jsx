import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { userAPI, connectionAPI, startupAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { InvestorCardSkeleton } from '../components/Skeletons';
import InvestorCard from '../components/InvestorCard';

const CATEGORIES = ['All', 'FinTech', 'HealthTech', 'EdTech', 'SaaS', 'E-Commerce', 'AI/ML', 'GreenTech', 'Logistics', 'Social', 'Other'];
const STAGES    = ['All', 'Idea', 'MVP', 'Early Traction', 'Growth', 'Scaling'];

export default function Investors() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [investors, setInvestors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savedInvestorIds, setSavedInvestorIds] = useState(new Set());
  const [connections, setConnections] = useState([]);
  const [myStartups, setMyStartups] = useState([]);

  // Search & Filter states
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('All');
  const [stage, setStage] = useState('All');
  const [investorType, setInvestorType] = useState('All');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  // Match score context startup select
  const [selectedMatchStartupId, setSelectedMatchStartupId] = useState('');

  // Modal states for connection request
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [targetInvestor, setTargetInvestor] = useState(null);
  const [selectedStartupId, setSelectedStartupId] = useState('');
  const [connectMessage, setConnectMessage] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);

  // Load founder startups on mount
  useEffect(() => {
    if (user?.role === 'founder') {
      startupAPI.getMy()
        .then(({ data }) => {
          const list = data.startups ?? [];
          setMyStartups(list);
          if (list.length > 0) {
            setSelectedMatchStartupId(list[0]._id);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  // Load list when filters, search, or match startup changes
  const fetchInvestors = async (overrides = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 12, ...overrides };
      if (search) params.search = search;
      if (location) params.location = location;
      if (category !== 'All') params.category = category;
      if (stage !== 'All') params.stage = stage;
      const typeFilter = overrides.investorType !== undefined ? overrides.investorType : investorType;
      if (typeFilter !== 'All') params.investorType = typeFilter;
      
      // If founder, pass selected match startup
      if (user?.role === 'founder') {
        const matchStartupId = overrides.startupId || selectedMatchStartupId;
        if (matchStartupId) {
          params.startupId = matchStartupId;
        }
      }

      const { data } = await userAPI.investors(params);
      setInvestors(data.investors ?? []);
      setPagination(data.pagination || {});
    } catch (err) {
      setError('Failed to load investor network. Please try again.');
      toast.error('Failed to load investor network');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestors();
  }, [page, category, stage, investorType, selectedMatchStartupId]);

  // Load static saved status and connections for founders
  useEffect(() => {
    if (user?.role === 'founder') {
      userAPI.savedInvestors()
        .then(({ data }) => {
          const ids = new Set(data.investors?.map(inv => inv._id) ?? []);
          setSavedInvestorIds(ids);
        })
        .catch((err) => {
          console.error(err);
          toast.error('Failed to sync saved investors');
        });
  
      Promise.all([connectionAPI.sent(), connectionAPI.received()])
        .then(([sentRes, recRes]) => {
          const allConns = [
            ...(sentRes.data.connections ?? []),
            ...(recRes.data.connections ?? [])
          ];
          setConnections(allConns);
        })
        .catch((err) => {
          console.error(err);
          toast.error('Failed to load connections');
        });
    }
  }, [user]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchInvestors({ page: 1 });
  };

  const handleToggleSave = async (investorId) => {
    try {
      const { data } = await userAPI.saveInvestor(investorId);
      setSavedInvestorIds((prev) => {
        const next = new Set(prev);
        if (data.saved) {
          next.add(investorId);
          toast.success('Investor saved to your list');
        } else {
          next.delete(investorId);
          toast.success('Investor removed from saved');
        }
        return next;
      });
    } catch {
      toast.error('Failed to update save status');
    }
  };

  const handleOpenConnectModal = (investor) => {
    if (myStartups.length === 0) {
      toast.error('You need to register at least one startup to connect with investors.');
      return;
    }
    setTargetInvestor(investor);
    
    // Auto-select first available startup for connection request
    const isAlreadyRequestSent = (startupId) => {
      return connections.some(c => 
        (c.startup?._id === startupId || c.startup === startupId) &&
        (c.investor?._id === investor._id || c.investor === investor._id) &&
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
        investorId: targetInvestor._id,
        startupId: selectedStartupId,
        message: connectMessage,
      });
      setConnections((prev) => [...prev, data.connection]);
      toast.success('Connection request sent to investor! 🎉');
      setShowConnectModal(false);
      setConnectMessage('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send connection request');
    } finally {
      setSendingRequest(false);
    }
  };

  const getConnectionStatusForInvestor = (investorId) => {
    const matches = connections.filter(c => 
      (c.investor?._id === investorId || c.investor === investorId)
    );
    if (matches.some(c => c.status === 'accepted')) return 'accepted';
    if (matches.some(c => c.status === 'pending')) return 'pending';
    if (matches.some(c => c.status === 'rejected')) return 'rejected';
    return null;
  };

  const getModalAvailableStartups = () => {
    if (!targetInvestor) return [];
    return myStartups.filter(s => {
      const isAlreadyRequestSent = connections.some(c => 
        (c.startup?._id === s._id || c.startup === s._id) &&
        (c.investor?._id === targetInvestor._id || c.investor === targetInvestor._id) &&
        ['pending', 'accepted'].includes(c.status)
      );
      return !isAlreadyRequestSent;
    });
  };

  const clearAllFilters = () => {
    setCategory('All');
    setStage('All');
    setInvestorType('All');
    setSearch('');
    setLocation('');
    setPage(1);
    fetchInvestors({ page: 1, category: 'All', stage: 'All', investorType: 'All', search: '', location: '' });
  };

  const FilterChip = ({ label, active, onClick }) => (
    <button onClick={onClick}
      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors border ${
        active
          ? 'bg-[#00c853]/10 border-[#00c853]/40 text-[#00c853]'
          : 'border-[#2a2a2a] text-[#555] hover:text-white hover:border-[#444]'
      }`}>
      {label}
    </button>
  );

  const availableForModal = getModalAvailableStartups();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      
      {/* Header and Search */}
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-black text-white">Investor Network</h1>
          <p className="text-sm text-[#555] mt-0.5">
            {loading ? '...' : `${pagination.total ?? 0}+ results`}
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 flex-wrap">
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or bio..."
            className="al-input w-48 py-2 text-xs" />
          <input value={location} onChange={(e) => setLocation(e.target.value)}
            placeholder="📍 Preferred location..."
            className="al-input w-36 py-2 text-xs" />
          <select value={investorType} onChange={(e) => { setInvestorType(e.target.value); setPage(1); }}
            className="al-input bg-[#161616] w-36 py-2 text-xs border border-[#2a2a2a] rounded focus:outline-none text-[#aaa]">
            <option value="All">All Investor Types</option>
            {['Angel', 'Venture Capital (VC)', 'Syndicate', 'Family Office', 'Corporate VC', 'Private Equity', 'Other'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button type="submit" className="btn-al px-4 py-2 text-xs rounded-md">Search</button>
        </form>
      </div>

      {/* Dynamic Match Score Selector (Founders only, when multiple startups exist) */}
      {user?.role === 'founder' && myStartups.length > 0 && (
        <div className="flex items-center gap-2 mb-6 bg-[#161616]/40 border border-[#2a2a2a] rounded-xl px-4 py-2.5 w-fit">
          <span className="text-xs text-[#888] font-semibold">Match score calculated against:</span>
          <select
            value={selectedMatchStartupId}
            onChange={(e) => {
              setSelectedMatchStartupId(e.target.value);
              setPage(1);
            }}
            className="bg-[#161616] border border-[#2a2a2a] text-xs text-[#00c853] font-bold rounded px-2.5 py-1 focus:outline-none focus:border-[#00c853]"
          >
            {myStartups.map((s) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-2">
        <span className="text-xs text-[#555] font-medium pt-0.5 mr-1">Sector Preference:</span>
        {CATEGORIES.map((c) => (
          <FilterChip key={c} label={c} active={category === c} onClick={() => { setCategory(c); setPage(1); }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mb-8">
        <span className="text-xs text-[#555] font-medium pt-0.5 mr-1">Stage Preference:</span>
        {STAGES.map((s) => (
          <FilterChip key={s} label={s} active={stage === s} onClick={() => { setStage(s); setPage(1); }} />
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => <InvestorCardSkeleton key={i} />)}
        </div>
      ) : error ? (
        <div className="text-center py-24 border border-[#2a2a2a] rounded-xl">
          <p className="text-red-500 text-sm">{error}</p>
          <button onClick={() => fetchInvestors()}
            className="mt-3 text-xs text-[#00c853] hover:underline">
            Retry loading
          </button>
        </div>
      ) : investors.length === 0 ? (
        <div className="text-center py-24 border border-[#2a2a2a] rounded-xl">
          <p className="text-[#555] text-sm">No investors match your filters.</p>
          <button onClick={clearAllFilters}
            className="mt-3 text-xs text-[#00c853] hover:underline">
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {investors.map((inv, i) => (
            <InvestorCard
              key={inv._id}
              inv={inv}
              isSaved={savedInvestorIds.has(inv._id)}
              onToggleSave={handleToggleSave}
              connectionStatus={getConnectionStatusForInvestor(inv._id)}
              onConnect={handleOpenConnectModal}
              delay={i}
              currentUser={user}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {(pagination.pages || 0) > 1 && (
        <div className="flex justify-center gap-1.5 mt-10">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-8 h-8 rounded text-xs font-semibold transition-all ${
                page === p
                  ? 'bg-[#00c853] text-black'
                  : 'bg-[#161616] border border-[#2a2a2a] text-[#888] hover:border-[#444] hover:text-white'
              }`}>
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Invite Investor Modal */}
      <AnimatePresence>
        {showConnectModal && targetInvestor && (
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
              <h2 className="text-base font-black text-white mb-1">Invite {targetInvestor.name}</h2>
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
