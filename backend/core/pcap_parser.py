from scapy.all import rdpcap, TCP, UDP, DNS, ICMP, IP


def parse_pcap_to_packets(pcap_file_path):
    """
    Reads a PCAP file and returns a list of dicts, one per packet,
    ready to be saved as Packet model instances.
    """
    packets = rdpcap(pcap_file_path)
    parsed = []

    for i, pkt in enumerate(packets):
        if not pkt.haslayer(IP):
            continue  # skip non-IP packets (e.g. ARP) for now

        source_ip = pkt[IP].src
        dest_ip = pkt[IP].dst
        protocol = 'IP'
        flags = ''
        summary = ''

        if pkt.haslayer(TCP):
            protocol = 'TCP'
            tcp_flags = pkt[TCP].flags
            flags = str(tcp_flags)
            summary = f"TCP packet, port {pkt[TCP].sport} -> {pkt[TCP].dport}"

        elif pkt.haslayer(UDP):
            protocol = 'UDP'
            summary = f"UDP packet, port {pkt[UDP].sport} -> {pkt[UDP].dport}"

            if pkt.haslayer(DNS):
                protocol = 'DNS'
                dns_layer = pkt[DNS]
                if dns_layer.qr == 0:
                    summary = f"DNS query for {dns_layer.qd.qname.decode() if dns_layer.qd else 'unknown'}"
                else:
                    summary = "DNS response"

        elif pkt.haslayer(ICMP):
            protocol = 'ICMP'
            icmp_type = pkt[ICMP].type
            summary = 'ICMP echo request' if icmp_type == 8 else 'ICMP echo reply' if icmp_type == 0 else f'ICMP type {icmp_type}'

        parsed.append({
            'packet_number': i + 1,
            'source_ip': source_ip,
            'dest_ip': dest_ip,
            'protocol': protocol,
            'flags': flags,
            'summary': summary,
            'raw_data': {
                'length': len(pkt),
                'time': float(pkt.time) if hasattr(pkt, 'time') else None,
            }
        })

    return parsed