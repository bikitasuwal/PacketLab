import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, LogIn, AlertCircle } from 'lucide-react';
import api from '../api/axios';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/auth/login/', { username, password });
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
      localStorage.setItem('username', response.data.username);
      navigate('/dashboard');
    } catch {
      setError('Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm p-8 rounded-lg border"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-2 mb-8">
          <Shield size={22} style={{ color: 'var(--color-accent)' }} />
          <span
            className="text-lg font-semibold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            PacketLab
          </span>
        </div>

        {error && (
          <div
            className="flex items-center gap-2 text-sm mb-4 p-2 rounded"
            style={{ color: '#F87171', backgroundColor: 'rgba(248,113,113,0.1)' }}
          >
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-dim)' }}>
          Username
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="w-full mb-4 px-3 py-2 rounded-md text-sm outline-none border font-mono"
          style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
        />

        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-dim)' }}>
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full mb-6 px-3 py-2 rounded-md text-sm outline-none border font-mono"
          style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium disabled:opacity-60"
          style={{ backgroundColor: 'var(--color-accent)', color: '#052E20' }}
        >
          <LogIn size={15} />
          {loading ? 'Logging in...' : 'Log in'}
        </button>

        <p className="text-xs text-center mt-4" style={{ color: 'var(--color-text-dim)' }}>
  Don't have an account?{' '}
  <Link to="/register" className="hover:underline" style={{ color: 'var(--color-accent)' }}>
    Sign up
  </Link>
</p>
      </form>
    </div>
  );
}

export default Login;
