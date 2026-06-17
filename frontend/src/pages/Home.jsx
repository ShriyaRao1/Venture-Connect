import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';

const HOW = [
  { step: '01', title: 'Create a profile', desc: 'Founders build startup profiles. Investors share their thesis and portfolio.' },
  { step: '02', title: 'Discover & match', desc: 'Browse curated startups by sector, stage, and traction. AI-powered recommendations.' },
  { step: '03', title: 'Connect directly', desc: 'Express interest, exchange messages, and close deals — all in one place.' },
];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { delay, duration: 0.4, ease: 'easeOut' },
});

function formatStat(key, val) {
  if (key === 'totalStartups')    return val > 0 ? `${val.toLocaleString('en-IN')}+` : '—';
  if (key === 'totalInvestors')   return val > 0 ? `${val.toLocaleString('en-IN')}+` : '—';
  if (key === 'totalConnections') return val > 0 ? `${val.toLocaleString('en-IN')}+` : '—';
  if (key === 'citiesCovered')    return val > 0 ? `${val}+` : '—';
  return '—';
}

export default function Home() {
  const { user } = useAuth();
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/public-stats')
      .then((r) => setStats(r.data.stats))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const STATS = stats ? [
    { value: formatStat('totalStartups',    stats.totalStartups),    label: 'Startups listed'   },
    { value: formatStat('totalInvestors',   stats.totalInvestors),   label: 'Active investors'  },
    { value: formatStat('totalConnections', stats.totalConnections),  label: 'Deals connected'   },
    { value: formatStat('citiesCovered',    stats.citiesCovered),    label: 'Cities covered'    },
  ] : [
    { value: '—', label: 'Startups listed'  },
    { value: '—', label: 'Active investors' },
    { value: '—', label: 'Deals connected'  },
    { value: '—', label: 'Cities covered'   },
  ];

  return (
    <div className="overflow-x-hidden">

      {/* ─── Hero ─────────────────────────────────────────── */}
      <section className="relative border-b border-[#2a2a2a] px-4 py-28 text-center overflow-hidden">
        {/* subtle grid bg */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

        <div className="relative max-w-3xl mx-auto">
          <motion.div {...fadeUp()} className="mb-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00c853] border border-[#00c853]/30 px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00c853] animate-pulse inline-block" />
              Live — India's #1 startup–investor network
            </span>
          </motion.div>

          <motion.h1 {...fadeUp(0.05)}
            className="text-5xl sm:text-[72px] font-black tracking-tight text-white leading-[1.04] mb-6">
            Where great<br />
            <span className="text-[#00c853]">startups</span> get funded
          </motion.h1>

          <motion.p {...fadeUp(0.1)}
            className="text-base sm:text-lg text-[#888] max-w-xl mx-auto mb-9 leading-relaxed">
            Connect founders with investors. Browse startups, express interest, and close deals — without the middlemen.
          </motion.p>

          <motion.div {...fadeUp(0.15)} className="flex flex-wrap items-center justify-center gap-3">
            {user ? (
              <Link to="/dashboard" className="btn-al px-6 py-3 text-sm">Go to dashboard →</Link>
            ) : (
              <>
                <Link to="/register" className="btn-al px-6 py-3 text-sm">Get started free</Link>
                <Link to="/startups" className="btn-ghost px-6 py-3 text-sm">Browse startups</Link>
              </>
            )}
          </motion.div>

          {/* Floating signal cards */}
          <motion.div {...fadeUp(0.3)} className="hidden md:flex gap-3 justify-center mt-14 flex-wrap">
            {[
              { icon: '🚀', text: 'AgriTech startup raised ₹5Cr', time: '2h ago' },
              { icon: '💼', text: '14 investors joined today', time: 'Today' },
              { icon: '🤝', text: 'EduBot matched 3 investors', time: 'This week' },
            ].map((c) => (
              <div key={c.text} className="al-card px-4 py-3 flex items-center gap-2.5 min-w-[180px]">
                <span className="text-base">{c.icon}</span>
                <div>
                  <p className="text-xs font-semibold text-white leading-tight">{c.text}</p>
                  <p className="text-[10px] text-[#555] mt-0.5">{c.time}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Real Stats ────────────────────────────────────── */}
      <section className="border-b border-[#2a2a2a] py-14 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map((s, i) => (
            <motion.div key={s.label} {...fadeUp(i * 0.08)}>
              {loading ? (
                <div className="h-9 w-20 mx-auto bg-[#1e1e1e] rounded animate-pulse mb-2" />
              ) : (
                <p className="text-3xl font-black text-white mb-1">{s.value}</p>
              )}
              <p className="text-xs text-[#555]">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── How it works ─────────────────────────────────── */}
      <section className="border-b border-[#2a2a2a] py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.h2 {...fadeUp()} className="text-2xl font-black text-white mb-12">How it works</motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW.map((h, i) => (
              <motion.div key={h.step} {...fadeUp(i * 0.1)}>
                <p className="text-4xl font-black text-[#1e1e1e] mb-4">{h.step}</p>
                <div className="w-8 h-0.5 bg-[#00c853] mb-4" />
                <h3 className="text-sm font-bold text-white mb-2">{h.title}</h3>
                <p className="text-xs text-[#888] leading-relaxed">{h.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────── */}
      <section className="px-4 py-20 text-center">
        <motion.div {...fadeUp()} className="max-w-lg mx-auto">
          <h2 className="text-3xl font-black text-white mb-3">Ready to connect?</h2>
          <p className="text-[#888] text-sm mb-8">Join thousands of founders and investors on VentureConnect.</p>
          <div className="flex gap-3 justify-center">
            <Link to="/register?role=founder" className="btn-al px-6 py-3 text-sm">I'm a Founder</Link>
            <Link to="/register?role=investor" className="btn-ghost px-6 py-3 text-sm">I'm an Investor</Link>
          </div>
        </motion.div>
      </section>

      {/* ─── Footer ───────────────────────────────────────── */}
      <footer className="border-t border-[#2a2a2a] px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <span className="text-sm font-black text-white flex items-center gap-1.5">
          <span className="text-[#00c853]">●</span> VentureConnect
        </span>
        <span className="text-xs text-[#555]">© 2026 VentureConnect • Built for India</span>
      </footer>
    </div>
  );
}
