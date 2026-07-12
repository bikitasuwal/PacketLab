import { useState, useRef, useMemo } from 'react';
import {
  Upload as UploadIcon, Loader2, FileWarning, CheckCircle2,
  Search, Filter, X, ArrowRight, ChevronDown, BarChart3,
} from 'lucide-react';
import api from '../api/axios';
import Layout from '../components/Layout';

const protoColor = {
  TCP: '#60A5FA', UDP: '#C084FC', DNS: '#FBBF24', ICMP: '#34D399',
  ARP: '#38BDF8', HTTP: '#F87171', TLS: '#A78BFA', Telnet: '#FB923C',
};

function PacketRow({ packet, onExplain, explaining }) {
  const [showRaw, setShowRaw] = useState(false);
  const [explanation, setExplanation] = useState(null);
  const color = protoColor[packet.protocol] || '#9CA3AF';
  const hasRaw = packet.raw_data && Object.keys(packet.raw_data).length > 0;

  const handleExplain = async () => {
    if (explanation) { setExplanation(null); return; }
    onExplain(packet.packet_number, setExplanation);
  };

  return (
    <div className="p-3 rounded-md border-l-4" style={{ backgroundColor: 'var(--color-bg)', borderLeftColor: color }}>
      <div className="flex items-center gap-3 whitespace-nowrap overflow-hidden">
        <span className="text-xs font-mono w-8 shrink-0" style={{ color: 'var(--color-text-dim)' }}>
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
        <div className="flex items-center gap-1.5 shrink-0">
          {hasRaw && (
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="text-xs px-2 py-1 rounded transition-opacity hover:opacity-80"
              style={{
                color: showRaw ? '#34D399' : 'var(--color-text-dim)',
                backgroundColor: showRaw ? 'rgba(52,211,153,0.1)' : 'transparent',
              }}
            >
              Raw
            </button>
          )}
          <button
            onClick={handleExplain}
            disabled={explaining}
            className="text-xs px-2 py-1 rounded transition-opacity hover:opacity-80"
            style={{
              color: explanation ? '#34D399' : 'var(--color-text-dim)',
              backgroundColor: explanation ? 'rgba(52,211,153,0.1)' : 'transparent',
            }}
          >
            {explaining ? '...' : explanation ? 'Hide' : 'Explain'}
          </button>
        </div>
      </div>

      {showRaw && hasRaw && (
        <div className="mt-2 p-3 rounded text-xs font-mono overflow-x-auto" style={{ backgroundColor: 'rgba(52,211,153,0.04)', color: 'var(--color-text-dim)' }}>
          <pre className="whitespace-pre-wrap break-all m-0">{JSON.stringify(packet.raw_data, null, 2)}</pre>
        </div>
      )}

      {explanation && (
        <div className="mt-2 p-3 rounded text-sm" style={{ backgroundColor: 'rgba(52,211,153,0.06)', color: 'var(--color-text)' }}>
          {explanation}
        </div>
      )}
    </div>
  );
}

function ProtocolBar({ protocols, total }) {
  if (!protocols || Object.keys(protocols).length === 0) return null;
  return (
    <div className="flex items-center gap-4 flex-wrap">
      {Object.entries(protocols).sort((a, b) => b[1] - a[1]).map(([proto, count]) => {
        const pct = Math.round((count / total) * 100);
        const color = protoColor[proto] || '#9CA3AF';
        return (
          <div key={proto} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
            <span className="text-xs font-mono" style={{ color: 'var(--color-text)' }}>{proto}</span>
            <span className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
              {count} ({pct}%)
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Upload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [protoFilter, setProtoFilter] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [explaining, setExplaining] = useState({});
  const fileRef = useRef(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) { setFile(selected); setResults(null); setError(null); }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true); setError(null); setResults(null);
    const formData = new FormData();
    formData.append('pcap_file', file);
    try {
      const response = await api.post('/packets/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResults(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to parse PCAP file.');
    } finally {
      setUploading(false);
    }
  };

  const handleExplain = async (packetNumber, setExplanation) => {
    const packet = filteredPackets.find(p => p.packet_number === packetNumber);
    if (!packet) return;
    setExplaining(prev => ({ ...prev, [packetNumber]: true }));
    try {
      const res = await api.post('/packets/explain/', { packet });
      setExplanation(res.data.explanation);
    } catch {
      setExplanation('Could not generate explanation.');
    } finally {
      setExplaining(prev => ({ ...prev, [packetNumber]: false }));
    }
  };

  const handleReset = () => {
    setFile(null); setResults(null); setError(null);
    setSearch(''); setProtoFilter('All');
    if (fileRef.current) fileRef.current.value = '';
  };

  const filteredPackets = useMemo(() => {
    if (!results) return [];
    return results.packets.filter(p => {
      const matchesProto = protoFilter === 'All' || p.protocol === protoFilter;
      const q = search.toLowerCase();
      const matchesSearch = !q ||
        p.summary.toLowerCase().includes(q) ||
        p.source_ip.includes(q) ||
        p.dest_ip.includes(q) ||
        p.protocol.toLowerCase().includes(q);
      return matchesProto && matchesSearch;
    });
  }, [results, search, protoFilter]);

  const protocols = results?.protocols || {};
  const protoList = Object.keys(protocols).sort();

  return (
    <Layout>
      <div className="p-4 md:p-10 max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
          Packet Analyzer
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--color-text-dim)' }}>
          Upload a .pcap file to parse and analyze network traffic. Click Explain on any packet for an AI breakdown.
        </p>

        <div className="p-8 rounded-xl border text-center" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-center w-14 h-14 rounded-xl mx-auto mb-4" style={{ backgroundColor: 'rgba(52,211,153,0.1)' }}>
            <UploadIcon size={24} style={{ color: 'var(--color-accent)' }} />
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text)' }}>
            {file ? file.name : 'Drag and drop a .pcap file or click to browse'}
          </p>
          <input ref={fileRef} type="file" accept=".pcap" onChange={handleFileChange} className="hidden" id="pcap-upload" />
          <div className="flex justify-center gap-3">
            <label htmlFor="pcap-upload"
              className="px-4 py-2 rounded-md text-sm font-medium cursor-pointer transition-opacity hover:opacity-80"
              style={{ backgroundColor: 'var(--color-border)', color: 'var(--color-text)' }}>
              Browse files
            </label>
            {file && (
              <button onClick={handleUpload} disabled={uploading}
                className="flex items-center gap-1.5 px-5 py-2 rounded-md text-sm font-medium"
                style={{ backgroundColor: 'var(--color-accent)', color: '#052E20' }}>
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <UploadIcon size={14} />}
                {uploading ? 'Parsing...' : 'Analyze'}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 mt-6 p-4 rounded-md text-sm"
            style={{ backgroundColor: 'rgba(248,113,113,0.1)', color: '#F87171' }}>
            <FileWarning size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {results && (
          <div className="mt-8 fade-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={16} style={{ color: 'var(--color-accent)' }} />
                <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                  {results.count} packets parsed
                </h2>
                <span className="text-xs px-2 py-0.5 rounded" style={{ color: 'var(--color-text-dim)', backgroundColor: 'var(--color-border)' }}>
                  {results.filename}
                </span>
              </div>
              <button onClick={handleReset}
                className="text-xs px-3 py-1.5 rounded-md"
                style={{ backgroundColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                Upload another
              </button>
            </div>

            <ProtocolBar protocols={protocols} total={results.count} />

            <div className="flex items-center gap-3 mt-4 mb-4">
              <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-md"
                style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                <Search size={14} style={{ color: 'var(--color-text-dim)' }} />
                <input
                  type="text"
                  placeholder="Search by IP, protocol, or summary..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm flex-1"
                  style={{ color: 'var(--color-text)' }}
                />
                {search && (
                  <button onClick={() => setSearch('')} style={{ color: 'var(--color-text-dim)' }}>
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm"
                  style={{
                    backgroundColor: protoFilter !== 'All' ? 'rgba(52,211,153,0.1)' : 'var(--color-bg)',
                    color: protoFilter !== 'All' ? 'var(--color-accent)' : 'var(--color-text-dim)',
                    border: '1px solid var(--color-border)',
                  }}>
                  <Filter size={14} />
                  {protoFilter}
                  <ChevronDown size={12} />
                </button>
                {showFilters && (
                  <div className="absolute right-0 top-full mt-1 z-10 py-1 rounded-md shadow-lg min-w-[120px]"
                    style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    {['All', ...protoList].map(p => (
                      <button key={p} onClick={() => { setProtoFilter(p); setShowFilters(false); }}
                        className="block w-full text-left px-3 py-1.5 text-sm hover:opacity-80"
                        style={{ color: p === protoFilter ? 'var(--color-accent)' : 'var(--color-text)' }}>
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <p className="text-xs mb-3" style={{ color: 'var(--color-text-dim)' }}>
              Showing {filteredPackets.length} of {results.count} packets
            </p>

            <div className="flex flex-col gap-2">
              {filteredPackets.map(packet => (
                <PacketRow
                  key={packet.packet_number}
                  packet={packet}
                  onExplain={handleExplain}
                  explaining={explaining[packet.packet_number]}
                />
              ))}
              {filteredPackets.length === 0 && (
                <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-dim)' }}>
                  No packets match your filters.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default Upload;
