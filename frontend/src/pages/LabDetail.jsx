import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  Sparkles,
  List,
  GitBranch,
  X,
} from 'lucide-react';
import api from '../api/axios';
import Layout from '../components/Layout';
import SequenceDiagram from '../components/SequenceDiagram';

const protocolColors = {
  TCP: 'var(--color-tcp)',
  UDP: 'var(--color-udp)',
  DNS: 'var(--color-dns)',
  ICMP: 'var(--color-icmp)',
};

function getProtocolColor(protocol) {
  return protocolColors[protocol] || 'var(--color-text-dim)';
}

function PacketCard({ packet }) {
  const [explanation, setExplanation] = useState(null);
  const [loadingExplain, setLoadingExplain] = useState(false);

  const handleExplain = async () => {
    setLoadingExplain(true);
    try {
      const response = await api.post(`/packets/${packet.id}/explain/`);
      setExplanation(response.data.explanation);
    } catch (err) {
      setExplanation("Couldn't generate an explanation right now. Try again in a moment.");
    } finally {
      setLoadingExplain(false);
    }
  };

  const color = getProtocolColor(packet.protocol);

  return (
    <div
      className="p-2.5 rounded-md border-l-4"
      style={{ backgroundColor: 'var(--color-bg)', borderLeftColor: color }}
    >
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-mono w-6 shrink-0" style={{ color: 'var(--color-text-dim)' }}>
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
        <span className="text-sm truncate flex-1" style={{ color: 'var(--color-text-dim)' }}>
          {packet.summary}
        </span>
        <button
          onClick={handleExplain}
          disabled={loadingExplain}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded shrink-0 hover:opacity-80"
          style={{ color: 'var(--color-accent)', backgroundColor: 'rgba(52,211,153,0.1)' }}
        >
          {loadingExplain ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <Sparkles size={11} />
          )}
          {loadingExplain ? 'Thinking...' : 'Explain'}
        </button>
      </div>

      {explanation && (
  <div
    className="flex items-start gap-2 mt-2 p-2.5 rounded text-sm"
    style={{ backgroundColor: 'rgba(52,211,153,0.06)', color: 'var(--color-text)' }}
  >
    <Sparkles size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--color-accent)' }} />
    <span className="flex-1">{explanation}</span>
    <button
      onClick={() => setExplanation(null)}
      className="shrink-0 hover:opacity-70"
      style={{ color: 'var(--color-text-dim)' }}
    >
      <X size={14} />
    </button>
  </div>
)}
    </div>
  );
}

function ChallengeBlock({ challenge }) {
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [view, setView] = useState('cards');
  const [completed, setCompleted] = useState(challenge.is_completed);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!answer.trim()) return;
    setSubmitting(true);
    setResult(null);
    try {
      const response = await api.post(`/challenges/${challenge.id}/submit/`, { answer });
      setResult(response.data);
      if (response.data.is_correct) {
        setCompleted(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="p-4 rounded-lg border mb-6"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: completed ? 'var(--color-accent)' : 'var(--color-border)',
      }}
    >
      {challenge.packets.length > 0 && (
        <>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setView('cards')}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded"
              style={{
                color: view === 'cards' ? 'var(--color-accent)' : 'var(--color-text-dim)',
                backgroundColor: view === 'cards' ? 'rgba(52,211,153,0.1)' : 'transparent',
              }}
            >
              <List size={12} /> Cards
            </button>
            <button
              onClick={() => setView('diagram')}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded"
              style={{
                color: view === 'diagram' ? 'var(--color-accent)' : 'var(--color-text-dim)',
                backgroundColor: view === 'diagram' ? 'rgba(52,211,153,0.1)' : 'transparent',
              }}
            >
              <GitBranch size={12} /> Diagram
            </button>
          </div>

          {view === 'cards' ? (
            <div className="flex flex-col gap-2 mb-4">
              {challenge.packets.map((packet) => (
                <PacketCard key={packet.id} packet={packet} />
              ))}
            </div>
          ) : (
            <div className="mb-4">
              <SequenceDiagram packets={challenge.packets} />
            </div>
          )}
        </>
      )}

      <p className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
        <span style={{ color: 'var(--color-accent)' }} className="font-mono">
          Q{challenge.order}
        </span>
        {challenge.question}
        {completed && (
          <CheckCircle2 size={15} style={{ color: 'var(--color-accent)' }} className="shrink-0 ml-auto" />
        )}
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
          {result.is_correct ? (
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          ) : (
            <XCircle size={16} className="mt-0.5 shrink-0" />
          )}
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