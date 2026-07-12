import { protocolColors } from '../constants/styles';

const protocolBg = {
  TCP: 'rgba(96,165,250,0.15)',
  UDP: 'rgba(192,132,252,0.15)',
  DNS: 'rgba(251,191,36,0.15)',
  ICMP: 'rgba(52,211,153,0.15)',
  HTTP: 'rgba(248,113,113,0.15)',
};

function getColor(protocol) {
  return protocolColors[protocol] || '#7D8A99';
}

function getBg(protocol) {
  return protocolBg[protocol] || 'rgba(125,138,153,0.15)';
}

function SequenceDiagram({ packets }) {
  if (!packets || packets.length === 0) return null;

  // Identify the two unique IPs involved (assumes a 2-party conversation)
  const ips = [...new Set(packets.flatMap((p) => [p.source_ip, p.dest_ip]))];
  const leftIp = ips[0];
  const rightIp = ips[1] || ips[0];

  const rowHeight = 64;
  const width = 600;
  const laneX1 = 130;
  const laneX2 = width - 130;
  const topPadding = 56;
  const height = topPadding + packets.length * rowHeight + 20;

  return (
    <div
      className="p-4 rounded-lg border overflow-x-auto"
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <svg width={width} height={height} style={{ minWidth: width }}>
        {/* Dashed vertical lane lines */}
        <line
          x1={laneX1} y1={38} x2={laneX1} y2={height - 8}
          stroke="var(--color-border)" strokeWidth="1" strokeDasharray="4 3"
        />
        <line
          x1={laneX2} y1={38} x2={laneX2} y2={height - 8}
          stroke="var(--color-border)" strokeWidth="1" strokeDasharray="4 3"
        />

        {/* Lane labels with background */}
        <rect x={laneX1 - 40} y={4} width={80} height={22} rx={4} fill="var(--color-surface-hover)" />
        <text x={laneX1} y={19} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600" fill="var(--color-text)">
          {leftIp}
        </text>

        <rect x={laneX2 - 40} y={4} width={80} height={22} rx={4} fill="var(--color-surface-hover)" />
        <text x={laneX2} y={19} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600" fill="var(--color-text)">
          {rightIp}
        </text>

        {/* Arrows for each packet */}
        {packets.map((packet, index) => {
          const y = topPadding + index * rowHeight;
          const goingRight = packet.source_ip === leftIp;
          const x1 = goingRight ? laneX1 : laneX2;
          const x2 = goingRight ? laneX2 : laneX1;
          const color = getColor(packet.protocol);
          const bg = getBg(packet.protocol);
          const markerId = `arrow-${packet.id}`;
          const midX = (x1 + x2) / 2;
          const isSyn = packet.flags?.includes('SYN');
          const isFin = packet.flags?.includes('FIN');
          const dashArray = (isSyn || isFin) ? '6 3' : 'none';

          return (
            <g key={packet.id}>
              <defs>
                <marker
                  id={markerId}
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto"
                >
                  <path d="M0,0 L10,5 L0,10 Z" fill={color} />
                </marker>
              </defs>

              {/* Arrow line */}
              <line
                x1={x1} y1={y} x2={x2} y2={y}
                stroke={color}
                strokeWidth="1.5"
                strokeDasharray={dashArray}
                markerEnd={`url(#${markerId})`}
              />

              {/* Protocol badge */}
              <rect
                x={midX - 26} y={y - 20}
                width={52} height={16}
                rx={3}
                fill={bg}
              />
              <text
                x={midX} y={y - 9}
                textAnchor="middle"
                fontSize="9"
                fontFamily="var(--font-mono)"
                fontWeight="700"
                fill={color}
              >
                {packet.protocol}{packet.flags ? ` [${packet.flags}]` : ''}
              </text>

              {/* Packet number circle */}
              <circle cx={x1 + (goingRight ? -16 : 16)} cy={y} r={9} fill="var(--color-bg)" stroke="var(--color-border)" strokeWidth="1" />
              <text
                x={x1 + (goingRight ? -16 : 16)} y={y + 3}
                textAnchor="middle"
                fontSize="8"
                fontFamily="var(--font-mono)"
                fontWeight="600"
                fill="var(--color-text-dim)"
              >
                {packet.packet_number}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default SequenceDiagram;
