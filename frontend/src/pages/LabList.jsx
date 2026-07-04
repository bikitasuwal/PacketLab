import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Gauge, Network } from 'lucide-react';
import api from '../api/axios';
import Layout from '../components/Layout';

const difficultyStyle = {
  Beginner: { color: '#34D399', bg: 'rgba(52,211,153,0.12)' },
  Intermediate: { color: '#FBBF24', bg: 'rgba(251,191,36,0.12)' },
  Advanced: { color: '#F87171', bg: 'rgba(248,113,113,0.12)' },
};

function LabList() {
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/labs/')
      .then((res) => setLabs(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

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
        <p className="text-sm mb-8" style={{ color: 'var(--color-text-dim)' }}>
          Explore real captured traffic and test your understanding.
        </p>

        {loading ? (
          <p style={{ color: 'var(--color-text-dim)' }}>Loading labs...</p>
        ) : (
          <div className="flex flex-col gap-3">
            {labs.map((lab) => {
              const d = difficultyStyle[lab.difficulty] || difficultyStyle.Beginner;
              return (
                <div
                  key={lab.id}
                  onClick={() => navigate(`/labs/${lab.id}`)}
                  className="group flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors"
                  style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface)')}
                >
                  <div>
                    <h2 className="font-medium mb-0.5" style={{ color: 'var(--color-text)' }}>
                      {lab.title}
                    </h2>
                    <p className="text-xs font-mono" style={{ color: 'var(--color-text-dim)' }}>
                      {lab.topic}
                    </p>
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