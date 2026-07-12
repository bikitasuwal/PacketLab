import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gauge, Network, CheckCircle2, Search, Zap } from 'lucide-react';
import api from '../api/axios';
import Layout from '../components/Layout';
import { difficultyStyle, topicStyle } from '../constants/styles';

const difficultyFilters = ['All', 'Beginner', 'Intermediate', 'Advanced'];

function LabList() {
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
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

  const filteredLabs = labs.filter((lab) => {
    const matchesSearch =
      lab.title.toLowerCase().includes(search.toLowerCase()) || lab.topic.toLowerCase().includes(search.toLowerCase());
    const matchesDifficulty = difficultyFilter === 'All' || lab.difficulty === difficultyFilter;
    return matchesSearch && matchesDifficulty;
  });

  return (
    <Layout>
      <div className="p-4 md:p-10 max-w-6xl mx-auto">
        <div className="flex items-center gap-2 mb-1 fade-in">
          <Network size={20} style={{ color: 'var(--color-accent)' }} />
          <h1
            className="text-2xl font-semibold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            Labs
          </h1>
        </div>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-dim)' }}>
          Explore real captured traffic and test your understanding.
        </p>

        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-md border flex-1 min-w-[200px]"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <Search size={14} style={{ color: 'var(--color-text-dim)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search labs by title or topic..."
              className="bg-transparent outline-none text-sm flex-1"
              style={{ color: 'var(--color-text)' }}
            />
          </div>

          <div className="flex gap-1">
            {difficultyFilters.map((level) => (
              <button
                key={level}
                onClick={() => setDifficultyFilter(level)}
                className="text-xs font-medium px-3 py-2 rounded-md transition-colors"
                style={{
                  color: difficultyFilter === level ? 'var(--color-accent)' : 'var(--color-text-dim)',
                  backgroundColor: difficultyFilter === level ? 'rgba(52,211,153,0.1)' : 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-8" style={{ color: 'var(--color-text-dim)' }}>
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Loading labs...
          </div>
        ) : filteredLabs.length === 0 ? (
          <div
            className="text-center py-12 rounded-xl border fade-in"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <Search size={24} style={{ color: 'var(--color-text-dim)' }} className="mx-auto mb-3" />
            <p className="text-sm" style={{ color: 'var(--color-text-dim)' }}>
              {labs.length === 0 ? 'No labs available yet.' : 'No labs match your search.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLabs.map((lab) => {
              const d = difficultyStyle[lab.difficulty] || difficultyStyle.Beginner;
              const t = topicStyle[lab.topic] || { color: 'var(--color-text-dim)', bg: 'var(--color-surface-hover)' };
              const progressPct = lab.total_challenges > 0
                ? Math.round((lab.challenges_completed / lab.total_challenges) * 100)
                : 0;

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
                  key={lab.id}
                  onClick={() => navigate(`/labs/${lab.id}`)}
                  className="group p-5 rounded-xl border cursor-pointer transition-all duration-200 fade-in flex flex-col"
                  style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = d.color)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                >
                  {/* Header: icon + difficulty */}
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
                      style={{ backgroundColor: t.bg }}
                    >
                      {lab.is_completed ? (
                        <CheckCircle2 size={16} style={{ color: 'var(--color-accent)' }} />
                      ) : (
                        <Zap size={16} style={{ color: t.color }} />
                      )}
                    </div>
                    <span
                      className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded"
                      style={{ color: d.color, backgroundColor: d.bg }}
                    >
                      <Gauge size={11} />
                      {lab.difficulty}
                    </span>
                  </div>

                  {/* Title */}
                  <h3
                    className="text-sm font-semibold mb-1"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {lab.title}
                  </h3>

                  {/* Challenge count */}
                  <p className="text-xs mb-3" style={{ color: 'var(--color-text-dim)' }}>
                    {lab.total_challenges} {lab.total_challenges === 1 ? 'challenge' : 'challenges'}
                  </p>

                  {/* Spacer to push bottom content down */}
                  <div className="flex-1" />

                  {/* Status + Progress bar */}
                  <div className="mt-2">
                    <p className="text-xs font-medium mb-1.5" style={{ color: statusColor }}>
                      {statusText}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${progressPct}%`, backgroundColor: 'var(--color-accent)' }}
                        />
                      </div>
                      <span className="text-xs font-mono shrink-0" style={{ color: 'var(--color-text-dim)' }}>
                        {lab.challenges_completed}/{lab.total_challenges}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}

export default LabList;
