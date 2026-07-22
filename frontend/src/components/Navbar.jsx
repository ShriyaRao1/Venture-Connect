import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  const active = (p) => pathname === p || pathname.startsWith(p + '/');

  const navLink = (to, label) => (
    <Link to={to}
      className={`text-sm font-medium transition-colors px-1 pb-px ${
        active(to)
          ? 'text-white border-b-2 border-[#00c853]'
          : 'text-[#888] hover:text-white'
      }`}>
      {label}
    </Link>
  );

  const isAdmin = user?.role === 'admin';

  return (
    <header className="sticky top-0 z-50 bg-[#0c0c0c] border-b border-[#2a2a2a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-6">

        {/* Logo */}
        <Link to={isAdmin ? '/admin' : '/'} className="text-white font-black text-lg tracking-tight shrink-0 flex items-center gap-1.5">
          <span className="text-[#00c853]">●</span> VentureConnect
        </Link>

        {/* Desktop nav — admin sees only Admin Panel link */}
        <nav className="hidden md:flex items-center gap-6">
          {isAdmin ? (
            <Link to="/admin"
              className={`text-sm font-semibold transition-colors px-1 pb-px ${
                active('/admin')
                  ? 'text-[#00c853] border-b-2 border-[#00c853]'
                  : 'text-[#00c853]/70 hover:text-[#00c853]'
              }`}>
              ⚙ Admin Panel
            </Link>
          ) : (
            <>
              {navLink('/startups', 'Startups')}
              {navLink('/investors', 'Investors')}
              {user && navLink('/dashboard', 'Dashboard')}
              {user && navLink('/messages', 'Messages')}
            </>
          )}
        </nav>

        {/* Desktop auth */}
        <div className="hidden md:flex items-center gap-3 ml-auto">
          {user ? (
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                isAdmin ? 'bg-[#00c853] text-black ring-2 ring-[#00c853]/40' : 'bg-[#00c853] text-black'
              }`}>
                {user.name[0].toUpperCase()}
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm text-white font-semibold">{user.name.split(' ')[0]}</span>
                {isAdmin && <span className="text-[10px] text-[#00c853] font-semibold uppercase tracking-wider">Admin</span>}
              </div>
              <button onClick={() => { logout(); navigate('/'); }}
                className="text-sm text-[#555] hover:text-white transition-colors ml-1">
                Sign out
              </button>
            </div>
          ) : (
            <>
              <Link to="/login" className="text-sm text-[#888] hover:text-white transition-colors">Log in</Link>
              <Link to="/register" className="btn-al px-4 py-2 text-sm">Sign up</Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden p-1.5 text-[#888] hover:text-white" onClick={() => setOpen(!open)}>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            {open ? <path d="M6 18L18 6M6 6l12 12"/> : <path d="M3 12h18M3 6h18M3 18h18"/>}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="md:hidden border-t border-[#2a2a2a] overflow-hidden bg-[#0c0c0c]">
            <div className="px-4 py-3 flex flex-col gap-0.5">
              {isAdmin ? (
                /* Admin mobile: only Admin Panel */
                <Link to="/admin" onClick={() => setOpen(false)}
                  className="py-2.5 text-sm font-semibold text-[#00c853]">
                  ⚙ Admin Panel
                </Link>
              ) : (
                /* Regular users */
                [['/', 'Home'], ['/startups', 'Startups'], ['/investors', 'Investors'],
                  ...(user ? [['/dashboard', 'Dashboard'], ['/messages', 'Messages']] : []),
                ].map(([to, label]) => (
                  <Link key={`${to}-${label}`} to={to} onClick={() => setOpen(false)}
                    className="py-2.5 text-sm font-medium text-[#888] hover:text-white transition-colors">
                    {label}
                  </Link>
                ))
              )}
              <div className="border-t border-[#2a2a2a] mt-2 pt-3 flex flex-col gap-2">
                {user ? (
                  <>
                    <Link to="/profile" onClick={() => setOpen(false)} className="text-sm text-[#888] py-1">Profile</Link>
                    <button onClick={() => { logout(); navigate('/'); setOpen(false); }}
                      className="text-left text-sm text-red-500 py-1">Sign out</button>
                  </>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setOpen(false)} className="text-sm text-[#888] py-1.5">Log in</Link>
                    <Link to="/register" onClick={() => setOpen(false)} className="btn-al text-center py-2.5">Sign up free</Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
