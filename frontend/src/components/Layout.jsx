import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, BookOpen, Activity, LogOut, Radio, LayoutDashboard, PanelLeftClose, PanelLeftOpen, Upload } from 'lucide-react';

function Layout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('username');
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/labs', label: 'Labs', icon: BookOpen },
    { path: '/progress', label: 'Progress', icon: Activity },
    { path: '/upload', label: 'Upload PCAP', icon: Upload },
  ];

  const sidebarWidth = sidebarCollapsed ? 'w-16' : 'w-56';

  return (
    <div className="h-screen flex" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* ── Sidebar ───────────────────────────────────────── */}
      <aside
        className={`${sidebarWidth} shrink-0 flex flex-col border-r transition-all duration-300 ease-in-out`}
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)' }}
      >
        {/* Sidebar toggle */}
        <div className="flex items-center h-14 shrink-0 px-3" style={{ borderColor: 'var(--color-border)' }}>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`flex items-center justify-center rounded hover:bg-black/5 transition-colors ${
              sidebarCollapsed ? 'w-full py-2.5' : 'py-2.5'
            }`}
            style={{ color: 'var(--color-text-dim)' }}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 px-3 mt-2">
          {navItems.map(({ path, label, icon: Icon }) => {
            const active = location.pathname.startsWith(path);
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`relative flex items-center gap-2.5 rounded-md text-sm font-medium transition-all duration-150 py-2.5 ${
                  sidebarCollapsed ? 'justify-center' : ''
                }`}
                style={{
                  backgroundColor: active ? 'var(--color-surface-hover)' : 'transparent',
                  color: active ? 'var(--color-text)' : 'var(--color-text-dim)',
                }}
                title={sidebarCollapsed ? label : undefined}
              >
                {active && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r"
                    style={{ backgroundColor: 'var(--color-accent)' }}
                  />
                )}
                <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                {!sidebarCollapsed && <span>{label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* System status */}
        {sidebarCollapsed && (
          <div
            className="flex items-center justify-center px-3 py-3 text-xs border-t"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-dim)' }}
          >
            <Radio size={10} style={{ color: 'var(--color-accent)' }} className="animate-pulse shrink-0" />
          </div>
        )}
      </aside>

      {/* ── Main area ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header
          className="flex items-center justify-between px-6 h-14 shrink-0 border-b"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
          <div className="flex items-center gap-3">
            <Shield size={22} style={{ color: 'var(--color-accent)' }} />
            <span
              className="text-lg font-semibold tracking-tight"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
            >
              PacketLab
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded transition-colors hover:opacity-80"
            style={{ color: 'var(--color-accent)', backgroundColor: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.15)' }}
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

export default Layout;
