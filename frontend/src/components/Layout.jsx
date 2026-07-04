import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, BookOpen, Activity, LogOut, Radio } from 'lucide-react';

function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/login');
  };

  const navItems = [
    { path: '/labs', label: 'Labs', icon: BookOpen },
    { path: '/progress', label: 'Progress', icon: Activity },
  ];

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--color-bg)' }}>
      <aside
        className="w-60 flex flex-col justify-between p-5 border-r"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <div className="flex items-center gap-2 mb-10 px-1">
            <Shield size={22} style={{ color: 'var(--color-accent)' }} />
            <span
              className="text-lg font-semibold tracking-tight"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
            >
              PacketLab
            </span>
          </div>

          <nav className="flex flex-col gap-1">
            {navItems.map(({ path, label, icon: Icon }) => {
              const active = location.pathname.startsWith(path);
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: active ? 'var(--color-surface-hover)' : 'transparent',
                    color: active ? 'var(--color-text)' : 'var(--color-text-dim)',
                  }}
                >
                  <Icon size={17} />
                  {label}
                </button>
              );
            })}
          </nav>
        </div>

        <div>
          <div
            className="flex items-center gap-2 px-3 py-2 mb-3 text-xs"
            style={{ color: 'var(--color-text-dim)' }}
          >
            <Radio size={13} style={{ color: 'var(--color-accent)' }} className="animate-pulse" />
            System online
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium w-full transition-colors hover:opacity-80"
            style={{ color: 'var(--color-text-dim)' }}
          >
            <LogOut size={17} />
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

export default Layout;