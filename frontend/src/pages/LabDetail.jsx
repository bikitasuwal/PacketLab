import { useEffect, useState, useRef, useCallback } from 'react';
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
  Star,
} from 'lucide-react';
import api from '../api/axios';
import Layout from '../components/Layout';
import SequenceDiagram from '../components/SequenceDiagram';
import { protocolColors } from '../constants/styles';

function getProtocolColor(protocol) {
  return protocolColors[protocol] || 'var(--color-text-dim)';
}

function PacketCard({ packet }) {
  const [explanation, setExplanation] = useState(null);
  const [loadingExplain, setLoadingExplain] = useState(false);
  const [showRawData, setShowRawData] = useState(false);

  const handleExplain = async () => {
    setLoadingExplain(true);
    try {
      const response = await api.post(`/packets/${packet.id}/explain/`);
      setExplanation(response.data.explanation);
    } catch {
      setExplanation("Couldn't generate an explanation right now. Try again in a moment.");
    } finally {
      setLoadingExplain(false);
    }
  };

  const color = getProtocolColor(packet.protocol);
  const hasRawData = packet.raw_data && Object.keys(packet.raw_data).length > 0;
  const dnsData = packet.raw_data?.dns;
  const tcpData = packet.raw_data?.tcp;
  const udpData = packet.raw_data?.udp;

  return (
    <div
      className="p-3.5 rounded-md border-l-4"
      style={{ backgroundColor: 'var(--color-bg)', borderLeftColor: color }}
    >
      <div className="flex items-center gap-3 md:gap-4 whitespace-nowrap overflow-hidden">
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
          <span className="text-xs font-mono shrink-0" style={{ color: 'var(--color-text-dim)' }}>
            [{packet.flags}]
          </span>
        )}
        <span className="text-sm flex-1 min-w-0 truncate" style={{ color: 'var(--color-text-dim)' }}>
          {packet.summary}
        </span>
        {hasRawData && (
          <button
            onClick={() => setShowRawData(!showRawData)}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded shrink-0 hover:opacity-80"
            style={{
              color: showRawData ? 'var(--color-accent)' : 'var(--color-text-dim)',
              backgroundColor: showRawData ? 'rgba(52,211,153,0.1)' : 'transparent',
            }}
          >
            <List size={11} />
            Raw
          </button>
        )}
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

      {/* Detail line: DNS / TCP / UDP specifics */}
      {(dnsData || tcpData || udpData) && (
        <div className="flex flex-wrap items-center gap-2 mt-2 pl-9">
          {dnsData && (
            <>
              {dnsData.query_type && (
                <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ color: 'var(--color-accent)', backgroundColor: 'rgba(52,211,153,0.1)' }}>
                  {dnsData.query_type}
                </span>
              )}
              {dnsData.response_code !== undefined && (
                <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{
                  color: dnsData.response_code === 0 ? '#34D399' : '#F87171',
                  backgroundColor: dnsData.response_code === 0 ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
                }}>
                  rcode={dnsData.response_code} {dnsData.rcode_name}
                </span>
              )}
              {dnsData.answers && (
                <span className="text-xs font-mono" style={{ color: 'var(--color-text-dim)' }}>
                  answers: {dnsData.answers.join(', ')}
                </span>
              )}
            </>
          )}
          {(tcpData || udpData) && (
            <span className="text-xs font-mono" style={{ color: 'var(--color-text-dim)' }}>
              port {tcpData?.sport || udpData?.sport} → {tcpData?.dport || udpData?.dport}
            </span>
          )}
        </div>
      )}

      {showRawData && hasRawData && (
        <div
          className="mt-3 p-3.5 rounded text-xs font-mono overflow-x-auto"
          style={{ backgroundColor: 'rgba(52,211,153,0.04)', color: 'var(--color-text-dim)' }}
        >
          <pre className="whitespace-pre-wrap break-all m-0">{JSON.stringify(packet.raw_data, null, 2)}</pre>
        </div>
      )}

      {explanation && (
        <div
          className="flex items-start gap-2 mt-3 p-3.5 rounded text-sm"
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

function ChallengeBlock({ challenge, challengeIndex, onCorrect }) {
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [view, setView] = useState('cards');
  const [completed, setCompleted] = useState(challenge.is_completed);
  const blockRef = useRef(null);

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
        if (onCorrect) onCorrect(challengeIndex);
      }
    } catch {
      console.error('Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      ref={blockRef}
      id={`challenge-${challenge.order}`}
      className="p-5 rounded-lg border mb-8"
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
            <div className="flex flex-col gap-3 mb-4">
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

      <p className="text-sm font-medium mb-1 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
        <span style={{ color: 'var(--color-accent)' }} className="font-mono">
          Q{challenge.order}
        </span>
        {challenge.question}
        {completed && (
          <CheckCircle2 size={15} style={{ color: 'var(--color-accent)' }} className="shrink-0 ml-auto" />
        )}
      </p>
      <p className="text-xs mb-4" style={{ color: 'var(--color-text-dim)' }}>
        {challenge.packets.length} {challenge.packets.length === 1 ? 'packet' : 'packets'}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Type your answer..."
          className="flex-1 px-4 py-2.5 rounded-md text-sm outline-none border font-mono"
          style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
        />
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-md text-sm font-medium"
          style={{ backgroundColor: 'var(--color-accent)', color: '#052E20' }}
        >
          {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
          {submitting ? 'Checking' : 'Submit'}
        </button>
      </form>

      {result && (
        <div
          className="flex items-start gap-2 mt-3 p-4 rounded-md text-sm"
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

      {!completed && challenge.previous_attempts && challenge.previous_attempts.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-dim)' }}>
            Previous attempts:
          </p>
          <div className="flex flex-col gap-1">
            {challenge.previous_attempts.map((attempt) => (
              <div
                key={attempt.id}
                className="flex items-center gap-2 text-xs px-2.5 py-1.5 rounded font-mono"
                style={{
                  backgroundColor: 'rgba(248,113,113,0.06)',
                  color: 'var(--color-text-dim)',
                }}
              >
                <XCircle size={11} className="shrink-0" style={{ color: '#F87171' }} />
                <span className="line-through opacity-70">{attempt.answer_given}</span>
              </div>
            ))}
          </div>
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
  const [userRating, setUserRating] = useState(null);
  const [hoverRating, setHoverRating] = useState(null);
  const [ratingSaved, setRatingSaved] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    api.get(`/labs/${id}/`, { signal: controller.signal })
      .then((res) => setLab(res.data))
      .catch((err) => {
        if (err.name !== 'CanceledError') console.error(err);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    api.get(`/labs/${id}/rating/`)
      .then((res) => setUserRating(res.data.user_rating))
      .catch(() => {});
  }, [id]);

  const handleRate = async (score) => {
    try {
      await api.post(`/labs/${id}/rate/`, { score });
      setUserRating(score);
      setRatingSaved(true);
      setTimeout(() => setRatingSaved(false), 2000);
    } catch {
      console.error('Rating failed');
    }
  };

  const handleCorrect = useCallback((challengeIndex) => {
    // Auto-scroll to next challenge after a short delay
    setTimeout(() => {
      const nextIndex = challengeIndex + 1;
      if (lab && nextIndex < lab.challenges.length) {
        const nextChallenge = lab.challenges[nextIndex];
        const el = document.getElementById(`challenge-${nextChallenge.order}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, 800);
  }, [lab]);

  if (loading || !lab) {
    return (
      <Layout>
        <div className="p-4 md:p-10 flex items-center gap-2" style={{ color: 'var(--color-text-dim)' }}>
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Loading lab...
            </>
          ) : 'Lab not found.'}
        </div>
      </Layout>
    );
  }

  const completedCount = lab.challenges.filter((c) => c.is_completed).length;
  const totalChallenges = lab.challenges.length;

  return (
    <Layout>
      <div className="p-4 md:p-10 max-w-6xl mx-auto">
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
        <p className="text-sm font-mono mb-2" style={{ color: 'var(--color-text-dim)' }}>
          {lab.topic} · {lab.difficulty}
        </p>

        {/* Lab progress indicator */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden max-w-[200px]" style={{ backgroundColor: 'var(--color-border)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${totalChallenges > 0 ? (completedCount / totalChallenges) * 100 : 0}%`,
                backgroundColor: 'var(--color-accent)',
              }}
            />
          </div>
          <span className="text-xs font-mono" style={{ color: completedCount === totalChallenges ? 'var(--color-accent)' : 'var(--color-text-dim)' }}>
            {completedCount}/{totalChallenges} challenges completed
          </span>
        </div>

        {lab.resources?.length > 0 && (
          <div className="mb-8">
            <button
              onClick={() => setShowResources(!showResources)}
              className="flex items-center gap-1.5 text-sm hover:opacity-80"
              style={{ color: 'var(--color-accent)' }}
            >
              <ExternalLink size={14} />
              {showResources ? 'Hide resources' : 'View resources'}
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
          {lab.challenges.map((challenge, index) => (
            <ChallengeBlock
              key={challenge.id}
              challenge={challenge}
              challengeIndex={index}
              onCorrect={handleCorrect}
            />
          ))}
        </div>

        {completedCount === totalChallenges && totalChallenges > 0 && (
          <div
            className="mt-8 p-6 rounded-lg border text-center"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-accent)',
            }}
          >
            <CheckCircle2 size={32} className="mx-auto mb-2" style={{ color: 'var(--color-accent)' }} />
            <p className="text-sm font-medium mb-4" style={{ color: 'var(--color-text)' }}>
              You completed all challenges! Rate this lab:
            </p>
            <div className="flex justify-center gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRate(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  className="p-1 transition-opacity hover:opacity-100"
                  style={{ opacity: (hoverRating || userRating) && star <= (hoverRating || userRating) ? 1 : 0.3 }}
                >
                  <Star
                    size={28}
                    fill={star <= (hoverRating || userRating) ? '#FBBF24' : 'transparent'}
                    stroke={star <= (hoverRating || userRating) ? '#FBBF24' : 'var(--color-text-dim)'}
                  />
                </button>
              ))}
            </div>
            {ratingSaved && (
              <p className="text-xs" style={{ color: 'var(--color-accent)' }}>Rating saved!</p>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

export default LabDetail;
