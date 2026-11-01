import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Handshake, CalendarDays, Wallet, Sparkles, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthProvider.jsx';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/collaborations', label: 'Collaborations', icon: Handshake },
  { to: '/planner', label: 'Content Planner', icon: CalendarDays },
  { to: '/finance', label: 'Finance', icon: Wallet },
  { to: '/copilot', label: 'AI Copilot', icon: Sparkles },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const { user, signOut } = useAuth();
  return (
    <aside className="flex h-full w-full flex-col bg-ink text-slate-200 lg:w-64">
      <div className="border-b border-white/10 px-5 py-6">
        <p className="text-xs uppercase tracking-[0.2em] text-accent-2">Creator OS</p>
        <h1 className="mt-1 text-2xl font-extrabold text-white">ByteForge</h1>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {link.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-4">
        <p className="truncate text-xs text-slate-400">{user?.email}</p>
        <button
          type="button"
          onClick={signOut}
          className="mt-3 inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
