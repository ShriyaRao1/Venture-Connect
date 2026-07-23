import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { startupAPI, connectionAPI, userAPI } from '../api/api';
import Sidebar from '../components/Sidebar';
import StartupCard from '../components/StartupCard';
import InvestorCard from '../components/InvestorCard';
import { StartupCardSkeleton, InvestorCardSkeleton } from '../components/Skeletons';

const STATUS_PILL = {
  pending:  'pill-amber',
  accepted: 'pill-green',
  rejected: 'pill-red',
  withdrawn:'pill-gray',
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [searchParams] = useSearchParams();

  // ── Admin: redirect straight to /admin ───────────────────
  useEffect(() => {
    if (user?.role === 'admin') navigate('/admin', { replace: true });
  }, [user, navigate]);

  const [myStartups,    setMyStartups]    = useState([]);
  const [savedStartups, setSavedStartups] = useState([]);
  const [savedInvestors, setSavedInvestors] = useState([]);
  const [savedInvestorIds, setSavedInvestorIds] = useState(new Set());
  const [allStartups,   setAllStartups]   = useState([]);  // investor Browse tab
  const [allInvestors,  setAllInvestors]  = useState([]);  // founder Browse tab
  const [connections,   setConnections]   = useState([]);  // combined list for stats
  const [sentConnections, setSentConnections] = useState([]);
  const [receivedConnections, setReceivedConnections] = useState([]);
  
  const [loading,       setLoading]       = useState(true);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [tab, setTab] = useState(() => {
    const t = searchParams.get('tab');
    return ['startups', 'connections', 'browse', 'saved'].includes(t) ? t : 'overview';
  });

  // Modal states for connection request (founder inviting investor)
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [targetInvestor, setTargetInvestor] = useState(null);
  const [selectedStartupId, setSelectedStartupId] = useState('');
  const [connectMessage, setConnectMessage] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);

  // Sync tab from URL
  useEffect(() => {
    const t = searchParams.get('tab');
    if (['startups', 'connections', 'browse', 'saved'].includes(t)) setTab(t);
    else if (!t) setTab('overview');
  }, [searchParams]);

  // Load personal data
  useEffect(() => {
    if (user?.role === 'admin') return; // admin is redirected
    const startupReq = user.role === 'founder'
      ? startupAPI.getMy()
      : Promise.resolve({ data: { startups: [] } });
      
    const savedReq = user.role === 'founder'
      ? userAPI.savedInvestors()
      : userAPI.saved();
      
    const sentConnReq = connectionAPI.sent();
    const recConnReq = connectionAPI.received();

    Promise.all([startupReq, savedReq, sentConnReq, recConnReq])
      .then(([s, saved, sentRes, recRes]) => {
        setMyStartups(s.data.startups ?? []);
        
        if (user.role === 'founder') {
          setSavedInvestors(saved.data.investors ?? []);
          setSavedInvestorIds(new Set(saved.data.investors?.map(inv => inv._id) ?? []));
        } else {
          setSavedStartups(saved.data.startups ?? []);
        }
        
        const sent = sentRes.data.connections ?? [];
        const received = recRes.data.connections ?? [];
        
        setSentConnections(sent);
        setReceivedConnections(received);
        setConnections([...sent, ...received]);
      })
      .catch(() => toast.error('Failed to load dashboard data'))
      .finally(() => setLoading(false));
  }, [user]);

  // Load browse data when Browse tab opens (investors see startups, founders see investors)
  useEffect(() => {
    if (tab !== 'browse') return;
    if (user.role === 'investor') {
      if (allStartups.length > 0) return;
      setBrowseLoading(true);
      startupAPI.getAll()
        .then((r) => setAllStartups(r.data.startups ?? []))
        .catch(() => toast.error('Failed to load startups'))
        .finally(() => setBrowseLoading(false));
    } else {
      if (allInvestors.length > 0) return;
      setBrowseLoading(true);
      userAPI.investors()
        .then((r) => setAllInvestors(r.data.investors ?? []))
        .catch(() => toast.error('Failed to load investors'))
        .finally(() => setBrowseLoading(false));
    }
  }, [tab, user.role, allStartups.length, allInvestors.length]);

  const handleRespond = async (id, status) => {
    try {
      await connectionAPI.respond(id, status);
      setConnections((prev) => prev.map((c) => c._id === id ? { ...c, status } : c));
      setReceivedConnections((prev) => prev.map((c) => c._id === id ? { ...c, status } : c));
      toast.success(status === 'accepted' ? '✅ Connection accepted!' : 'Connection declined');
    } catch {
      toast.error('Action failed');
    }
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

      if (data.saved) {
        const investor = allInvestors.find(inv => inv._id === investorId);
        if (investor) {
          setSavedInvestors(prev => [investor, ...prev]);
        } else {
          userAPI.savedInvestors().then(({ data }) => setSavedInvestors(data.investors ?? []));
        }
      } else {
        setSavedInvestors(prev => prev.filter(inv => inv._id !== investorId));
      }
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
    
    // Auto-select first available startup
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
      setSentConnections((prev) => [data.connection, ...prev]);
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

  const pending  = receivedConnections.filter((c) => c.status === 'pending').length;
  const accepted = connections.filter((c) => c.status === 'accepted').length;

  const activeList = connections.filter((c) => c.status === 'accepted');
  const pendingReceived = receivedConnections.filter((c) => c.status === 'pending');
  const pendingSent = sentConnections.filter((c) => c.status === 'pending');

  const TABS = [
    { id: 'overview',    label: 'Overview'   },
    { id: 'connections', label: `Connections${pending > 0 ? ` (${pending})` : ''}` },
    user.role === 'founder'
      ? { id: 'startups', label: 'My Startups' }
      : null,
    user.role === 'founder'
      ? { id: 'saved', label: `★ Saved Investors${savedInvestors.length > 0 ? ` (${savedInvestors.length})` : ''}` }
      : { id: 'saved', label: `★ Saved Startups${savedStartups.length > 0 ? ` (${savedStartups.length})` : ''}` },
    {
      id:    'browse',
      label: user.role === 'investor' ? '🔍 Browse Startups' : '🔍 Browse Investors',
    },
  ].filter(Boolean);

  const Spinner = () => (
    <div className="flex items-center justify-center py-20">
      <div className="w-7 h-7 rounded-full border-2 border-[#2a2a2a] border-t-[#00c853] spin" />
    </div>
  );

  // Don't render dashboard content for admin (they're being redirected)
  if (user?.role === 'admin') return null;

  const availableForModal = getModalAvailableStartups();

  return (
    <div className="flex min-h-[calc(100vh-56px)]">
      <Sidebar />

      <main className="flex-1 px-5 sm:px-8 py-7 overflow-y-auto max-w-6xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-7 flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-black text-white">
              Hi, {user.name.split(' ')[0]} 👋
            </h1>
            <p className="text-xs text-[#555] mt-0.5">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          {user.role === 'founder' && (
            <Link to="/startups/new" className="btn-al px-4 py-2 text-xs rounded-md">
              + New Startup
            </Link>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 mb-6 border-b border-[#2a2a2a]">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-xs font-semibold transition-colors border-b-2 -mb-[1px] ${
                tab === t.id
                  ? 'border-[#00c853] text-white'
                  : 'border-transparent text-[#555] hover:text-[#aaa]'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Overview ─────────────────────── */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* Stat tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                user.role === 'founder'
                  ? { label: 'My Startups', value: loading ? '—' : myStartups.length, icon: '🚀' }
                  : null,
                user.role === 'founder'
                  ? { label: 'Saved Investors', value: loading ? '—' : savedInvestors.length, icon: '★' }
                  : { label: 'Saved Startups', value: loading ? '—' : savedStartups.length, icon: '★' },
                { label: 'Connections', value: loading ? '—' : connections.length, icon: '🤝' },
                { label: 'Pending Requests', value: loading ? '—' : pending,            icon: '⏳' },
                { label: 'Accepted Connections', value: loading ? '—' : accepted,           icon: '✅' },
              ].filter(Boolean).map(({ label, value, icon }, i) => (
                <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4">
                  <div className="text-xl mb-2">{icon}</div>
                  <div className="text-2xl font-black text-white">{value}</div>
                  <div className="text-[11px] text-[#555] mt-0.5">{label}</div>
                </motion.div>
              ))}
            </div>

            {/* Quick connections preview */}
            {connections.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-bold text-[#555] uppercase tracking-widest">Recent Activity</h2>
                  <button onClick={() => setTab('connections')} className="text-xs text-[#00c853] hover:underline">View all →</button>
                </div>
                <div className="space-y-2">
                  {connections.slice(0, 3).map((c) => {
                    const isReceived = receivedConnections.some(rc => rc._id === c._id);
                    const partner = user.role === 'founder' 
                      ? c.investor 
                      : (isReceived ? c.startup?.founder : c.startup);
                    return (
                      <div key={c._id} className="flex items-center gap-3 bg-[#161616] border border-[#2a2a2a] rounded-lg px-4 py-3">
                        <div className="w-7 h-7 rounded-full bg-[#00c853] flex items-center justify-center text-black font-bold text-xs shrink-0">
                          {(partner?.name?.[0] || '?').toUpperCase()}
                        </div>
                        <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <span className="text-sm text-white">{partner?.name || '—'}</span>
                          <span className="text-[10px] text-[#555]">
                            {isReceived ? 'Received' : 'Sent'} · {c.startup?.name ? `Startup: ${c.startup.name}` : ''}
                          </span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${STATUS_PILL[c.status]}`}>{c.status}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick startups preview for founder */}
            {user.role === 'founder' && myStartups.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-bold text-[#555] uppercase tracking-widest">Your Startups</h2>
                  <button onClick={() => setTab('startups')} className="text-xs text-[#00c853] hover:underline">View all →</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myStartups.slice(0, 3).map((s, i) => <StartupCard key={s._id} startup={s} delay={i} />)}
                </div>
              </div>
            )}

            {/* CTA card — role specific */}
            {user.role === 'investor' ? (
              <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6 flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-sm font-bold text-white mb-1">Discover Startups</p>
                  <p className="text-xs text-[#555]">Browse curated startups across all sectors and stages.</p>
                </div>
                <button onClick={() => setTab('browse')} className="btn-al px-5 py-2 text-xs rounded-md shrink-0">
                  Browse Startups →
                </button>
              </div>
            ) : (
              <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6 flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-sm font-bold text-white mb-1">Find Investors</p>
                  <p className="text-xs text-[#555]">Browse active angels and VCs looking for startups to back.</p>
                </div>
                <button onClick={() => setTab('browse')} className="btn-al px-5 py-2 text-xs rounded-md shrink-0">
                  Browse Investors →
                </button>
              </div>
            )}

            {/* Empty state */}
            {!loading && connections.length === 0 && myStartups.length === 0 && (
              <div className="text-center py-16 border border-[#2a2a2a] rounded-xl">
                <p className="text-2xl mb-2">👋</p>
                <p className="text-sm text-white font-semibold mb-1">Welcome to your dashboard!</p>
                <p className="text-xs text-[#555] mb-4">
                  {user.role === 'founder'
                    ? 'Create your startup profile and find investors to back you.'
                    : 'Browse startups and express your interest to connect.'}
                </p>
                {user.role === 'founder' ? (
                  <div className="flex gap-3 justify-center flex-wrap">
                    <Link to="/startups/new" className="btn-al px-5 py-2 text-xs rounded-md">Create Startup →</Link>
                    <button onClick={() => setTab('browse')} className="btn-ghost px-5 py-2 text-xs rounded-md">Browse Investors →</button>
                  </div>
                ) : (
                  <button onClick={() => setTab('browse')} className="btn-al px-5 py-2 text-xs rounded-md">Browse Startups →</button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Connections ───────────────────── */}
        {tab === 'connections' && (
          <div className="space-y-8">
            {/* 1. Active Connections Section */}
            <div>
              <h2 className="text-xs font-bold text-[#555] uppercase tracking-widest mb-4">Active Connections ({activeList.length})</h2>
              {loading ? (
                <Spinner />
              ) : activeList.length === 0 ? (
                <div className="text-center py-12 border border-[#2a2a2a] border-dashed rounded-xl bg-[#111]/20">
                  <p className="text-[#555] text-xs">No active connections yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeList.map((c) => {
                    const isReceived = receivedConnections.some(rc => rc._id === c._id);
                    const partner = user.role === 'founder' 
                      ? c.investor 
                      : (isReceived ? c.startup?.founder : c.startup);
                    
                    return (
                      <motion.div key={c._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5 flex flex-col justify-between gap-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex gap-3">
                            {user.role === 'founder' ? (
                              <div className="w-10 h-10 rounded-full bg-[#00c853] flex items-center justify-center font-black text-black text-sm shrink-0">
                                {(partner?.name?.[0] || '?').toUpperCase()}
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-[#2a2a2a] flex items-center justify-center font-black text-white text-sm shrink-0 overflow-hidden">
                                {c.startup?.logo ? <img src={c.startup.logo} alt="" className="w-full h-full object-cover" /> : (c.startup?.name?.[0] || '?').toUpperCase()}
                              </div>
                            )}
                            <div>
                              <h3 className="text-sm font-bold text-white">
                                {user.role === 'founder' ? partner?.name : c.startup?.name}
                              </h3>
                              {user.role === 'founder' ? (
                                <p className="text-[10px] text-[#555] mt-0.5">
                                  {partner?.investorType ? `💼 ${partner.investorType}` : 'Investor'} · {partner?.location ? `📍 ${partner.location}` : ''}
                                </p>
                              ) : (
                                <p className="text-[10px] text-[#555] mt-0.5">
                                  Category: {c.startup?.category} · Stage: {c.startup?.stage}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-[#00c853]/15 text-[#00c853]">
                            Connected
                          </span>
                        </div>
                        <div className="text-xs text-[#888]">
                          {user.role === 'founder' ? (
                            <div className="flex items-center gap-1.5 mt-1">
                              <span>Connected on Startup:</span>
                              <span className="px-1.5 py-0.5 rounded bg-[#1e1e1e] border border-[#2a2a2a] text-[#00c853] font-semibold">
                                {c.startup?.name}
                              </span>
                            </div>
                          ) : (
                            partner && (
                              <p className="text-[11px]">
                                Founder: <span className="text-white font-semibold">{partner.name}</span>
                              </p>
                            )
                          )}
                        </div>
                        <div className="flex gap-2 justify-end mt-auto pt-2 border-t border-[#2a2a2a]/40">
                          {user.role === 'founder' && partner && (
                            <button
                              onClick={() => navigate(`/messages?with=${partner._id}&name=${encodeURIComponent(partner.name)}`)}
                              className="text-xs px-4 py-1.5 rounded-md bg-[#00c853] text-black font-semibold hover:bg-[#00b047] transition-colors">
                              ✉ Message Investor
                            </button>
                          )}
                          {user.role === 'investor' && partner && (
                            <button
                              onClick={() => navigate(`/messages?with=${partner._id}&name=${encodeURIComponent(partner.name)}`)}
                              className="text-xs px-4 py-1.5 rounded-md bg-[#00c853] text-black font-semibold hover:bg-[#00b047] transition-colors">
                              ✉ Message Founder
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Received Pending Requests Section */}
            <div>
              <h2 className="text-xs font-bold text-[#555] uppercase tracking-widest mb-4">Received Invites (Pending)</h2>
              {loading ? (
                <Spinner />
              ) : pendingReceived.length === 0 ? (
                <div className="text-center py-12 border border-[#2a2a2a] border-dashed rounded-xl">
                  <p className="text-[#555] text-xs">No pending received invites.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingReceived.map((c) => {
                    if (user.role === 'founder') {
                      const inv = c.investor;
                      return (
                        <motion.div key={c._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                          className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5 flex flex-col justify-between gap-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex gap-3">
                              <div className="w-10 h-10 rounded-full bg-[#00c853] flex items-center justify-center font-black text-black text-sm shrink-0">
                                {(inv?.name?.[0] || '?').toUpperCase()}
                              </div>
                              <div>
                                <h3 className="text-sm font-bold text-white">{inv?.name || 'Unknown Investor'}</h3>
                                {inv?.location && <p className="text-[10px] text-[#555] mt-0.5">📍 {inv.location}</p>}
                              </div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded font-semibold pill-amber">
                              {c.status}
                            </span>
                          </div>
                          <div className="space-y-2 text-xs">
                            {inv?.bio && <p className="text-[#888] line-clamp-2 leading-relaxed">{inv.bio}</p>}
                            {c.startup && (
                              <div className="flex items-center gap-1.5 mt-2">
                                <span className="text-[10px] text-[#555]">Interested in:</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1e1e1e] border border-[#2a2a2a] text-[#00c853] font-semibold">
                                  {c.startup.name}
                                </span>
                              </div>
                            )}
                            {c.investmentRange && (c.investmentRange.min > 0 || c.investmentRange.max > 0) && (
                              <p className="text-white font-semibold mt-1">
                                Offer Range: <span className="text-[#00c853]">₹{(c.investmentRange.min/100000).toFixed(1)}L - ₹{(c.investmentRange.max/100000).toFixed(1)}L</span>
                              </p>
                            )}
                            {c.message && (
                              <div className="bg-[#0c0c0c] border border-[#2a2a2a] rounded-lg p-2.5 mt-2 text-[#aaa] italic">
                                "{c.message}"
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 justify-end mt-auto pt-2 border-t border-[#2a2a2a]/40">
                            {inv?.linkedin && (
                              <a href={inv.linkedin} target="_blank" rel="noreferrer" className="text-[10px] text-blue-400 hover:underline pt-2 mr-auto">
                                LinkedIn ↗
                              </a>
                            )}
                            <button onClick={() => handleRespond(c._id, 'accepted')}
                              className="text-xs px-3.5 py-1.5 rounded-md bg-[#00c853]/15 text-[#00c853] hover:bg-[#00c853]/25 font-semibold transition-colors">
                              Accept
                            </button>
                            <button onClick={() => handleRespond(c._id, 'rejected')}
                              className="text-xs px-3.5 py-1.5 rounded-md bg-red-500/15 text-red-400 hover:bg-red-500/25 font-semibold transition-colors">
                              Decline
                            </button>
                          </div>
                        </motion.div>
                      );
                    } else {
                      const startup = c.startup;
                      const founder = startup?.founder;
                      return (
                        <motion.div key={c._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                          className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5 flex flex-col justify-between gap-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex gap-3">
                              <div className="w-10 h-10 rounded-lg bg-[#2a2a2a] flex items-center justify-center font-black text-white text-sm shrink-0 overflow-hidden">
                                {startup?.logo ? <img src={startup.logo} alt="" className="w-full h-full object-cover" /> : (startup?.name?.[0] || '?').toUpperCase()}
                              </div>
                              <div>
                                <Link to={`/startups/${startup?._id}`} className="text-sm font-bold text-white hover:text-[#00c853] transition-colors">
                                  {startup?.name || 'Unknown Startup'}
                                </Link>
                                <div className="flex gap-1.5 mt-1">
                                  {startup?.category && <span className="text-[9px] px-1 py-0.2 bg-[#1e1e1e] text-[#888] rounded">{startup.category}</span>}
                                  {startup?.stage && <span className="text-[9px] px-1 py-0.2 bg-[#1e1e1e] text-[#888] rounded">{startup.stage}</span>}
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded font-semibold pill-amber">
                              {c.status}
                            </span>
                          </div>
                          <div className="space-y-2 text-xs">
                            {startup?.tagline && <p className="text-[#888] line-clamp-2 leading-relaxed">{startup.tagline}</p>}
                            {founder && (
                              <p className="text-[11px] text-[#555]">
                                Founder: <span className="text-white font-semibold">{founder.name}</span>
                              </p>
                            )}
                            {c.message && (
                              <div className="bg-[#0c0c0c] border border-[#2a2a2a] rounded-lg p-2.5 mt-2 text-[#aaa] italic">
                                "{c.message}"
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 justify-end mt-auto pt-2 border-t border-[#2a2a2a]/40">
                            <button onClick={() => handleRespond(c._id, 'accepted')}
                              className="text-xs px-3.5 py-1.5 rounded-md bg-[#00c853]/15 text-[#00c853] hover:bg-[#00c853]/25 font-semibold transition-colors">
                              Accept
                            </button>
                            <button onClick={() => handleRespond(c._id, 'rejected')}
                              className="text-xs px-3.5 py-1.5 rounded-md bg-red-500/15 text-red-400 hover:bg-red-500/25 font-semibold transition-colors">
                              Decline
                            </button>
                          </div>
                        </motion.div>
                      );
                    }
                  })}
                </div>
              )}
            </div>

            {/* 3. Sent Pending Requests Section */}
            <div>
              <h2 className="text-xs font-bold text-[#555] uppercase tracking-widest mb-4">Sent Invites (Pending)</h2>
              {loading ? (
                <Spinner />
              ) : pendingSent.length === 0 ? (
                <div className="text-center py-12 border border-[#2a2a2a] border-dashed rounded-xl">
                  <p className="text-[#555] text-xs">No pending sent invites.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingSent.map((c) => {
                    if (user.role === 'investor') {
                      const startup = c.startup;
                      const founder = startup?.founder;
                      return (
                        <motion.div key={c._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                          className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5 flex flex-col justify-between gap-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex gap-3">
                              <div className="w-10 h-10 rounded-lg bg-[#2a2a2a] flex items-center justify-center font-black text-white text-sm shrink-0 overflow-hidden">
                                {startup?.logo ? <img src={startup.logo} alt="" className="w-full h-full object-cover" /> : (startup?.name?.[0] || '?').toUpperCase()}
                              </div>
                              <div>
                                <Link to={`/startups/${startup?._id}`} className="text-sm font-bold text-white hover:text-[#00c853] transition-colors">
                                  {startup?.name || 'Unknown Startup'}
                                </Link>
                                <div className="flex gap-1.5 mt-1">
                                  {startup?.category && <span className="text-[9px] px-1 py-0.2 bg-[#1e1e1e] text-[#888] rounded">{startup.category}</span>}
                                  {startup?.stage && <span className="text-[9px] px-1 py-0.2 bg-[#1e1e1e] text-[#888] rounded">{startup.stage}</span>}
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded font-semibold pill-amber">
                              {c.status}
                            </span>
                          </div>
                          <div className="space-y-2 text-xs">
                            {startup?.tagline && <p className="text-[#888] line-clamp-2 leading-relaxed">{startup.tagline}</p>}
                            {c.investmentRange && (c.investmentRange.min > 0 || c.investmentRange.max > 0) && (
                              <p className="text-white font-semibold mt-1">
                                Offer Range: <span className="text-[#00c853]">₹{(c.investmentRange.min/100000).toFixed(1)}L - ₹{(c.investmentRange.max/100000).toFixed(1)}L</span>
                              </p>
                            )}
                            {c.message && (
                              <div className="bg-[#0c0c0c] border border-[#2a2a2a] rounded-lg p-2.5 mt-2 text-[#aaa] italic">
                                "{c.message}"
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 justify-end mt-auto pt-2 border-t border-[#2a2a2a]/40">
                            {founder && (
                              <span className="text-[10px] text-[#555] pt-2 mr-auto truncate max-w-[150px]">
                                Founder: {founder.name}
                              </span>
                            )}
                            <Link to={`/startups/${startup?._id}`} className="text-xs px-3 py-1.5 rounded-md border border-[#2a2a2a] text-[#888] hover:text-white transition-colors">
                              Details
                            </Link>
                          </div>
                        </motion.div>
                      );
                    } else {
                      const inv = c.investor;
                      return (
                        <motion.div key={c._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                          className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5 flex flex-col justify-between gap-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex gap-3">
                              <div className="w-10 h-10 rounded-full bg-[#00c853] flex items-center justify-center font-black text-black text-sm shrink-0">
                                {(inv?.name?.[0] || '?').toUpperCase()}
                              </div>
                              <div>
                                <h3 className="text-sm font-bold text-white">{inv?.name || 'Unknown Investor'}</h3>
                                {inv?.location && <p className="text-[10px] text-[#555] mt-0.5">📍 {inv.location}</p>}
                              </div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded font-semibold pill-amber">
                              {c.status}
                            </span>
                          </div>
                          <div className="space-y-2 text-xs">
                            {inv?.bio && <p className="text-[#888] line-clamp-2 leading-relaxed">{inv.bio}</p>}
                            {c.startup && (
                              <div className="flex items-center gap-1.5 mt-2">
                                <span className="text-[10px] text-[#555]">On behalf of:</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1e1e1e] border border-[#2a2a2a] text-[#00c853] font-semibold">
                                  {c.startup.name}
                                </span>
                              </div>
                            )}
                            {c.message && (
                              <div className="bg-[#0c0c0c] border border-[#2a2a2a] rounded-lg p-2.5 mt-2 text-[#aaa] italic">
                                "{c.message}"
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 justify-end mt-auto pt-2 border-t border-[#2a2a2a]/40">
                            {inv?.linkedin && (
                              <a href={inv.linkedin} target="_blank" rel="noreferrer" className="text-[10px] text-blue-400 hover:underline pt-2 mr-auto">
                                LinkedIn ↗
                              </a>
                            )}
                          </div>
                        </motion.div>
                      );
                    }
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── My Startups (founder only) ────── */}
        {tab === 'startups' && user.role === 'founder' && (
          loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => <StartupCardSkeleton key={i} />)}
            </div>
          ) : myStartups.length === 0 ? (
            <div className="text-center py-16 border border-[#2a2a2a] rounded-xl">
              <p className="text-[#555] text-sm mb-3">No startups yet.</p>
              <Link to="/startups/new" className="btn-al px-5 py-2 text-xs rounded-md">Create your first startup →</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myStartups.map((s, i) => <StartupCard key={s._id} startup={s} delay={i} />)}
            </div>
          )
        )}
        
        {/* ── Saved Items (Investors see saved Startups, Founders see saved Investors) ── */}
        {tab === 'saved' && (
          loading ? (
            user.role === 'founder' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => <InvestorCardSkeleton key={i} />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => <StartupCardSkeleton key={i} />)}
              </div>
            )
          ) : user.role === 'founder' ? (
            savedInvestors.length === 0 ? (
              <div className="text-center py-16 border border-[#2a2a2a] rounded-xl">
                <p className="text-[#555] text-sm">No saved investors yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {savedInvestors.map((inv, i) => (
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
            )
          ) : savedStartups.length === 0 ? (
            <div className="text-center py-16 border border-[#2a2a2a] rounded-xl">
              <p className="text-[#555] text-sm">No saved startups yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedStartups.map((s, i) => <StartupCard key={s._id} startup={s} delay={i} />)}
            </div>
          )
        )}

        {/* ── Browse — Investors see Startups, Founders see Investors ── */}
        {tab === 'browse' && (
          <div>
            {user.role === 'investor' ? (
              /* ── Investor: browse startups ── */
              <>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-sm font-black text-white">All Startups</h2>
                    <p className="text-xs text-[#555] mt-0.5">
                      {browseLoading ? 'Loading…' : `${allStartups.length} startups listed`}
                    </p>
                  </div>
                  <Link to="/startups" className="text-xs text-[#00c853] hover:underline">Full explore page →</Link>
                </div>
                {browseLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => <StartupCardSkeleton key={i} />)}
                  </div>
                ) : allStartups.length === 0 ? (
                  <div className="text-center py-16 border border-[#2a2a2a] rounded-xl">
                    <p className="text-[#555] text-sm">No startups listed yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allStartups.map((s, i) => <StartupCard key={s._id} startup={s} delay={i} />)}
                  </div>
                )}
              </>
            ) : (
              /* ── Founder: browse investors ── */
              <>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-sm font-black text-white">Investor Network</h2>
                    <p className="text-xs text-[#555] mt-0.5">
                      {browseLoading ? 'Loading…' : `${allInvestors.length} investors on VentureConnect`}
                    </p>
                  </div>
                  <Link to="/investors" className="text-xs text-[#00c853] hover:underline">Full network page →</Link>
                </div>
                {browseLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {Array.from({ length: 10 }).map((_, i) => <InvestorCardSkeleton key={i} />)}
                  </div>
                ) : allInvestors.length === 0 ? (
                  <div className="text-center py-16 border border-[#2a2a2a] rounded-xl">
                    <p className="text-[#555] text-sm">No investors listed yet.</p>
                    <p className="text-xs text-[#444] mt-1">Invite investors to join VentureConnect.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {allInvestors.map((inv, i) => (
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
              </>
            )}
          </div>
        )}

      </main>

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
