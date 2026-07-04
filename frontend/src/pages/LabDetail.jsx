import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

function LabDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lab, setLab] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showResources, setShowResources] = useState(false);

  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    api.get(`/labs/${id}/`)
      .then((res) => setLab(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!answer.trim()) return;

    setSubmitting(true);
    setResult(null);
    try {
      const response = await api.post(`/labs/${id}/submit/`, { answer: answer });
      setResult(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        Loading lab...
      </div>
    );
  }

  if (!lab) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        Lab not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <button
        onClick={() => navigate('/labs')}
        className="text-gray-400 hover:text-white mb-6 text-sm"
      >
        Back to labs
      </button>

      <h1 className="text-3xl font-bold text-white mb-2">{lab.title}</h1>
      <p className="text-gray-400 mb-6">
        {lab.topic} - {lab.difficulty}
      </p>

      <div className="bg-gray-800 p-4 rounded-lg mb-4">
        <p className="text-white font-medium mb-1">Challenge</p>
        <p className="text-gray-300">{lab.challenge_question}</p>
      </div>

      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer..."
            className="flex-1 p-2 rounded bg-gray-700 text-white outline-none"
          />
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded font-medium"
          >
            {submitting ? 'Checking...' : 'Submit'}
          </button>
        </div>

        {result && (
          <div
            className={
              result.is_correct
                ? 'mt-3 p-3 rounded bg-green-900 text-green-300'
                : 'mt-3 p-3 rounded bg-red-900 text-red-300'
            }
          >
            <p className="font-medium">
              {result.is_correct ? 'Correct!' : 'Not quite'}
            </p>
            <p className="text-sm mt-1">{result.message}</p>
          </div>
        )}
      </form>

      {lab.resources && lab.resources.length > 0 && (
        <div className="mb-6">
          <button
            onClick={() => setShowResources(!showResources)}
            className="text-blue-400 text-sm hover:underline"
          >
            {showResources ? 'Hide resources' : 'Need a refresher? View resources'}
          </button>
          {showResources && (
            <ul className="mt-2 space-y-1">
              {lab.resources.map((res, i) => (
                <li key={i}>
                  <a
                  
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 text-sm hover:underline"
                  >
                    {res.title}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <h2 className="text-xl font-semibold text-white mb-3">Packets</h2>
      <div className="grid gap-3">
        {lab.packets.map((packet) => (
          <div key={packet.id} className="bg-gray-800 p-4 rounded-lg">
            <div className="flex justify-between items-start mb-2">
              <span className="text-gray-400 text-xs">
                Packet #{packet.packet_number}
              </span>
              <span className="text-xs bg-gray-700 text-white px-2 py-1 rounded">
                {packet.protocol}
              </span>
            </div>
            <p className="text-white text-sm mb-1">
              {packet.source_ip} to {packet.dest_ip}
            </p>
            {packet.flags && (
              <p className="text-gray-400 text-xs mb-1">
                Flags: {packet.flags}
              </p>
            )}
            <p className="text-gray-300 text-sm">{packet.summary}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LabDetail;