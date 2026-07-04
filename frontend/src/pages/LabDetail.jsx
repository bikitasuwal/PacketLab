import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';
import api from '../api/axios';
import Layout from '../components/Layout';

const protocolColors = {
  TCP: 'var(--color-tcp)',
  UDP: 'var(--color-udp)',
  DNS: 'var(--color-dns)',
  ICMP: 'var(--color-icmp)',
};

function getProtocolColor(protocol) {
  return protocolColors[protocol] || 'var(--color-text-dim)';
}

function ChallengeBlock({ challenge }) {
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!answer.trim()) return;
    setSubmitting(true);
    setResult(null);
    try {
      const response = await api.post(`/challenges/${challenge.id}/submit/`, { answer });
      setResult(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="p-4 rounded-lg border mb-3"
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <p className="text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>
        <span style={{ color: 'var(--color-accent)' }} className="font-mono mr-2">
          Q{challenge.order}
        </span>
        {challenge.question}
      </p>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Type your answer..."
          className="flex-1 px-3 py-2 rounded-md text-sm outline-none border font-mono"
          style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
        />
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium"
          style={{ backgroundColor: 'var(--color-accent)', color: '#052E20' }}
        >
          {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
          {submitting ? 'Checking' : 'Submit'}
        </button>
      </form>

      {result && (
        <div
          className="flex items-start gap-2 mt-3 p-3 rounded-md text-sm"
          style={{
            backgroundColor: result.is_correct ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
            color: result.is_correct ? '#34D399' : '#F87171',
          }}
        >
          {result.is_correct ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <XCircle size={16} className="mt-0.5 shrink-0" />}
          <span>{result.message}</span>
        </div>
      )}
    </div>
  );
}

function LabDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lab, setLab] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showResources, setShowResources] = useState(false);

  useEffect(() => {
    api.get(`/labs/${id}/`)
      .then((res) => setLab(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || !lab) {
    return (
      <Layout>
        <div className="p-10" style={{ color: 'var(--color-text-dim)' }}>
          {loading ? 'Loading lab...' : 'Lab not found.'}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-10 max-w-3xl">
        <button
          onClick={() => navigate('/labs')}
          className="flex items-center gap-1.5 text-sm mb-6 hover:opacity-80"
          style={{ color: 'var(--color-text-dim)' }}
        >
          <ArrowLeft size={14} />
          Back to labs
        </button>

        <h1
          className="text-2xl font-semibold mb-1"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
        >
          {lab.title}
        </h1>
        <p className="text-sm font-mono mb-6" style={{ color: 'var(--color-text-dim)' }}>
          {lab.topic} · {lab.difficulty}
        </p>

        {lab.resources?.length > 0 && (
          <div className="mb-8">
            <button
              onClick={() => setShowResources(!showResources)}
              className="flex items-center gap-1.5 text-sm hover:opacity-80"
              style={{ color: 'var(--color-accent)' }}
            >
              <ExternalLink size={14} />
              {showResources ? 'Hide resources' : 'Need a refresher?'}
            </button>
            {showResources && (
              <ul className="mt-2 flex flex-col gap-1">
                {lab.resources.map((res, i) => (
                  <li key={i}>
                    <a
                    
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm hover:underline"
                      style={{ color: 'var(--color-accent)' }}
                    >
                      {res.title}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <h2
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--color-text-dim)' }}
        >
          Captured packets
        </h2>
        <div className="flex flex-col gap-2 mb-10">
          {lab.packets.map((packet) => {
            const color = getProtocolColor(packet.protocol);
            return (
              <div
                key={packet.id}
                className="flex items-center gap-4 p-3 rounded-lg border-l-4"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  borderLeftColor: color,
                }}
              >
                <span
                  className="text-xs font-mono w-6 shrink-0"
                  style={{ color: 'var(--color-text-dim)' }}
                >
                  {packet.packet_number}
                </span>
                <span
                  className="text-xs font-mono font-semibold px-2 py-0.5 rounded shrink-0"
                  style={{ color, backgroundColor: `${color}1A` }}
                >
                  {packet.protocol}
                </span>
                <span className="flex items-center gap-1.5 text-sm font-mono shrink-0" style={{ color: 'var(--color-text)' }}>
                  {packet.source_ip}
                  <ArrowRight size={12} style={{ color: 'var(--color-text-dim)' }} />
                  {packet.dest_ip}
                </span>
                {packet.flags && (
                  <span className="text-xs font-mono" style={{ color: 'var(--color-text-dim)' }}>
                    [{packet.flags}]
                  </span>
                )}
                <span className="text-sm truncate" style={{ color: 'var(--color-text-dim)' }}>
                  {packet.summary}
                </span>
              </div>
            );
          })}
        </div>

        <h2
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--color-text-dim)' }}
        >
          Challenges
        </h2>
        <div>
          {lab.challenges.map((challenge) => (
            <ChallengeBlock key={challenge.id} challenge={challenge} />
          ))}
        </div>
      </div>
    </Layout>
  );
}

export default LabDetail;