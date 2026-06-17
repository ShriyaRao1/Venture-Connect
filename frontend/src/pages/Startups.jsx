import { useState, useEffect } from 'react';
import { startupAPI } from '../api/api';
import StartupCard from '../components/StartupCard';
import { StartupCardSkeleton } from '../components/Skeletons';
import { motion } from 'framer-motion';

const CATEGORIES = ['All', 'FinTech', 'HealthTech', 'EdTech', 'SaaS', 'E-Commerce', 'AI/ML', 'GreenTech', 'Logistics', 'Social', 'Other'];
const STAGES    = ['All', 'Idea', 'MVP', 'Early Traction', 'Growth', 'Scaling'];

export default function Startups() {
  const [startups, setStartups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [stage, setStage] = useState('All');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  const fetchStartups = async (overrides = {}) => {
    setLoading(true);
    try {
      const params = { page, limit: 12, ...overrides };
      if (search) params.search = search;
      if (category !== 'All') params.category = category;
      if (stage !== 'All') params.stage = stage;
      const { data } = await startupAPI.getAll(params);
      setStartups(data.startups);
      setPagination(data.pagination || {});
    } catch (_) {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchStartups(); }, [page, category, stage]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchStartups({ page: 1 });
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-black text-white">Browse Startups</h1>
          <p className="text-sm text-[#555] mt-0.5">
            {loading ? '...' : `${startups.length}+ results`}
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or description..."
            className="al-input w-64 py-2" />
          <button type="submit" className="btn-al px-4 py-2 text-xs rounded-md">Search</button>
        </form>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-2">
        <span className="text-xs text-[#555] font-medium pt-0.5 mr-1">Sector:</span>
        {CATEGORIES.map((c) => (
          <FilterChip key={c} label={c} active={category === c} onClick={() => { setCategory(c); setPage(1); }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mb-8">
        <span className="text-xs text-[#555] font-medium pt-0.5 mr-1">Stage:</span>
        {STAGES.map((s) => (
          <FilterChip key={s} label={s} active={stage === s} onClick={() => { setStage(s); setPage(1); }} />
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <StartupCardSkeleton key={i} />)}
        </div>
      ) : startups.length === 0 ? (
        <div className="text-center py-24 border border-[#2a2a2a] rounded-xl">
          <p className="text-[#555] text-sm">No startups match your filters.</p>
          <button onClick={() => { setCategory('All'); setStage('All'); setSearch(''); fetchStartups({ page: 1 }); }}
            className="mt-3 text-xs text-[#00c853] hover:underline">
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {startups.map((s, i) => <StartupCard key={s._id} startup={s} delay={i} />)}
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
    </div>
  );
}
