import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../api/api';

/* ─── tiny helpers ─────────────────────────────────────── */
const fmt = (n) => n?.toLocaleString('en-IN') ?? '—';
const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const ROLE_PILL = {
  founder:  'bg-blue-500/10 text-blue-400',
  investor: 'bg-purple-500/10 text-purple-400',
  admin:    'bg-[#00c853]/10 text-[#00c853]',
};

const StatCard = ({ icon, label, value, sub, color = '#00c853' }) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
    className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
        style={{ background: `${color}15` }}>{icon}</div>
      <span className="text-xs text-[#555] font-semibold uppercase tracking-widest">{label}</span>
    </div>
    <p className="text-3xl font-black text-white">{value}</p>
    {sub && <p className="text-xs text-[#555] mt-1">{sub}</p>}
  </motion.div>
);

/* ─── Main Component ───────────────────────────────────── */
export default function AdminPanel() {
  const [tab,        setTab]        = useState('overview');
  const [stats,      setStats]      = useState(null);
  const [users,      setUsers]      = useState([]);
  const [startups,   setStartups]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [uSearch,    setUSearch]    = useState('');
  const [sSearch,    setSSearch]    = useState('');
  const [uRole,      setURole]      = useState('');
  const [confirmDel, setConfirmDel] = useState(null); // { type, id, name }

  /* fetch stats */
  const loadStats = useCallback(async () => {
    try {
      const r = await api.get('/admin/stats');
      setStats(r.data.stats);
    } catch { toast.error('Failed to load stats'); }
  }, []);

  /* fetch users */
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/admin/users', { params: { search: uSearch, role: uRole } });
      setUsers(r.data.users);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  }, [uSearch, uRole]);

  /* fetch startups */
  const loadStartups = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/admin/startups', { params: { search: sSearch } });
      setStartups(r.data.startups);
    } catch { toast.error('Failed to load startups'); }
    finally { setLoading(false); }
  }, [sSearch]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { if (tab === 'users')    loadUsers();    }, [tab, loadUsers]);
  useEffect(() => { if (tab === 'startups') loadStartups(); }, [tab, loadStartups]);

  /* role change */
  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, role: newRole } : u));
      toast.success('Role updated');
    } catch { toast.error('Failed to update role'); }
  };

  /* delete user */
  const handleDeleteUser = async (id) => {
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers((prev) => prev.filter((u) => u._id !== id));
      setConfirmDel(null);
      toast.success('User deleted');
      loadStats();
    } catch (e) { toast.error(e.response?.data?.message || 'Delete failed'); }
  };

  /* delete startup */
  const handleDeleteStartup = async (id) => {
    try {
      await api.delete(`/admin/startups/${id}`);
      setStartups((prev) => prev.filter((s) => s._id !== id));
      setConfirmDel(null);
      toast.success('Startup deleted');
      loadStats();
    } catch { toast.error('Delete failed'); }
  };

  const TABS = [
    { id: 'overview', label: '📊 Overview'  },
    { id: 'users',    label: '👤 Users'     },
    { id: 'startups', label: '🚀 Startups'  },
  ];

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[#0c0c0c] px-4 sm:px-8 py-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#00c853] border border-[#00c853]/30 px-3 py-1 rounded-full mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00c853] animate-pulse inline-block" />
            Admin Panel
          </div>
          <h1 className="text-2xl font-black text-white">Platform Management</h1>
          <p className="text-sm text-[#555] mt-1">Manage users, startups, and view real-time platform analytics.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 mb-8 border-b border-[#2a2a2a]">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-5 py-2.5 text-xs font-semibold transition-colors border-b-2 -mb-[1px] ${
                tab === t.id
                  ? 'border-[#00c853] text-white'
                  : 'border-transparent text-[#555] hover:text-[#aaa]'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ─────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="space-y-8">
            {/* Stat grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard icon="👥" label="Total Users"    value={fmt(stats?.totalUsers)}       sub={`${fmt(stats?.totalFounders)} founders · ${fmt(stats?.totalInvestors)} investors`} />
              <StatCard icon="🚀" label="Startups"       value={fmt(stats?.totalStartups)}    color="#6366f1" />
              <StatCard icon="🤝" label="Connections"    value={fmt(stats?.totalConnections)} sub={`${fmt(stats?.acceptedConnections)} accepted`} color="#f59e0b" />
              <StatCard icon="💬" label="Messages Sent"  value={fmt(stats?.totalMessages)}    color="#ec4899" />
            </div>

            {/* Funding Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard icon="💰" label="Total Target Goal" value={`₹${(stats?.totalFundingGoal || 0).toLocaleString('en-IN')}`} sub="Sum of all startup targets" color="#00c853" />
              <StatCard icon="📈" label="Total Funding Raised" value={`₹${(stats?.totalFundingRaised || 0).toLocaleString('en-IN')}`} sub="Sum of all investments logged" color="#3b82f6" />
              <StatCard icon="📁" label="Funding Rounds" value={fmt(stats?.totalFundingRounds)} sub="Total investment rounds opened" color="#f59e0b" />
            </div>

            {/* Two columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Recent users */}
              <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5">
                <h2 className="text-xs font-bold text-[#555] uppercase tracking-widest mb-4">Recent Signups</h2>
                {stats?.recentUsers?.length ? (
                  <div className="space-y-3">
                    {stats.recentUsers.map((u) => (
                      <div key={u._id} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#00c853] flex items-center justify-center text-black font-black text-xs shrink-0">
                          {u.name[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{u.name}</p>
                          <p className="text-[10px] text-[#555] truncate">{u.email}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${ROLE_PILL[u.role]}`}>{u.role}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-[#555]">No users yet.</p>}
              </div>

              {/* Recent startups */}
              <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5">
                <h2 className="text-xs font-bold text-[#555] uppercase tracking-widest mb-4">Recent Startups</h2>
                {stats?.recentStartups?.length ? (
                  <div className="space-y-3">
                    {stats.recentStartups.map((s) => (
                      <div key={s._id} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#2a2a2a] flex items-center justify-center font-black text-white text-xs shrink-0">
                          {s.name[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{s.name}</p>
                          <p className="text-[10px] text-[#555]">{s.category} · {s.stage}</p>
                        </div>
                        <span className="text-[10px] text-[#555]">₹{fmt(s.fundingGoal / 100000)}L</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-[#555]">No startups yet.</p>}
              </div>
            </div>

            {/* Category breakdown */}
            {stats?.startupsByCategory?.length > 0 && (
              <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5">
                <h2 className="text-xs font-bold text-[#555] uppercase tracking-widest mb-4">Startups by Category</h2>
                <div className="flex flex-wrap gap-2">
                  {stats.startupsByCategory.map((c) => (
                    <div key={c._id} className="bg-[#0c0c0c] border border-[#2a2a2a] rounded-lg px-3 py-2 flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{c._id}</span>
                      <span className="text-xs text-[#555]">({c.count})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── USERS ─────────────────────────────────────────── */}
        {tab === 'users' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <input
                value={uSearch} onChange={(e) => setUSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="al-input flex-1 min-w-[220px]"
              />
              <select value={uRole} onChange={(e) => setURole(e.target.value)}
                className="al-input w-40 bg-[#161616]">
                <option value="">All roles</option>
                <option value="founder">Founder</option>
                <option value="investor">Investor</option>
                <option value="admin">Admin</option>
              </select>
              <button onClick={loadUsers} className="btn-al px-4 py-2 text-xs rounded-md">Search</button>
            </div>

            {/* Table */}
            {loading ? (
              <div className="space-y-2">
                {[1,2,3].map((i) => (
                  <div key={i} className="h-14 bg-[#161616] rounded-xl animate-pulse" />
                ))}
              </div>
            ) : users.length === 0 ? (
              <p className="text-[#555] text-sm py-10 text-center">No users found.</p>
            ) : (
              <div className="space-y-2">
                {users.map((u) => (
                  <motion.div key={u._id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    className="bg-[#161616] border border-[#2a2a2a] rounded-xl px-5 py-3.5 flex items-center gap-4 flex-wrap">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-[#00c853] flex items-center justify-center text-black font-black text-sm shrink-0">
                      {u.name[0].toUpperCase()}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{u.name}</p>
                      <p className="text-[10px] text-[#555] truncate">{u.email} · Joined {fmtDate(u.createdAt)}</p>
                    </div>
                    {/* Role selector */}
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u._id, e.target.value)}
                      className={`text-[10px] px-2 py-1 rounded font-semibold border-0 outline-none cursor-pointer ${ROLE_PILL[u.role]} bg-transparent`}>
                      <option value="founder">founder</option>
                      <option value="investor">investor</option>
                      <option value="admin">admin</option>
                    </select>
                    {/* Delete */}
                    <button onClick={() => setConfirmDel({ type: 'user', id: u._id, name: u.name })}
                      className="text-xs px-3 py-1.5 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 font-semibold transition-colors shrink-0">
                      Delete
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── STARTUPS ──────────────────────────────────────── */}
        {tab === 'startups' && (
          <div className="space-y-4">
            {/* Search */}
            <div className="flex flex-wrap gap-3">
              <input
                value={sSearch} onChange={(e) => setSSearch(e.target.value)}
                placeholder="Search by name or tagline…"
                className="al-input flex-1 min-w-[220px]"
              />
              <button onClick={loadStartups} className="btn-al px-4 py-2 text-xs rounded-md">Search</button>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1,2,3].map((i) => <div key={i} className="h-16 bg-[#161616] rounded-xl animate-pulse" />)}
              </div>
            ) : startups.length === 0 ? (
              <p className="text-[#555] text-sm py-10 text-center">No startups found.</p>
            ) : (
              <div className="space-y-2">
                {startups.map((s) => (
                  <motion.div key={s._id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    className="bg-[#161616] border border-[#2a2a2a] rounded-xl px-5 py-3.5 flex items-center gap-4 flex-wrap">
                    {/* Logo placeholder */}
                    <div className="w-9 h-9 rounded-lg bg-[#2a2a2a] flex items-center justify-center font-black text-white text-sm shrink-0">
                      {s.name[0].toUpperCase()}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{s.name}</p>
                      <p className="text-[10px] text-[#555] truncate">
                        {s.category} · {s.stage} · by {s.founder?.name || '—'} · ₹{fmt(s.fundingGoal / 100000)}L goal
                      </p>
                    </div>
                    {/* Date */}
                    <span className="text-[10px] text-[#555] shrink-0">{fmtDate(s.createdAt)}</span>
                    {/* Delete */}
                    <button onClick={() => setConfirmDel({ type: 'startup', id: s._id, name: s.name })}
                      className="text-xs px-3 py-1.5 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 font-semibold transition-colors shrink-0">
                      Delete
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Confirm Delete Modal ─────────────────────────────── */}
      <AnimatePresence>
        {confirmDel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setConfirmDel(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#161616] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}>
              <p className="text-lg font-black text-white mb-1">Delete {confirmDel.type}?</p>
              <p className="text-sm text-[#888] mb-6">
                <span className="text-white font-semibold">"{confirmDel.name}"</span> will be permanently removed. This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDel(null)}
                  className="flex-1 py-2.5 rounded-lg border border-[#2a2a2a] text-sm text-[#888] hover:text-white transition-colors">
                  Cancel
                </button>
                <button
                  onClick={() => confirmDel.type === 'user'
                    ? handleDeleteUser(confirmDel.id)
                    : handleDeleteStartup(confirmDel.id)}
                  className="flex-1 py-2.5 rounded-lg bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors">
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
