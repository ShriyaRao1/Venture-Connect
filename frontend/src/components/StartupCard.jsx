import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const STAGE_CLASS = {
  'Idea':           'stage-idea',
  'MVP':            'stage-mvp',
  'Early Traction': 'stage-early',
  'Growth':         'stage-growth',
  'Scaling':        'stage-scale',
};

const fmt = (n) => n >= 1e7 ? `₹${(n/1e7).toFixed(1)}Cr` : `₹${(n/1e5).toFixed(1)}L`;

export default function StartupCard({ startup, delay = 0 }) {
  const progress = startup.fundingGoal > 0
    ? Math.min((startup.fundingRaised / startup.fundingGoal) * 100, 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.05, duration: 0.3 }}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      className="al-card p-5 flex flex-col gap-3.5">

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-lg bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center text-lg font-black text-white shrink-0 overflow-hidden">
          {startup.logo
            ? <img src={startup.logo} alt={startup.name} className="w-full h-full object-contain p-1" />
            : startup.name[0]}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-white truncate">{startup.name}</h3>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1e1e1e] text-[#888] font-medium">{startup.category}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STAGE_CLASS[startup.stage] || 'stage-mvp'}`}>
              {startup.stage}
            </span>
            {startup.matchScore !== undefined && startup.matchScore !== null && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#00c853]/15 text-[#00c853] font-bold tracking-wide">
                ✨ {startup.matchScore}% Match
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tagline */}
      <p className="text-xs text-[#888] leading-relaxed line-clamp-2">{startup.tagline}</p>

      {/* Funding */}
      <div>
        <div className="flex justify-between text-[11px] text-[#555] mb-1.5">
          <span>{fmt(startup.fundingRaised)} raised</span>
          <span className="text-[#00c853] font-semibold">{progress.toFixed(0)}%</span>
        </div>
        <div className="h-1 bg-[#1e1e1e] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ delay: delay * 0.05 + 0.2, duration: 0.6 }}
            className="h-full bg-[#00c853] rounded-full"
          />
        </div>
        <div className="text-[10px] text-[#555] mt-1">Goal: {fmt(startup.fundingGoal)}</div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-[#2a2a2a]">
        <div className="flex items-center gap-1.5">
          {startup.founder && (
            <>
              <div className="w-5 h-5 rounded-full bg-[#00c853] flex items-center justify-center text-[10px] font-bold text-black">
                {startup.founder.name?.[0]}
              </div>
              <span className="text-[11px] text-[#555]">{startup.founder.name?.split(' ')[0]}</span>
            </>
          )}
          <span className="text-[10px] text-[#333] ml-1">· {startup.views} views</span>
        </div>
        <Link to={`/startups/${startup._id}`}
          className="text-xs font-semibold text-[#00c853] hover:text-[#00a846] transition-colors">
          View →
        </Link>
      </div>
    </motion.div>
  );
}
