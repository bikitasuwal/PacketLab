import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ChevronRight, Zap, CheckCircle2 } from 'lucide-react';
import api from '../api/axios';
import Layout from '../components/Layout';
import { difficultyStyle, topicStyle } from '../constants/styles';

function LabCard({ lab, navigate }) {
  const d = difficultyStyle[lab.difficulty] || difficultyStyle.Beginner;
  const t = topicStyle[lab.topic] || { color: 'var(--color-text-dim)', bg: 'var(--color-surface-hover)' };

  const statusText = lab.is_completed
    ? 'Completed'
    : lab.challenges_completed > 0
      ? `${lab.challenges_completed}/${lab.total_challenges} done`
      : 'Not started';

  const statusColor = lab.is_completed
    ? 'var(--color-accent)'
    : lab.challenges_completed > 0
      ? 'var(--color-text)'
      : 'var(--color-text-dim)';

  return (
    <div
      onClick={() => navigate(`/labs/${lab.id}`)}
      className="group p-4 rounded-xl border cursor-pointer transition-all duration-200 fade-in"
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = d.color)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
            style={{ backgroundColor: t.bg }}
          >
            {lab.is_completed ? (
              <CheckCircle2 size={14} style={{ color: 'var(--color-accent)' }} />
            ) : (
              <Zap size={14} style={{ color: t.color }} />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>
              {lab.title}
            </p>
            <p className="text-xs" style={{ color: statusColor }}>
              {statusText}
            </p>
          </div>
        </div>
        <ChevronRight
          size={14}
          style={{ color: 'var(--color-text-dim)' }}
          className="shrink-0 group-hover:translate-x-0.5 transition-transform"
        />
      </div>
    </div>
  );
}

function Dashboard() {
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();
    api.get('/labs/', { signal: controller.signal })
      .then((res) => setLabs(res.data))
      .catch((err) => {
        if (err.name !== 'CanceledError') console.error(err);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="p-4 md:p-10 flex items-center gap-2" style={{ color: 'var(--color-text-dim)' }}>
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Loading dashboard...
        </div>
      </Layout>
    );
  }

  const inProgress = labs.filter((l) => !l.is_completed && l.challenges_completed > 0);
  const notStarted = labs.filter((l) => l.challenges_completed === 0);
  const completed = labs.filter((l) => l.is_completed);
  const upNext = [...inProgress, ...notStarted].slice(0, 6);
  const username = localStorage.getItem('username') || '';

  return (
    <Layout>
      <div className="p-4 md:p-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 fade-in">
          <h1
            className="text-2xl font-semibold mb-1"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            {completed.length === labs.length && labs.length > 0
              ? 'All labs completed!'
              : `Welcome back, ${username}`
            }
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-dim)' }}>
            {completed.length === labs.length && labs.length > 0
              ? 'Great work — you\'ve finished every lab. Ready for the next challenge?'
              : 'Here\'s your training overview.'
            }
          </p>
        </div>

        {/* Labs */}
        {upNext.length > 0 ? (
          <>
            <h2
              className="text-xs font-semibold uppercase tracking-wider mb-4"
              style={{ color: 'var(--color-text-dim)' }}
            >
              {inProgress.length > 0 ? 'Continue where you left off' : 'Get started'}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {upNext.map((lab) => (
                <LabCard key={lab.id} lab={lab} navigate={navigate} />
              ))}
            </div>
          </>
        ) : labs.length === 0 ? (
          /* Empty state */
          <div
            className="text-center py-16 rounded-xl border fade-in"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <div
              className="flex items-center justify-center w-14 h-14 rounded-xl mx-auto mb-4"
              style={{ backgroundColor: 'rgba(52,211,153,0.1)' }}
            >
              <BookOpen size={24} style={{ color: 'var(--color-accent)' }} />
            </div>
            <h3 className="text-base font-medium mb-1" style={{ color: 'var(--color-text)' }}>
              No labs available yet
            </h3>
            <p className="text-sm" style={{ color: 'var(--color-text-dim)' }}>
              Labs will appear here once your instructor adds them.
            </p>
          </div>
        ) : null}
      </div>
    </Layout>
  );
}

export default Dashboard;
