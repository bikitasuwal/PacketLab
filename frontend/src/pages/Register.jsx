import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, UserPlus, AlertCircle } from 'lucide-react';
import api from '../api/axios';

function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/register/', {
        username, email, password,
        first_name: firstName, last_name: lastName
      });

      const loginResponse = await api.post('/auth/login/', { username, password });
      localStorage.setItem('access_token', loginResponse.data.access);
      localStorage.setItem('refresh_token', loginResponse.data.refresh);
      localStorage.setItem('username', loginResponse.data.username);
      navigate('/dashboard');
    } catch (err) {
      const message = err.response?.data?.error || 'Could not create account. Try a different username.';
      setError(message);
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
        className="w-full max-w-sm p-8 rounded-lg border fade-in"
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
          Username *
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
          Email *
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full mb-4 px-3 py-2 rounded-md text-sm outline-none border font-mono"
          style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
        />

        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-dim)' }}>
          First Name
        </label>
        <input
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded-md text-sm outline-none border font-mono"
          style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
        />

        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-dim)' }}>
          Last Name
        </label>
        <input
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded-md text-sm outline-none border font-mono"
          style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
        />

        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-dim)' }}>
          Password *
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-3 py-2 rounded-md text-sm outline-none border font-mono"
          style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
        />
        <p className="text-xs mb-6" style={{ color: 'var(--color-text-dim)' }}>Min 8 characters, at least 1 letter and 1 number</p>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium disabled:opacity-60"
          style={{ backgroundColor: 'var(--color-accent)', color: '#052E20' }}
        >
          <UserPlus size={15} />
          {loading ? 'Creating account...' : 'Create account'}
        </button>

        <p className="text-xs text-center mt-4" style={{ color: 'var(--color-text-dim)' }}>
          Already have an account?{' '}
          <Link to="/login" className="hover:underline" style={{ color: 'var(--color-accent)' }}>
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}

export default Register;
