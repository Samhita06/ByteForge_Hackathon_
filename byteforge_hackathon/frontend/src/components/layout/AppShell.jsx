import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Sidebar } from '../navigation/Sidebar.jsx';

export function AppShell() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-[#eef1f6] lg:grid lg:grid-cols-[16rem_1fr]">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-ink/50" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="relative h-full w-72">
            <Sidebar />
            <button className="absolute right-3 top-4 text-white" onClick={() => setOpen(false)} aria-label="Close">
              <X />
            </button>
          </div>
        </div>
      ) : null}
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between border-b border-line bg-white/80 px-4 py-3 backdrop-blur lg:hidden">
          <p className="font-extrabold text-ink">ByteForge</p>
          <button type="button" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu />
          </button>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
