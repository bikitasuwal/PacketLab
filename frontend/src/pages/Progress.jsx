import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

function Progress() {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/progress/')
      .then((res) => setProgress(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-gray-900 text-white p-8">Loading progress...</div>;
  }

  const percent = progress.total_labs > 0
    ? Math.round((progress.labs_completed / progress.total_labs) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <button
        onClick={() => navigate('/labs')}
        className="text-gray-400 hover:text-white mb-6 text-sm"
      >
        Back to labs
      </button>

      <h1 className="text-3xl font-bold text-white mb-6">Your Progress</h1>

      <div className="bg-gray-800 p-6 rounded-lg max-w-md">
        <p className="text-white text-lg mb-2">
          {progress.labs_completed} of {progress.total_labs} labs completed
        </p>

        <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>

        <p className="text-gray-400 text-sm">{percent}% complete</p>
      </div>
    </div>
  );
}

export default Progress;