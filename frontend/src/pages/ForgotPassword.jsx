import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { authAPI } from '../api/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setSent(true);
      toast.success('Reset link generated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm">

        <div className="mb-8">
          <h1 className="text-2xl font-black text-white mb-1">Forgot password</h1>
          <p className="text-sm text-[#888]">
            Enter your email and we'll generate a reset link.{' '}
            <Link to="/login" className="text-[#00c853] hover:underline font-medium">Back to sign in</Link>
          </p>
        </div>

        {sent ? (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            className="border border-[#2a2a2a] rounded-xl p-6 text-center space-y-3">
            <div className="text-4xl">🔑</div>
            <p className="text-sm font-bold text-white">Reset link generated!</p>
            <p className="text-xs text-[#888] leading-relaxed">
              Check the <span className="text-[#00c853] font-semibold">backend terminal</span> (nodemon output) for the reset link — copy it and open it in your browser.
            </p>
            <p className="text-[10px] text-[#555] mt-2">The link expires in 1 hour.</p>
            <button onClick={() => setSent(false)}
              className="text-xs text-[#00c853] hover:underline mt-2">
              Send another →
            </button>
          </motion.div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label className="block text-xs font-semibold text-[#888] mb-1.5">Email address</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                required placeholder="you@example.com"
                className="al-input" autoComplete="off" />
            </div>

            <button type="submit" disabled={loading} className="btn-al w-full py-2.5 mt-2">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full spin" />
                  Sending...
                </span>
              ) : 'Send reset link'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
