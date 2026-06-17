import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { startupAPI } from '../api/api';

const CATEGORIES = ['FinTech', 'HealthTech', 'EdTech', 'SaaS', 'E-Commerce', 'AI/ML', 'GreenTech', 'Logistics', 'Social', 'Other'];
const STAGES     = ['Idea', 'MVP', 'Early Traction', 'Growth', 'Scaling'];

const EMPTY = {
  name: '', tagline: '', description: '', category: 'SaaS', stage: 'MVP',
  fundingGoal: '', fundingRaised: '0', equity: '',
  location: '', website: '', teamSize: '', logo: '', tags: '',
};

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#888] mb-1.5">{label}</label>
      {hint && <p className="text-[10px] text-[#555] mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}

export default function CreateStartup() {
  const { id } = useParams();          // if id exists → edit mode
  const isEdit  = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm]       = useState(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving]   = useState(false);

  /* Load existing startup for edit */
  useEffect(() => {
    if (!isEdit) return;
    startupAPI.getOne(id)
      .then(({ data }) => {
        const s = data.startup;
        setForm({
          name:          s.name           || '',
          tagline:       s.tagline        || '',
          description:   s.description   || '',
          category:      s.category      || 'SaaS',
          stage:         s.stage         || 'MVP',
          fundingGoal:   s.fundingGoal   ?? '',
          fundingRaised: s.fundingRaised ?? 0,
          equity:        s.equity        ?? '',
          location:      s.location      || '',
          website:       s.website       || '',
          teamSize:      s.teamSize      || '',
          logo:          s.logo          || '',
          tags:          (s.tags || []).join(', '),
        });
      })
      .catch(() => { toast.error('Could not load startup'); navigate('/dashboard'); })
      .finally(() => setLoading(false));
  }, [id]);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!form.name.trim())     return toast.error('Startup name is required');
    if (!form.tagline.trim())  return toast.error('One-liner tagline is required');
    if (!form.description.trim()) return toast.error('Description is required');
    if (!form.fundingGoal || Number(form.fundingGoal) <= 0) return toast.error('Funding goal must be > 0');

    setSaving(true);
    try {
      const payload = {
        ...form,
        fundingGoal:   Number(form.fundingGoal),
        fundingRaised: Number(form.fundingRaised) || 0,
        equity:        Number(form.equity) || 0,
        teamSize:      Number(form.teamSize) || undefined,
        tags:          form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      };

      if (isEdit) {
        await startupAPI.update(id, payload);
        toast.success('Startup updated!');
        navigate(`/startups/${id}`);
      } else {
        const { data } = await startupAPI.create(payload);
        toast.success('Startup profile created! 🚀');
        navigate(`/startups/${data.startup._id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save startup');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this startup? This cannot be undone.')) return;
    try {
      await startupAPI.delete(id);
      toast.success('Startup deleted');
      navigate('/dashboard');
    } catch {
      toast.error('Failed to delete');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[calc(100vh-56px)]">
      <div className="w-8 h-8 rounded-full border-2 border-[#2a2a2a] border-t-[#00c853] spin" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-20">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>

        {/* Header */}
        <div className="mb-8">
          <button onClick={() => navigate(-1)} className="text-xs text-[#555] hover:text-white mb-4 inline-flex items-center gap-1">
            ← Back
          </button>
          <h1 className="text-xl font-black text-white">
            {isEdit ? 'Edit Startup' : 'Create Startup Profile'}
          </h1>
          <p className="text-sm text-[#555] mt-1">
            {isEdit ? 'Update your startup details.' : 'List your startup to connect with investors.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── Basic Info ─────────────────────── */}
          <section className="border border-[#2a2a2a] rounded-xl p-5 space-y-4">
            <h2 className="text-xs font-bold text-[#555] uppercase tracking-widest">Basic Info</h2>

            <Field label="Startup Name *">
              <input value={form.name} onChange={set('name')} required
                placeholder="e.g. AgriTech India" className="al-input" />
            </Field>

            <Field label="One-liner Tagline *" hint="What does your startup do? Keep it under 120 characters.">
              <input value={form.tagline} onChange={set('tagline')} required maxLength={120}
                placeholder="e.g. AI-powered crop monitoring for small farmers" className="al-input" />
              <p className="text-[10px] text-[#555] mt-1 text-right">{form.tagline.length}/120</p>
            </Field>

            <Field label="Description *" hint="Explain the problem, solution, and target market.">
              <textarea rows={5} value={form.description} onChange={set('description')} required
                placeholder="We're solving... Our solution is... Our target market is..."
                className="al-input" />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Category *">
                <select value={form.category} onChange={set('category')} className="al-input">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Stage *">
                <select value={form.stage} onChange={set('stage')} className="al-input">
                  {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Location">
                <input value={form.location} onChange={set('location')}
                  placeholder="e.g. Bengaluru, India" className="al-input" />
              </Field>
              <Field label="Team Size">
                <input type="number" min={1} value={form.teamSize} onChange={set('teamSize')}
                  placeholder="e.g. 5" className="al-input" />
              </Field>
            </div>
          </section>

          {/* ── Funding ────────────────────────── */}
          <section className="border border-[#2a2a2a] rounded-xl p-5 space-y-4">
            <h2 className="text-xs font-bold text-[#555] uppercase tracking-widest">Funding Details</h2>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Funding Goal (₹) *">
                <input type="number" min={0} value={form.fundingGoal} onChange={set('fundingGoal')} required
                  placeholder="e.g. 5000000" className="al-input" />
              </Field>
              <Field label="Amount Raised (₹)">
                <input type="number" min={0} value={form.fundingRaised} onChange={set('fundingRaised')}
                  placeholder="0" className="al-input" />
              </Field>
            </div>

            <Field label="Equity Offered (%)" hint="What % equity are you offering to investors?">
              <input type="number" min={0} max={100} step={0.1} value={form.equity} onChange={set('equity')}
                placeholder="e.g. 10" className="al-input" />
            </Field>
          </section>

          {/* ── Online Presence ─────────────────── */}
          <section className="border border-[#2a2a2a] rounded-xl p-5 space-y-4">
            <h2 className="text-xs font-bold text-[#555] uppercase tracking-widest">Online Presence</h2>

            <Field label="Website URL">
              <input type="url" value={form.website} onChange={set('website')}
                placeholder="https://yourStartup.com" className="al-input" />
            </Field>

            <Field label="Logo URL" hint="Paste a direct image link or leave blank.">
              <input type="url" value={form.logo} onChange={set('logo')}
                placeholder="https://yourStartup.com/logo.png" className="al-input" />
            </Field>

            <Field label="Tags" hint="Comma-separated keywords (e.g. AI, B2B, SaaS, AgriTech)">
              <input value={form.tags} onChange={set('tags')}
                placeholder="AI, B2B, Agriculture, Mobile" className="al-input" />
            </Field>
          </section>

          {/* ── Actions ─────────────────────────── */}
          <div className="flex items-center justify-between gap-3">
            {isEdit && (
              <button type="button" onClick={handleDelete}
                className="text-xs text-red-500 hover:text-red-400 border border-red-500/20 hover:border-red-500/40 px-4 py-2.5 rounded-md transition-colors">
                Delete startup
              </button>
            )}
            <div className="flex gap-2 ml-auto">
              <button type="button" onClick={() => navigate(-1)}
                className="btn-ghost px-5 py-2.5 text-xs rounded-md">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-al px-6 py-2.5 text-xs rounded-md">
                {saving ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full spin" />
                    Saving...
                  </span>
                ) : isEdit ? 'Save Changes' : 'Create Profile'}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
