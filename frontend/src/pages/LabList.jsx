import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const difficultyColor = {
  Beginner: 'bg-green-600',
  Intermediate: 'bg-yellow-600',
  Advanced: 'bg-red-600',
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

  if (loading) {
    return <div className="min-h-screen bg-gray-900 text-white p-8">Loading labs...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Labs</h1>
        <button
          onClick={() => navigate('/progress')}
          className="text-blue-400 hover:underline text-sm"
        >
          View Progress
        </button>
      </div>

      <div className="grid gap-4 max-w-2xl">
        {labs.map((lab) => (
          <div
            key={lab.id}
            onClick={() => navigate(`/labs/${lab.id}`)}
            className="bg-gray-800 p-4 rounded-lg flex items-center justify-between cursor-pointer hover:bg-gray-700 transition"
          >
            <div>
              <h2 className="text-white font-medium">{lab.title}</h2>
              <p className="text-gray-400 text-sm">{lab.topic}</p>
            </div>
            <span
              className={`text-xs text-white px-2 py-1 rounded ${difficultyColor[lab.difficulty]}`}
            >
              {lab.difficulty}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LabList;