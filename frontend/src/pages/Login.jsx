import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(form.email, form.password);
      toast.success(`Welcome back, ${u.name.split(' ')[0]}!`);
      navigate(u.role === 'investor' ? '/startups' : '/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm">

        <div className="mb-8">
          <h1 className="text-2xl font-black text-white mb-1">Sign in</h1>
          <p className="text-sm text-[#888]">Don't have an account?{' '}
            <Link to="/register" className="text-[#00c853] hover:underline font-medium">Sign up free</Link>
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4" autoComplete="off">
          <div>
            <label className="block text-xs font-semibold text-[#888] mb-1.5">Email address</label>
            <input name="email" type="email" value={form.email} onChange={onChange} required
              placeholder="you@example.com" className="al-input" autoComplete="new-email" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-[#888]">Password</label>
            </div>
            <input name="password" type="password" value={form.password} onChange={onChange} required
              placeholder="••••••••" className="al-input" autoComplete="new-password" />
          </div>

          <button type="submit" disabled={loading} className="btn-al w-full py-2.5 mt-2">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full spin" />
                Signing in...
              </span>
            ) : 'Sign in'}
          </button>
        </form>

        <p className="text-[11px] text-[#555] mt-6 text-center">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
}
