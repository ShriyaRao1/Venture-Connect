import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['FinTech', 'HealthTech', 'EdTech', 'SaaS', 'E-Commerce', 'AI/ML', 'GreenTech', 'Logistics', 'Social', 'Other'];
const STAGES    = ['Idea', 'MVP', 'Early Traction', 'Growth', 'Scaling'];

export default function Register() {
  const [params] = useSearchParams();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    role: params.get('role') || 'founder',
  });
  
  // Investor optional preferences
  const [sectors, setSectors] = useState([]);
  const [stages, setStages] = useState([]);
  const [locations, setLocations] = useState('');

  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  // sync role from URL query if it changes
  useEffect(() => {
    const r = params.get('role');
    if (r && (r === 'founder' || r === 'investor')) {
      setForm((f) => ({ ...f, role: r }));
    }
  }, [params]);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const toggleSector = (sec) => {
    setSectors(prev => prev.includes(sec) ? prev.filter(s => s !== sec) : [...prev, sec]);
  };

  const toggleStage = (stg) => {
    setStages(prev => prev.includes(stg) ? prev.filter(s => s !== stg) : [...prev, stg]);
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (form.role === 'founder') {
      handleRegister(false);
    } else {
      setStep(2);
    }
  };

  const handleRegister = async (usePreferences = false) => {
    setLoading(true);
    try {
      const prefs = usePreferences ? {
        sectors,
        stages,
        locations: locations.split(',').map((l) => l.trim()).filter(Boolean),
      } : undefined;

      await register(form.name, form.email, form.password, form.role, prefs);
      toast.success('Account created! Welcome to VentureConnect 🎉');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm relative">
        <AnimatePresence mode="wait">
          
          {/* STEP 1: Account details */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              <div className="mb-8">
                <h1 className="text-2xl font-black text-white mb-1">Create an account</h1>
                <p className="text-sm text-[#888]">Already have one?{' '}
                  <Link to="/login" className="text-[#00c853] hover:underline font-medium">Sign in</Link>
                </p>
              </div>

              {/* Role toggle */}
              <div className="flex rounded-lg bg-[#161616] border border-[#2a2a2a] p-1 mb-6">
                {[
                  { value: 'founder',  label: '🚀  I\'m a founder' },
                  { value: 'investor', label: '💼  I\'m an investor' },
                ].map((r) => (
                  <button key={r.value} type="button"
                    onClick={() => setForm({ ...form, role: r.value })}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                      form.role === r.value
                        ? 'bg-[#00c853] text-black'
                        : 'text-[#888] hover:text-white'
                    }`}>
                    {r.label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleNextStep} className="space-y-4" autoComplete="off">
                <div>
                  <label className="block text-xs font-semibold text-[#888] mb-1.5">Full name</label>
                  <input name="name" value={form.name} onChange={onChange} required
                    placeholder="Ratan Tata" className="al-input" autoComplete="off" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#888] mb-1.5">Work email</label>
                  <input name="email" type="email" value={form.email} onChange={onChange} required
                    placeholder="you@company.com" className="al-input" autoComplete="off" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#888] mb-1.5">Password</label>
                  <input name="password" type="password" value={form.password} onChange={onChange} required
                    placeholder="Min. 6 characters" className="al-input" autoComplete="new-password" />
                </div>

                <button type="submit" disabled={loading} className="btn-al w-full py-2.5 mt-2">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full spin" />
                      Creating account...
                    </span>
                  ) : form.role === 'investor' ? 'Continue to preferences' : 'Sign up as founder'}
                </button>
              </form>

              <p className="text-[11px] text-[#555] mt-6 text-center">
                By signing up, you agree to our Terms of Service and Privacy Policy.
              </p>
            </motion.div>
          )}

          {/* STEP 2: Investor Preferences */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-5"
            >
              <div>
                <h1 className="text-xl font-black text-white mb-1">Matchmaking focus</h1>
                <p className="text-xs text-[#888]">
                  Select your optional investing preferences. This establishes your matching score with startups.
                </p>
              </div>

              {/* Sectors */}
              <div>
                <label className="block text-xs font-semibold text-[#888] mb-2">Preferred sectors</label>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto border border-[#2a2a2a] p-2.5 rounded-lg bg-[#0c0c0c]">
                  {CATEGORIES.map((sec) => {
                    const active = sectors.includes(sec);
                    return (
                      <button key={sec} type="button" onClick={() => toggleSector(sec)}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                          active
                            ? 'bg-[#00c853]/15 border-[#00c853]/40 text-[#00c853]'
                            : 'border-[#2a2a2a] text-[#555] hover:text-white hover:border-[#444]'
                        }`}>
                        {sec}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stages */}
              <div>
                <label className="block text-xs font-semibold text-[#888] mb-2">Preferred stages</label>
                <div className="flex flex-wrap gap-1.5 border border-[#2a2a2a] p-2.5 rounded-lg bg-[#0c0c0c]">
                  {STAGES.map((stg) => {
                    const active = stages.includes(stg);
                    return (
                      <button key={stg} type="button" onClick={() => toggleStage(stg)}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                          active
                            ? 'bg-[#00c853]/15 border-[#00c853]/40 text-[#00c853]'
                            : 'border-[#2a2a2a] text-[#555] hover:text-white hover:border-[#444]'
                        }`}>
                        {stg}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Locations */}
              <div>
                <label className="block text-xs font-semibold text-[#888] mb-1.5">Preferred locations (comma-separated)</label>
                <input
                  value={locations}
                  onChange={(e) => setLocations(e.target.value)}
                  className="al-input text-xs"
                  placeholder="e.g. Mumbai, Bangalore, San Francisco"
                />
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleRegister(true)}
                  disabled={loading}
                  className="btn-al w-full py-2.5 text-xs font-bold"
                >
                  {loading ? 'Creating Account...' : 'Complete registration'}
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="btn-ghost flex-1 py-2 text-xs font-semibold"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRegister(false)}
                    disabled={loading}
                    className="btn-ghost flex-1 py-2 text-xs font-semibold text-amber-500/80 hover:text-amber-500"
                  >
                    Skip preferences
                  </button>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
