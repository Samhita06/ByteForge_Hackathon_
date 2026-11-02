import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ChevronDown, Menu, Monitor, Moon, PanelLeftClose, PanelLeftOpen, Sun, X } from 'lucide-react';
import { Sidebar } from '../navigation/Sidebar.jsx';
import { useAuth } from '../../features/auth/AuthProvider.jsx';
import { useTheme } from '../../app/theme-context.js';

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/collaborations': 'Collaborations',
  '/planner': 'Content Planner',
  '/finance': 'Finance',
  '/copilot': 'AI Creator Copilot',
  '/youtube': 'YouTube Insights',
  '/settings': 'Settings',
};

export function AppShell() {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { preference, setThemePreference } = useTheme();
  const title = pageTitles[location.pathname] || 'Creator OS';
  const ThemeIcon = preference === 'dark' ? Moon : preference === 'light' ? Sun : Monitor;

  return (
    <div
      className={`min-h-screen bg-panel text-ink transition-colors ${
        collapsed ? 'lg:grid lg:grid-cols-[5.25rem_1fr]' : 'lg:grid lg:grid-cols-[16rem_1fr]'
      }`}
    >
      <div className="hidden lg:block">
        <Sidebar collapsed={collapsed} />
      </div>
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            className="absolute inset-0 bg-slate-950/55"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          />
          <div className="relative h-full w-[min(19rem,85vw)]">
            <Sidebar onNavigate={() => setOpen(false)} />
            <button
              className="absolute right-3 top-4 rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
            >
              <X />
            </button>
          </div>
        </div>
      ) : null}
      <div className="flex min-h-screen min-w-0 flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-card/95 backdrop-blur">
          <div className="flex h-[4.25rem] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (window.matchMedia('(min-width: 1024px)').matches) {
                    setCollapsed((value) => !value);
                  } else {
                    setOpen(true);
                  }
                }}
                className="hidden rounded-xl p-2 text-slate-500 transition hover:bg-panel hover:text-ink lg:inline-flex"
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
              </button>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="rounded-xl p-2 text-slate-500 transition hover:bg-panel hover:text-ink lg:hidden"
                aria-label="Open navigation"
              >
                <Menu size={20} />
              </button>
              <div className="min-w-0">
                <p className="hidden text-xs font-medium text-slate-500 sm:block">Workspace / ByteForge</p>
                <h1 className="truncate text-base font-semibold tracking-tight text-ink sm:text-lg">{title}</h1>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <label className="flex items-center gap-2 rounded-xl border border-line bg-card px-2.5 py-2 text-slate-500 transition hover:bg-panel">
                <ThemeIcon size={16} aria-hidden="true" />
                <span className="sr-only">Theme preference</span>
                <select
                  aria-label="Theme preference"
                  value={preference}
                  onChange={(event) => setThemePreference(event.target.value)}
                  className="max-w-[5.5rem] cursor-pointer bg-transparent text-xs font-medium text-ink outline-none sm:max-w-none"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
              </label>

              <details className="group relative">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl border border-line bg-card px-2 py-1.5 transition hover:bg-panel sm:px-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                    {(user?.email?.[0] || 'C').toUpperCase()}
                  </span>
                  <span className="hidden max-w-36 truncate text-sm font-medium text-ink md:block">{user?.email}</span>
                  <ChevronDown size={15} className="hidden text-slate-500 sm:block" />
                </summary>
                <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-line bg-card p-2 shadow-xl">
                  <p className="truncate px-3 py-2 text-xs text-slate-500">{user?.email}</p>
                  <Link
                    to="/settings"
                    className="block rounded-xl px-3 py-2 text-sm text-ink transition hover:bg-panel"
                  >
                    Account settings
                  </Link>
                  <button
                    type="button"
                    onClick={() => signOut()}
                    className="w-full rounded-xl px-3 py-2 text-left text-sm transition hover:bg-panel"
                    style={{ color: 'var(--danger)' }}
                  >
                    Sign out
                  </button>
                </div>
              </details>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[90rem] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
