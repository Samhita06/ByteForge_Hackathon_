import { NavLink } from 'react-router-dom';
import { CalendarDays, Handshake, LayoutDashboard, Settings, Sparkles, Video, Wallet } from 'lucide-react';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/collaborations', label: 'Collaborations', icon: Handshake },
  { to: '/planner', label: 'Content Planner', icon: CalendarDays },
  { to: '/finance', label: 'Finance', icon: Wallet },
  { to: '/copilot', label: 'AI Copilot', icon: Sparkles },
  { to: '/youtube', label: 'YouTube Insights', icon: Video },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ collapsed = false, onNavigate }) {
  return (
    <aside className="flex h-full min-h-screen w-full flex-col border-r border-line bg-card text-ink">
      <div
        className={`flex h-[4.25rem] items-center border-b border-line ${
          collapsed ? 'justify-center px-2' : 'gap-3 px-5'
        }`}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 text-slate-950 shadow-sm">
          <span className="text-sm font-extrabold tracking-tight">B</span>
        </div>
        {!collapsed ? (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight text-ink">ByteForge</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Creator OS</p>
          </div>
        ) : null}
      </div>
      <nav aria-label="Main navigation" className={`flex-1 space-y-1.5 py-5 ${collapsed ? 'px-2' : 'px-3'}`}>
        {!collapsed ? (
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Workspace</p>
        ) : null}
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onNavigate}
            title={collapsed ? label : undefined}
            aria-label={label}
            className={({ isActive }) =>
              `group relative flex items-center rounded-xl py-2.5 text-sm font-medium transition ${
                collapsed ? 'justify-center px-2' : 'gap-3 px-3'
              } ${
                isActive
                  ? 'bg-cyan-500/10 text-accent before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-accent'
                  : 'text-slate-500 hover:bg-panel hover:text-ink'
              }`
            }
          >
            <Icon size={18} strokeWidth={1.8} />
            {!collapsed ? <span>{label}</span> : null}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-line p-3">
        <div className={`flex items-center rounded-xl bg-panel p-2 ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/20 to-teal-500/20 text-xs font-bold text-accent">
            B
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-ink">Creator workspace</p>
              <p className="text-[10px] text-slate-500">Personal account</p>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
