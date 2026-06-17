import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { authAPI } from '../api/api';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await authAPI.resetPassword(token, form.password);
      toast.success('Password reset! Please sign in with your new password.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm">

        <div className="mb-8">
          <h1 className="text-2xl font-black text-white mb-1">Reset password</h1>
          <p className="text-sm text-[#888]">
            Choose a new password for your account.{' '}
            <Link to="/login" className="text-[#00c853] hover:underline font-medium">Back to sign in</Link>
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4" autoComplete="off">
          <div>
            <label className="block text-xs font-semibold text-[#888] mb-1.5">New password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                required minLength={6} placeholder="Min. 6 characters"
                className="al-input pr-16" autoComplete="new-password" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#555] hover:text-[#aaa] transition-colors">
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#888] mb-1.5">Confirm password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              required placeholder="Repeat password"
              className="al-input" autoComplete="new-password" />
          </div>

          {/* Password match indicator */}
          {form.confirm && (
            <p className={`text-[11px] ${form.password === form.confirm ? 'text-[#00c853]' : 'text-red-400'}`}>
              {form.password === form.confirm ? '✓ Passwords match' : '✗ Passwords do not match'}
            </p>
          )}

          <button type="submit" disabled={loading || form.password !== form.confirm}
            className="btn-al w-full py-2.5 mt-2 disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full spin" />
                Resetting...
              </span>
            ) : 'Reset password'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
