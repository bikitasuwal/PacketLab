import { useEffect, useState } from 'react';
import { Activity, Trophy } from 'lucide-react';
import api from '../api/axios';
import Layout from '../components/Layout';

function ProgressPage() {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/progress/')
      .then((res) => setProgress(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !progress) {
    return (
      <Layout>
        <div className="p-10" style={{ color: 'var(--color-text-dim)' }}>
          Loading progress...
        </div>
      </Layout>
    );
  }

  const percent = progress.total_labs > 0
    ? Math.round((progress.labs_completed / progress.total_labs) * 100)
    : 0;

  return (
    <Layout>
      <div className="p-10 max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <Activity size={20} style={{ color: 'var(--color-accent)' }} />
          <h1
            className="text-2xl font-semibold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            Your Progress
          </h1>
        </div>

        <div
          className="p-6 rounded-lg border"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Trophy size={16} style={{ color: 'var(--color-accent)' }} />
            <p className="font-mono" style={{ color: 'var(--color-text)' }}>
              {progress.labs_completed} / {progress.total_labs} labs completed
            </p>
          </div>

          <div
            className="w-full h-2 rounded-full mt-4 mb-2 overflow-hidden"
            style={{ backgroundColor: 'var(--color-border)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${percent}%`, backgroundColor: 'var(--color-accent)' }}
            />
          </div>

          <p className="text-sm" style={{ color: 'var(--color-text-dim)' }}>
            {percent}% complete
          </p>
        </div>
      </div>
    </Layout>
  );
}

export default ProgressPage;