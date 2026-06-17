import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const FOUNDER_LINKS = [
  { to: '/dashboard',                    label: 'Overview',     icon: '▦' },
  { to: '/dashboard?tab=startups',       label: 'My Startups',  icon: '🚀' },
  { to: '/dashboard?tab=connections',    label: 'Connections',  icon: '🤝' },
  { to: '/dashboard?tab=browse',         label: 'Browse Investors', icon: '🔍' },
  { to: '/messages',                     label: 'Messages',     icon: '✉' },
];

const INVESTOR_LINKS = [
  { to: '/dashboard',                    label: 'Overview',     icon: '▦' },
  { to: '/dashboard?tab=browse',         label: 'Browse Startups', icon: '🔍' },
  { to: '/dashboard?tab=connections',    label: 'My Interests', icon: '💡' },
  { to: '/investors',                    label: 'Network',      icon: '👥' },
  { to: '/messages',                     label: 'Messages',     icon: '✉' },
];

const ADMIN_LINKS = [
  { to: '/admin',                        label: 'Overview',     icon: '📊' },
  { to: '/admin',                        label: 'Users',        icon: '👤' },
  { to: '/admin',                        label: 'Startups',     icon: '🚀' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const links =
    user?.role === 'admin'    ? ADMIN_LINKS    :
    user?.role === 'investor' ? INVESTOR_LINKS :
    FOUNDER_LINKS;

  return (
    <aside className="w-56 shrink-0 hidden lg:flex flex-col h-[calc(100vh-56px)] sticky top-14 border-r border-[#2a2a2a] bg-[#0c0c0c]">
      {/* User info */}
      <div className="px-4 py-4 border-b border-[#2a2a2a]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#00c853] flex items-center justify-center text-black font-black text-sm shrink-0">
            {user?.name[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
            <span className={`text-[11px] font-semibold capitalize ${
              user?.role === 'admin'    ? 'text-[#00c853]'  :
              user?.role === 'investor' ? 'text-blue-400'   :
              'text-[#00c853]'
            }`}>{user?.role}</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {links.map(({ to, label, icon }) => (
          <NavLink key={`${to}-${label}`} to={to} end
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#1a1a1a] text-white'
                  : 'text-[#888] hover:text-white hover:bg-[#161616]'
              }`
            }>
            <span className="text-xs w-4 text-center">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Sign out */}
      <div className="px-2 py-3 border-t border-[#2a2a2a]">
        <button onClick={() => { logout(); navigate('/'); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-[#555] hover:text-red-400 hover:bg-[#161616] transition-colors">
          <span className="text-xs w-4 text-center">↩</span> Sign out
        </button>
      </div>
    </aside>
  );
}
