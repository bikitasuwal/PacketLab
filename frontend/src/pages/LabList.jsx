import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Gauge, Network, CheckCircle2, Search } from 'lucide-react';
import api from '../api/axios';
import Layout from '../components/Layout';

const difficultyStyle = {
  Beginner: { color: '#34D399', bg: 'rgba(52,211,153,0.12)' },
  Intermediate: { color: '#FBBF24', bg: 'rgba(251,191,36,0.12)' },
  Advanced: { color: '#F87171', bg: 'rgba(248,113,113,0.12)' },
};

const difficultyFilters = ['All', 'Beginner', 'Intermediate', 'Advanced'];

function LabList() {
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/labs/')
      .then((res) => setLabs(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const filteredLabs = labs.filter((lab) => {
    const matchesSearch =
      lab.title.toLowerCase().includes(search.toLowerCase()) ||
      lab.topic.toLowerCase().includes(search.toLowerCase());
    const matchesDifficulty =
      difficultyFilter === 'All' || lab.difficulty === difficultyFilter;
    return matchesSearch && matchesDifficulty;
  });

  return (
    <Layout>
      <div className="p-10 max-w-3xl">
        <div className="flex items-center gap-2 mb-1">
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

        <div className="flex items-center gap-2 mb-4 flex-wrap">
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
          <p style={{ color: 'var(--color-text-dim)' }}>Loading labs...</p>
        ) : filteredLabs.length === 0 ? (
          <p style={{ color: 'var(--color-text-dim)' }}>No labs match your search.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredLabs.map((lab) => {
              const d = difficultyStyle[lab.difficulty] || difficultyStyle.Beginner;
              return (
                <div
                  key={lab.id}
                  onClick={() => navigate(`/labs/${lab.id}`)}
                  className="group flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors fade-in"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: lab.is_completed ? 'var(--color-accent)' : 'var(--color-border)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface)')}
                >
                  <div className="flex items-center gap-3">
                    {lab.is_completed && (
                      <CheckCircle2 size={18} style={{ color: 'var(--color-accent)' }} className="shrink-0" />
                    )}
                    <div>
                      <h2 className="font-medium mb-0.5" style={{ color: 'var(--color-text)' }}>
                        {lab.title}
                      </h2>
                      <p className="text-xs font-mono" style={{ color: 'var(--color-text-dim)' }}>
                        {lab.topic} · {lab.challenges_completed}/{lab.total_challenges} challenges
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded"
                      style={{ color: d.color, backgroundColor: d.bg }}
                    >
                      <Gauge size={12} />
                      {lab.difficulty}
                    </span>
                    <ChevronRight
                      size={16}
                      style={{ color: 'var(--color-text-dim)' }}
                      className="group-hover:translate-x-0.5 transition-transform"
                    />
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