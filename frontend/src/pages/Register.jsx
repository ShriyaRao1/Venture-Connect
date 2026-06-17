import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    role: params.get('role') || 'founder',
  });
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

  const onSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.role);
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
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm">

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

        <form onSubmit={onSubmit} className="space-y-4" autoComplete="off">
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
            ) : `Sign up as ${form.role}`}
          </button>
        </form>

        <p className="text-[11px] text-[#555] mt-6 text-center">
          By signing up, you agree to our Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
}
