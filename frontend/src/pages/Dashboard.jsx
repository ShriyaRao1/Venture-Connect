import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { startupAPI, connectionAPI, userAPI } from '../api/api';
import Sidebar from '../components/Sidebar';
import StartupCard from '../components/StartupCard';
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
  const [allStartups,   setAllStartups]   = useState([]);  // investor Browse tab
  const [allInvestors,  setAllInvestors]  = useState([]);  // founder Browse tab
  const [connections,   setConnections]   = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [tab, setTab] = useState(() => {
    const t = searchParams.get('tab');
    return ['startups', 'connections', 'browse'].includes(t) ? t : 'overview';
  });

  // Sync tab from URL
  useEffect(() => {
    const t = searchParams.get('tab');
    if (['startups', 'connections', 'browse'].includes(t)) setTab(t);
    else if (!t) setTab('overview');
  }, [searchParams]);

  // Load personal data
  useEffect(() => {
    if (user?.role === 'admin') return; // admin is redirected
    const startupReq = user.role === 'founder'
      ? startupAPI.getMy()
      : userAPI.saved();
    const connReq = user.role === 'founder'
      ? connectionAPI.received()
      : connectionAPI.sent();

    Promise.all([startupReq, connReq])
      .then(([s, c]) => {
        setMyStartups(s.data.startups ?? []);
        setConnections(c.data.connections ?? []);
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
  }, [tab, user.role]);

  const handleRespond = async (id, status) => {
    try {
      await connectionAPI.respond(id, status);
      setConnections((prev) => prev.map((c) => c._id === id ? { ...c, status } : c));
      toast.success(status === 'accepted' ? '✅ Connection accepted!' : 'Connection declined');
    } catch { toast.error('Action failed'); }
  };

  const pending  = connections.filter((c) => c.status === 'pending').length;
  const accepted = connections.filter((c) => c.status === 'accepted').length;

  const TABS = [
    { id: 'overview',    label: 'Overview'   },
    { id: 'connections', label: `Connections${pending > 0 ? ` (${pending})` : ''}` },
    user.role === 'founder'
      ? { id: 'startups', label: 'My Startups' }
      : null,
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
                { label: user.role === 'founder' ? 'My Startups' : 'Saved Startups', value: loading ? '—' : myStartups.length, icon: '🚀' },
                { label: 'Connections', value: loading ? '—' : connections.length, icon: '🤝' },
                { label: 'Pending',     value: loading ? '—' : pending,            icon: '⏳' },
                { label: 'Accepted',    value: loading ? '—' : accepted,           icon: '✅' },
              ].map(({ label, value, icon }, i) => (
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
                    const partner = user.role === 'founder' ? c.investor : c.startup;
                    return (
                      <div key={c._id} className="flex items-center gap-3 bg-[#161616] border border-[#2a2a2a] rounded-lg px-4 py-3">
                        <div className="w-7 h-7 rounded-full bg-[#00c853] flex items-center justify-center text-black font-bold text-xs shrink-0">
                          {(partner?.name?.[0] || '?').toUpperCase()}
                        </div>
                        <span className="text-sm text-white flex-1">{partner?.name || '—'}</span>
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
          <div className="space-y-4">
            {loading ? <Spinner /> : connections.length === 0 ? (
              <div className="text-center py-16 border border-[#2a2a2a] rounded-xl">
                <p className="text-[#555] text-sm">No connections yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {connections.map((c) => {
                  if (user.role === 'founder') {
                    const inv = c.investor;
                    return (
                      <motion.div key={c._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5 flex flex-col justify-between gap-4">
                        
                        {/* Header: Investor Info */}
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
                          <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${STATUS_PILL[c.status]}`}>
                            {c.status}
                          </span>
                        </div>

                        {/* Details */}
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

                        {/* Actions */}
                        <div className="flex gap-2 justify-end mt-auto pt-2 border-t border-[#2a2a2a]/40">
                          {inv?.linkedin && (
                            <a href={inv.linkedin} target="_blank" rel="noreferrer" className="text-[10px] text-blue-400 hover:underline pt-2 mr-auto">
                              LinkedIn ↗
                            </a>
                          )}
                          {c.status === 'pending' && (
                            <>
                              <button onClick={() => handleRespond(c._id, 'accepted')}
                                className="text-xs px-3.5 py-1.5 rounded-md bg-[#00c853]/15 text-[#00c853] hover:bg-[#00c853]/25 font-semibold transition-colors">
                                Accept
                              </button>
                              <button onClick={() => handleRespond(c._id, 'rejected')}
                                className="text-xs px-3.5 py-1.5 rounded-md bg-red-500/15 text-red-400 hover:bg-red-500/25 font-semibold transition-colors">
                                Decline
                              </button>
                            </>
                          )}
                          {c.status === 'accepted' && (
                            <button
                              onClick={() => navigate(`/messages?with=${inv._id}&name=${encodeURIComponent(inv.name)}`)}
                              className="text-xs px-4 py-1.5 rounded-md bg-[#00c853] text-black font-semibold hover:bg-[#00b047] transition-colors">
                              ✉ Message
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  } else {
                    // Investor view: Sent connections (startup details card)
                    const startup = c.startup;
                    const founder = startup?.founder;
                    return (
                      <motion.div key={c._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5 flex flex-col justify-between gap-4">
                        
                        {/* Header: Startup Info */}
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
                          <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${STATUS_PILL[c.status]}`}>
                            {c.status}
                          </span>
                        </div>

                        {/* Details */}
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

                        {/* Actions */}
                        <div className="flex gap-2 justify-end mt-auto pt-2 border-t border-[#2a2a2a]/40">
                          {founder && (
                            <span className="text-[10px] text-[#555] pt-2 mr-auto truncate max-w-[150px]">
                              Founder: {founder.name}
                            </span>
                          )}
                          <Link to={`/startups/${startup?._id}`} className="text-xs px-3 py-1.5 rounded-md border border-[#2a2a2a] text-[#888] hover:text-white transition-colors">
                            Details
                          </Link>
                          {c.status === 'accepted' && founder && (
                            <button
                              onClick={() => navigate(`/messages?with=${founder._id}&name=${encodeURIComponent(founder.name)}`)}
                              className="text-xs px-4 py-1.5 rounded-md bg-[#00c853] text-black font-semibold hover:bg-[#00b047] transition-colors">
                              ✉ Message Founder
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  }
                })}
              </div>
            )}
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
                      <motion.div key={inv._id}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
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
                            <a href={inv.website} target="_blank" rel="noreferrer" className="text-[10px] text-[#00c853] hover:underline">Web ↗</a>
                          )}
                          {inv.linkedin && (
                            <a href={inv.linkedin} target="_blank" rel="noreferrer" className="text-[10px] text-blue-400 hover:underline">LinkedIn ↗</a>
                          )}
                        </div>
                        <button
                          onClick={() => navigate(`/messages?with=${inv._id}&name=${encodeURIComponent(inv.name)}`)}
                          className="w-full mt-1 text-[10px] px-3 py-1.5 rounded-md bg-[#00c853]/10 text-[#00c853] hover:bg-[#00c853]/20 font-semibold transition-colors">
                          ✉ Message
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
