import { useEffect, useState } from 'react';
import { Activity, Trophy } from 'lucide-react';
import api from '../api/axios';
import Layout from '../components/Layout';
import { topicStyle } from '../constants/styles';

function ProgressPage() {
  const [progress, setProgress] = useState(null);
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([api.get('/progress/', { signal: controller.signal }), api.get('/labs/', { signal: controller.signal })])
      .then(([progressRes, labsRes]) => {
        setProgress(progressRes.data);
        setLabs(labsRes.data);
      })
      .catch((err) => {
        if (err.name !== 'CanceledError') console.error(err);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  if (loading || !progress) {
    return (
      <Layout>
        <div className="p-4 md:p-10 flex items-center gap-2" style={{ color: 'var(--color-text-dim)' }}>
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Loading progress...
        </div>
      </Layout>
    );
  }

  const percent = progress.total_labs > 0
    ? Math.round((progress.labs_completed / progress.total_labs) * 100)
    : 0;

  // Build per-topic stats
  const topicMap = {};
  labs.forEach((lab) => {
    if (!topicMap[lab.topic]) {
      topicMap[lab.topic] = { total: 0, completed: 0, totalChallenges: 0, completedChallenges: 0 };
    }
    topicMap[lab.topic].total += 1;
    topicMap[lab.topic].totalChallenges += lab.total_challenges;
    topicMap[lab.topic].completedChallenges += lab.challenges_completed;
    if (lab.is_completed) topicMap[lab.topic].completed += 1;
  });

  return (
    <Layout>
      <div className="p-4 md:p-10 max-w-6xl mx-auto">
        <div className="flex items-center gap-2 mb-1 fade-in">
          <Activity size={20} style={{ color: 'var(--color-accent)' }} />
          <h1
            className="text-2xl font-semibold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            Your Progress
          </h1>
        </div>
        <p className="text-sm mb-8" style={{ color: 'var(--color-text-dim)' }}>
          Track your learning across all labs.
        </p>

        {/* Overall progress */}
        <div
          className="p-6 rounded-xl border mb-8 fade-in"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy size={18} style={{ color: 'var(--color-accent)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                Overall Progress
              </span>
            </div>
            <span className="text-2xl font-semibold font-mono" style={{ color: 'var(--color-accent)' }}>
              {percent}%
            </span>
          </div>

          <div
            className="w-full h-3 rounded-full overflow-hidden mb-3"
            style={{ backgroundColor: 'var(--color-border)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${percent}%`, backgroundColor: 'var(--color-accent)' }}
            />
          </div>

          <p className="text-sm font-mono" style={{ color: 'var(--color-text-dim)' }}>
            {progress.labs_completed} of {progress.total_labs} labs completed
          </p>
        </div>

        {/* Per-topic breakdown */}
        {Object.keys(topicMap).length > 0 && (
          <>
            <h2
              className="text-xs font-semibold uppercase tracking-wider mb-4"
              style={{ color: 'var(--color-text-dim)' }}
            >
              By Topic
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(topicMap).map(([topic, stats]) => {
                const t = topicStyle[topic] || { color: 'var(--color-text-dim)', bg: 'var(--color-surface-hover)' };
                const pct = stats.totalChallenges > 0
                  ? Math.round((stats.completedChallenges / stats.totalChallenges) * 100)
                  : 0;

                return (
                  <div
                    key={topic}
                    className="p-4 rounded-xl border fade-in"
                    style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className="text-xs font-mono font-semibold px-2 py-1 rounded"
                        style={{ color: t.color, backgroundColor: t.bg }}
                      >
                        {topic}
                      </span>
                      <span className="text-sm font-mono font-semibold" style={{ color: t.color }}>
                        {pct}%
                      </span>
                    </div>

                    <div
                      className="w-full h-2 rounded-full overflow-hidden mb-2"
                      style={{ backgroundColor: 'var(--color-border)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: t.color }}
                      />
                    </div>

                    <p className="text-xs font-mono" style={{ color: 'var(--color-text-dim)' }}>
                      {stats.completed}/{stats.total} labs · {stats.completedChallenges}/{stats.totalChallenges} challenges
                    </p>
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

export default ProgressPage;
