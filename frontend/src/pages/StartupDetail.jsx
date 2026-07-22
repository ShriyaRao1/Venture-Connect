import { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { startupAPI, connectionAPI, userAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';

const fmt = (n) => {
  if (!n) return '₹0';
  return n >= 1e7 ? `₹${(n/1e7).toFixed(1)}Cr` : `₹${(n/1e5).toFixed(1)}L`;
};

function Section({ title, children }) {
  return (
    <div className="border border-[#2a2a2a] rounded-xl p-5">
      <h2 className="text-[11px] font-bold text-[#555] uppercase tracking-widest mb-4">{title}</h2>
      {children}
    </div>
  );
}

export default function StartupDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [startup, setStartup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ message: '', minAmount: '', maxAmount: '' });
  const [submitting, setSubmitting] = useState(false);
  const hasFetched = useRef(false);

  // New States
  const [showRoundModal, setShowRoundModal] = useState(false);
  const [roundForm, setRoundForm] = useState({ roundName: 'Seed', targetAmount: '', equityOffered: '' });
  const [creatingRound, setCreatingRound] = useState(false);

  const [showInvestModal, setShowInvestModal] = useState(false);
  const [investAmount, setInvestAmount] = useState('');
  const [investingRound, setInvestingRound] = useState(false);
  const [selectedRoundId, setSelectedRoundId] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(null);

  const fetchStartupData = () => {
    startupAPI.getOne(id)
      .then(({ data }) => setStartup(data.startup))
      .catch(() => { toast.error('Startup not found'); navigate('/startups'); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchStartupData();
  }, [id, navigate]);

  useEffect(() => {
    if (user && id) {
      userAPI.saved()
        .then(({ data }) => {
          const isSaved = data.startups?.some((s) => s._id === id);
          setSaved(!!isSaved);
        })
        .catch((err) => {
          console.error(err);
          toast.error('Failed to sync saved status');
        });

      const connReq = user.role === 'founder'
        ? connectionAPI.received()
        : connectionAPI.sent();
      connReq
        .then(({ data }) => {
          const match = data.connections?.find(c => 
            (c.startup?._id || c.startup) === id
          );
          if (match) setConnectionStatus(match.status);
        })
        .catch((err) => {
          console.error(err);
          toast.error('Failed to sync connection status');
        });
    } else {
      setSaved(false);
      setConnectionStatus(null);
    }
  }, [id, user]);

  const handleCreateRound = async (e) => {
    e.preventDefault();
    setCreatingRound(true);
    try {
      await startupAPI.createRound(id, {
        roundName: roundForm.roundName,
        targetAmount: Number(roundForm.targetAmount),
        equityOffered: Number(roundForm.equityOffered)
      });
      toast.success('Funding round created successfully!');
      setShowRoundModal(false);
      setRoundForm({ roundName: 'Seed', targetAmount: '', equityOffered: '' });
      fetchStartupData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create funding round');
    } finally {
      setCreatingRound(false);
    }
  };

  const handleInvest = async (e) => {
    e.preventDefault();
    setInvestingRound(true);
    try {
      await startupAPI.invest(id, Number(investAmount));
      toast.success('Investment logged successfully! Thank you for your backing. 🎉');
      setShowInvestModal(false);
      setInvestAmount('');
      fetchStartupData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Investment failed');
    } finally {
      setInvestingRound(false);
    }
  };

  const handleSave = async () => {
    if (!user) { navigate('/login'); return; }
    try {
      const { data } = await startupAPI.save(id);
      setSaved(data.saved);
      toast.success(data.saved ? 'Saved to your list' : 'Removed from saved');
    } catch { toast.error('Failed to save'); }
  };

  const handleInterest = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await connectionAPI.express({
        startupId: id,
        message: form.message,
        investmentRange: { min: Number(form.minAmount), max: Number(form.maxAmount) },
      });
      toast.success('Interest sent! The founder will be notified.');
      setShowModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send interest');
    } finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
      <div className="border border-[#2a2a2a] rounded-xl p-6 flex gap-4">
        <div className="skeleton w-16 h-16 rounded-xl shrink-0" />
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
  if (!startup) return null;

  const progress = startup.fundingGoal > 0
    ? Math.min((startup.fundingRaised / startup.fundingGoal) * 100, 100) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-20">

      {/* ── Top ────────────────────────────────── */}
      <div className="border border-[#2a2a2a] rounded-xl p-6 mb-5">
        <div className="flex gap-5 flex-wrap">
          {/* Logo */}
          <div className="w-16 h-16 rounded-xl bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center text-2xl font-black text-white shrink-0 overflow-hidden">
            {startup.logo ? <img src={startup.logo} alt="" className="w-full h-full object-contain p-1.5" /> : startup.name[0]}
          </div>

          <div className="flex-1 min-w-60">
            <div className="flex flex-wrap gap-1.5 mb-2">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1e1e1e] text-[#888] font-medium">{startup.category}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1e1e1e] text-[#888] font-medium">{startup.stage}</span>
              {startup.location && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1e1e1e] text-[#888] font-medium">📍 {startup.location}</span>}
              {startup.matchScore !== undefined && startup.matchScore !== null && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#00c853]/15 text-[#00c853] font-bold tracking-wide flex items-center gap-1 group relative cursor-help">
                  ✨ {startup.matchScore}% Match
                  <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-48 bg-[#161616] border border-[#2a2a2a] rounded-lg p-2 text-[9px] text-[#888] font-normal leading-relaxed shadow-xl z-50 text-center">
                    Calculated based on Sector, Stage, and Location preferences match.
                  </span>
                </span>
              )}
            </div>
            <h1 className="text-xl font-black text-white mb-1">{startup.name}</h1>
            <p className="text-sm text-[#888] mb-4">{startup.tagline}</p>
            <div className="flex flex-wrap gap-2">
              {user?.role === 'investor' && startup.founder?._id !== user._id && (
                <>
                  <button onClick={() => setShowModal(true)} className="btn-al px-4 py-2 text-xs rounded-md">
                    💡 Express Interest
                  </button>
                  <button
                    onClick={() => navigate(`/messages?with=${startup.founder._id}&name=${encodeURIComponent(startup.founder.name)}`)}
                    className="btn-ghost px-4 py-2 text-xs rounded-md">
                    ✉ Message Founder
                  </button>
                </>
              )}
              {/* Owner can edit */}
              {user?._id === startup.founder?._id && (
                <Link to={`/startups/${id}/edit`} className="btn-al px-4 py-2 text-xs rounded-md">
                  ✏️ Edit Startup
                </Link>
              )}
              <button onClick={handleSave}
                className={`btn-ghost px-4 py-2 text-xs rounded-md ${saved ? 'border-[#00c853]/40 text-[#00c853]' : ''}`}>
                {saved ? '★ Saved' : '☆ Save'}
              </button>
              {startup.website && (
                <a href={startup.website} target="_blank" rel="noreferrer"
                  className="btn-ghost px-4 py-2 text-xs rounded-md">Website ↗</a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Main */}
        <div className="md:col-span-2 space-y-5">
          {startup.description && (
            <Section title="About">
              <p className="text-sm text-[#aaa] leading-relaxed">{startup.description}</p>
            </Section>
          )}
          {startup.founder && (
            <Section title="Founder">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-[#00c853] flex items-center justify-center font-black text-black shrink-0">
                  {startup.founder.name?.[0]}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{startup.founder.name}</p>
                  {startup.founder.bio && <p className="text-xs text-[#888] mt-1 leading-relaxed">{startup.founder.bio}</p>}
                  {startup.founder.linkedin && (
                    <a href={startup.founder.linkedin} target="_blank" rel="noreferrer"
                      className="text-xs text-[#00c853] hover:underline mt-1 inline-block">LinkedIn ↗</a>
                  )}
                </div>
              </div>
            </Section>
          )}
          {startup.tags?.length > 0 && (
            <Section title="Tags">
              <div className="flex flex-wrap gap-1.5">
                {startup.tags.map((t) => (
                  <span key={t} className="text-xs px-2 py-1 rounded bg-[#1e1e1e] border border-[#2a2a2a] text-[#888]">{t}</span>
                ))}
              </div>
            </Section>
          )}

          <Section title="Funding Rounds">
            <div className="space-y-4">
              {user?._id === startup.founder?._id && (
                <button onClick={() => setShowRoundModal(true)}
                  className="w-full py-2.5 rounded-lg border border-dashed border-[#2a2a2a] text-xs text-[#888] hover:text-white hover:border-[#444] transition-all mb-4">
                  + Create New Funding Round
                </button>
              )}

              {(!startup.fundingRounds || startup.fundingRounds.length === 0) ? (
                <p className="text-xs text-[#555] italic">No active or historical funding rounds defined yet.</p>
              ) : (
                [...startup.fundingRounds].reverse().map((round) => {
                  const roundProgress = round.targetAmount > 0
                    ? Math.min((round.raisedAmount / round.targetAmount) * 100, 100) : 0;
                  const isOpen = round.status === 'Open';
                  
                  return (
                    <div key={round._id} className="border border-[#2a2a2a] rounded-xl p-4 bg-[#161616]/40 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <span className="text-sm font-bold text-white">{round.roundName}</span>
                          <span className="text-[10px] text-[#555] ml-2">({round.equityOffered}% equity offered)</span>
                        </div>
                        <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                          isOpen ? 'bg-[#00c853]/15 text-[#00c853]' : 'bg-[#555]/10 text-[#555]'
                        }`}>
                          {round.status}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div>
                        <div className="flex justify-between text-[10px] text-[#555] mb-1">
                          <span>Raised: {fmt(round.raisedAmount)}</span>
                          <span>Goal: {fmt(round.targetAmount)}</span>
                        </div>
                        <div className="h-1 bg-[#1e1e1e] rounded-full overflow-hidden">
                          <div className="h-full bg-[#00c853] rounded-full" style={{ width: `${roundProgress}%` }} />
                        </div>
                      </div>

                      {/* Investments list */}
                      {round.investments?.length > 0 && (
                        <div className="border-t border-[#2a2a2a]/60 pt-2 mt-2">
                          <p className="text-[9px] font-bold text-[#555] uppercase tracking-wider mb-2">Round Backers</p>
                          <div className="space-y-1.5">
                            {round.investments.map((inv, idx) => (
                              <div key={inv._id || idx} className="flex justify-between text-[11px] text-[#888]">
                                <span>{inv.investor?.name || 'Investor'}</span>
                                <span className="text-white font-semibold">{fmt(inv.amount)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Invest Action for connected investors */}
                      {isOpen && user?.role === 'investor' && connectionStatus === 'accepted' && (
                        <button onClick={() => { setShowInvestModal(true); setSelectedRoundId(round._id); }}
                          className="btn-al w-full py-2 text-xs rounded-md mt-2">
                          💸 Invest in this Round
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </Section>
        </div>

        {/* Funding sidebar */}
        <div className="space-y-5">
          <Section title="Funding">
            <div className="space-y-3">
              <div className="h-1.5 bg-[#1e1e1e] rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.7, delay: 0.2 }}
                  className="h-full bg-[#00c853] rounded-full" />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: 'Raised', value: fmt(startup.fundingRaised) },
                  { label: 'Goal', value: fmt(startup.fundingGoal) },
                  { label: 'Equity', value: startup.equity ? `${startup.equity}%` : 'N/A' },
                  { label: 'Funded', value: `${progress.toFixed(0)}%` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-[#1e1e1e] rounded-lg p-2.5">
                    <p className="text-[10px] text-[#555] mb-0.5">{label}</p>
                    <p className="text-sm font-bold text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {startup.teamSize && (
            <Section title="Team">
              <p className="text-sm font-bold text-white">{startup.teamSize} members</p>
            </Section>
          )}

          <div className="border border-[#2a2a2a] rounded-xl p-4 text-center">
            <p className="text-[#555] text-xs mb-2">👁 {startup.views} views</p>
            <p className="text-[10px] text-[#333]">Listed on VentureConnect</p>
          </div>
        </div>
      </div>

      {/* ── Interest Modal ─────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6 w-full max-w-md">
              <h2 className="text-base font-black text-white mb-1">Express Investment Interest</h2>
              <p className="text-xs text-[#888] mb-5">Send a note to the founder about your interest.</p>
              <form onSubmit={handleInterest} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#888] mb-1.5">Message *</label>
                  <textarea rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
                    required placeholder="Why are you interested? What do you bring to the table?"
                    className="al-input" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[['minAmount', 'Min investment (₹)'], ['maxAmount', 'Max investment (₹)']].map(([k, l]) => (
                    <div key={k}>
                      <label className="block text-xs font-semibold text-[#888] mb-1.5">{l}</label>
                      <input type="number" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                        placeholder="e.g. 500000" className="al-input" />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <button type="button" onClick={() => setShowModal(false)} className="btn-ghost px-4 py-2 text-xs rounded-md">Cancel</button>
                  <button type="submit" disabled={submitting} className="btn-al px-5 py-2 text-xs rounded-md">
                    {submitting ? 'Sending...' : 'Send Interest'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Create Funding Round Modal (Founder only) ── */}
      <AnimatePresence>
        {showRoundModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowRoundModal(false)}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6 w-full max-w-md">
              <h2 className="text-base font-black text-white mb-1">Create Funding Round</h2>
              <p className="text-xs text-[#888] mb-5">Open a new investment round for your startup.</p>
              <form onSubmit={handleCreateRound} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#888] mb-1.5">Round Name *</label>
                  <select
                    value={roundForm.roundName}
                    onChange={(e) => setRoundForm({ ...roundForm, roundName: e.target.value })}
                    className="al-input bg-[#161616]"
                    required
                  >
                    {['Pre-Seed', 'Seed', 'Pre-Series A', 'Series A', 'Series B', 'Series C+'].map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#888] mb-1.5">Target Amount (₹) *</label>
                  <input
                    type="number"
                    value={roundForm.targetAmount}
                    onChange={(e) => setRoundForm({ ...roundForm, targetAmount: e.target.value })}
                    required
                    placeholder="e.g. 5000000"
                    className="al-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#888] mb-1.5">Equity Offered (%) *</label>
                  <input
                    type="number"
                    value={roundForm.equityOffered}
                    onChange={(e) => setRoundForm({ ...roundForm, equityOffered: e.target.value })}
                    required
                    placeholder="e.g. 10"
                    min="0"
                    max="100"
                    step="0.1"
                    className="al-input"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <button type="button" onClick={() => setShowRoundModal(false)} className="btn-ghost px-4 py-2 text-xs rounded-md">Cancel</button>
                  <button type="submit" disabled={creatingRound} className="btn-al px-5 py-2 text-xs rounded-md">
                    {creatingRound ? 'Creating...' : 'Create Round'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Invest Modal (Investor only) ── */}
      <AnimatePresence>
        {showInvestModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowInvestModal(false)}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6 w-full max-w-md">
              <h2 className="text-base font-black text-white mb-1">Make an Investment</h2>
              <p className="text-xs text-[#888] mb-5">Input your simulated investment amount to back this startup.</p>
              <form onSubmit={handleInvest} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#888] mb-1.5">Investment Amount (₹) *</label>
                  <input
                    type="number"
                    value={investAmount}
                    onChange={(e) => setInvestAmount(e.target.value)}
                    required
                    placeholder="e.g. 500000"
                    className="al-input"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <button type="button" onClick={() => setShowInvestModal(false)} className="btn-ghost px-4 py-2 text-xs rounded-md">Cancel</button>
                  <button type="submit" disabled={investingRound} className="btn-al px-5 py-2 text-xs rounded-md">
                    {investingRound ? 'Investing...' : 'Confirm Investment'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
