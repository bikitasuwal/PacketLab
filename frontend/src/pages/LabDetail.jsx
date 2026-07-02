import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

function LabDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [lab, setLab] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showResources, setShowResources] = useState(false);

  useEffect(() => {
    api
      .get(`/labs/${id}/`)
      .then((res) => setLab(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

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
        ← Back to labs
      </button>

      <h1 className="text-3xl font-bold text-white mb-2">
        {lab.title}
      </h1>

      <p className="text-gray-400 mb-6">
        {lab.topic} · {lab.difficulty}
      </p>

      <div className="bg-gray-800 p-4 rounded-lg mb-6">
        <p className="text-white font-medium mb-1">Challenge</p>
        <p className="text-gray-300">{lab.challenge_question}</p>
      </div>

      {lab.resources && lab.resources.length > 0 && (
        <div className="mb-6">
          <button
            onClick={() => setShowResources(!showResources)}
            className="text-blue-400 text-sm hover:underline"
          >
            {showResources
              ? 'Hide resources'
              : 'Need a refresher? View resources ↓'}
          </button>

          {showResources && (
            <ul className="mt-2 space-y-2">
              {lab.resources.map((resource, index) => (
                <li key={index}>
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    📺 {resource.title}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <h2 className="text-xl font-semibold text-white mb-3">
        Packets
      </h2>

      <div className="grid gap-3">
        {lab.packets?.length > 0 ? (
          lab.packets.map((packet) => (
            <div
              key={packet.id}
              className="bg-gray-800 p-4 rounded-lg"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-gray-400 text-xs">
                  Packet #{packet.packet_number}
                </span>

                <span className="text-xs bg-gray-700 text-white px-2 py-1 rounded">
                  {packet.protocol}
                </span>
              </div>

              <p className="text-white text-sm mb-1">
                {packet.source_ip} → {packet.dest_ip}
              </p>

              {packet.flags && (
                <p className="text-gray-400 text-xs mb-1">
                  Flags: {packet.flags}
                </p>
              )}

              <p className="text-gray-300 text-sm">
                {packet.summary}
              </p>
            </div>
          ))
        ) : (
          <p className="text-gray-400">No packets available.</p>
        )}
      </div>
    </div>
  );
}

export default LabDetail;