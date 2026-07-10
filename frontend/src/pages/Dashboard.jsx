import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, BookOpen, Trophy, TrendingUp, ChevronRight, Zap, ArrowRight } from 'lucide-react';
import api from '../api/axios';
import Layout from '../components/Layout';

const difficultyStyle = {
  Beginner: { color: '#34D399', bg: 'rgba(52,211,153,0.12)' },
  Intermediate: { color: '#FBBF24', bg: 'rgba(251,191,36,0.12)' },
  Advanced: { color: '#F87171', bg: 'rgba(248,113,113,0.12)' },
};

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div
      className="flex items-center gap-4 p-5 rounded-xl border fade-in"
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <div
        className="flex items-center justify-center w-11 h-11 rounded-lg shrink-0"
        style={{ backgroundColor: accent ? 'rgba(52,211,153,0.12)' : 'var(--color-surface-hover)' }}
      >
        <Icon size={20} style={{ color: accent ? 'var(--color-accent)' : 'var(--color-text-dim)' }} />
      </div>
      <div>
        <p className="text-2xl font-semibold font-mono" style={{ color: 'var(--color-text)' }}>
          {value}
        </p>
        <p className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
          {label}
        </p>
      </div>
    </div>
  );
}

function Dashboard() {
  const [labs, setLabs] = useState([]);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([api.get('/labs/'), api.get('/progress/')])
      .then(([labsRes, progressRes]) => {
        setLabs(labsRes.data);
        setProgress(progressRes.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="p-10" style={{ color: 'var(--color-text-dim)' }}>
          Loading dashboard...
        </div>
      </Layout>
    );
  }

  const inProgress = labs.filter((l) => !l.is_completed && l.challenges_completed > 0);
  const notStarted = labs.filter((l) => l.challenges_completed === 0);
  const upNext = [...inProgress, ...notStarted].slice(0, 3);
  const percent = progress.total_labs > 0
    ? Math.round((progress.labs_completed / progress.total_labs) * 100)
    : 0;

  return (
    <Layout>
      <div className="p-10 max-w-4xl">
        <div className="flex items-center gap-2 mb-1 fade-in">
          <Shield size={22} style={{ color: 'var(--color-accent)' }} />
          <h1
            className="text-2xl font-semibold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            Welcome back
          </h1>
        </div>
        <p className="text-sm mb-8" style={{ color: 'var(--color-text-dim)' }}>
          Here's your training overview.
        </p>

        <div className="grid grid-cols-3 gap-4 mb-10">
          <StatCard icon={BookOpen} label="Labs completed" value={`${progress.labs_completed}/${progress.total_labs}`} accent />
          <StatCard icon={TrendingUp} label="Overall progress" value={`${percent}%`} />
          <StatCard icon={Trophy} label="In progress" value={inProgress.length} />
        </div>

        {upNext.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-3">
              <h2
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--color-text-dim)' }}
              >
                {inProgress.length > 0 ? 'Continue where you left off' : 'Get started'}
              </h2>
              <button
                onClick={() => navigate('/labs')}
                className="flex items-center gap-1 text-xs hover:opacity-80"
                style={{ color: 'var(--color-accent)' }}
              >
                View all labs <ArrowRight size={12} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {upNext.map((lab) => {
                const d = difficultyStyle[lab.difficulty] || difficultyStyle.Beginner;
                return (
                  <div
                    key={lab.id}
                    onClick={() => navigate(`/labs/${lab.id}`)}
                    className="flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors fade-in"
                    style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface)')}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
                        style={{ backgroundColor: 'rgba(52,211,153,0.1)' }}
                      >
                        <Zap size={16} style={{ color: 'var(--color-accent)' }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                          {lab.title}
                        </p>
                        <p className="text-xs font-mono" style={{ color: 'var(--color-text-dim)' }}>
                          {lab.topic} · {lab.challenges_completed}/{lab.total_challenges} challenges
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className="text-xs font-medium px-2 py-1 rounded"
                        style={{ color: d.color, backgroundColor: d.bg }}
                      >
                        {lab.difficulty}
                      </span>
                      <ChevronRight size={16} style={{ color: 'var(--color-text-dim)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

export default Dashboard;