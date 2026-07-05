const protocolColors = {
  TCP: '#60A5FA',
  UDP: '#C084FC',
  DNS: '#FBBF24',
  ICMP: '#34D399',
};

function getColor(protocol) {
  return protocolColors[protocol] || '#7D8A99';
}

function SequenceDiagram({ packets }) {
  if (!packets || packets.length === 0) return null;

  // Identify the two unique IPs involved (assumes a 2-party conversation)
  const ips = [...new Set(packets.flatMap((p) => [p.source_ip, p.dest_ip]))];
  const leftIp = ips[0];
  const rightIp = ips[1] || ips[0];

  const rowHeight = 56;
  const width = 560;
  const laneX1 = 140;
  const laneX2 = width - 140;
  const topPadding = 50;
  const height = topPadding + packets.length * rowHeight + 30;

  return (
    <div
      className="p-4 rounded-lg border overflow-x-auto"
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <svg width={width} height={height} style={{ minWidth: width }}>
        {/* Vertical lane lines */}
        <line x1={laneX1} y1={30} x2={laneX1} y2={height - 10} stroke="var(--color-border)" strokeWidth="1.5" />
        <line x1={laneX2} y1={30} x2={laneX2} y2={height - 10} stroke="var(--color-border)" strokeWidth="1.5" />

        {/* Lane labels */}
        <text x={laneX1} y={18} textAnchor="middle" fontSize="11" fontFamily="var(--font-mono)" fill="var(--color-text)">
          {leftIp}
        </text>
        <text x={laneX2} y={18} textAnchor="middle" fontSize="11" fontFamily="var(--font-mono)" fill="var(--color-text)">
          {rightIp}
        </text>

        {/* Arrows for each packet */}
        {packets.map((packet, index) => {
          const y = topPadding + index * rowHeight;
          const goingRight = packet.source_ip === leftIp;
          const x1 = goingRight ? laneX1 : laneX2;
          const x2 = goingRight ? laneX2 : laneX1;
          const color = getColor(packet.protocol);
          const markerId = `arrow-${packet.id}`;

          return (
            <g key={packet.id}>
              <defs>
                <marker
                  id={markerId}
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient={goingRight ? 'auto' : 'auto-start-reverse'}
                >
                  <path d="M0,0 L10,5 L0,10 Z" fill={color} />
                </marker>
              </defs>

              <line
                x1={x1}
                y1={y}
                x2={x2}
                y2={y}
                stroke={color}
                strokeWidth="2"
                markerEnd={`url(#${markerId})`}
              />

              <text
                x={(x1 + x2) / 2}
                y={y - 6}
                textAnchor="middle"
                fontSize="10"
                fontFamily="var(--font-mono)"
                fill={color}
                fontWeight="600"
              >
                {packet.protocol} {packet.flags ? `[${packet.flags}]` : ''}
              </text>

              <text
                x={(x1 + x2) / 2}
                y={y + 14}
                textAnchor="middle"
                fontSize="9"
                fill="var(--color-text-dim)"
              >
                #{packet.packet_number}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default SequenceDiagram;