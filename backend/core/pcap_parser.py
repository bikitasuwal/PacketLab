import os
import tempfile
from scapy.all import rdpcap, TCP, UDP, DNS, ICMP, IP, ARP, Ether


TCP_FLAG_MAP = {
    0x01: 'FIN',
    0x02: 'SYN',
    0x04: 'RST',
    0x08: 'PSH',
    0x10: 'ACK',
    0x20: 'URG',
}


def _format_tcp_flags(flags_int):
    flags = []
    for bit, name in TCP_FLAG_MAP.items():
        if flags_int & bit:
            flags.append(name)
    return ','.join(flags) if flags else ''


def _detect_protocol(pkt):
    if pkt.haslayer(DNS):
        return 'DNS'
    if pkt.haslayer(ICMP):
        return 'ICMP'
    if pkt.haslayer(TCP):
        sport = pkt[TCP].sport
        dport = pkt[TCP].dport
        if dport == 80 or dport == 8080 or sport == 80 or sport == 8080:
            return 'HTTP'
        if dport == 443 or sport == 443:
            return 'TLS'
        return 'TCP'
    if pkt.haslayer(UDP):
        return 'UDP'
    if pkt.haslayer(ARP):
        return 'ARP'
    return 'IP'


def _build_summary(pkt, protocol):
    if protocol == 'ARP':
        op = 'request' if pkt[ARP].op == 1 else 'reply'
        if pkt[ARP].op == 1:
            return f"ARP {op}: who has {pkt[ARP].pdst}? tell {pkt[ARP].psrc}"
        return f"ARP {op}: {pkt[ARP].psrc} is at {pkt[ARP].hwsrc}"

    if protocol == 'ICMP':
        icmp_type = pkt[ICMP].type
        if icmp_type == 8:
            return 'ICMP echo request'
        if icmp_type == 0:
            return 'ICMP echo reply'
        if icmp_type == 3:
            return f'ICMP destination unreachable (code {pkt[ICMP].code})'
        if icmp_type == 11:
            return 'ICMP time exceeded'
        return f'ICMP type {icmp_type} code {pkt[ICMP].code}'

    if protocol == 'DNS':
        dns = pkt[DNS]
        if dns.qr == 0:
            qname = dns.qd.qname.decode().rstrip('.') if dns.qd else 'unknown'
            qtype = {1: 'A', 28: 'AAAA', 5: 'CNAME', 15: 'MX', 16: 'TXT'}.get(dns.qd.qtype, str(dns.qd.qtype)) if dns.qd else '?'
            return f"DNS query: {qname} ({qtype})"
        else:
            qname = dns.qd.qname.decode().rstrip('.') if dns.qd else 'unknown'
            rcode = dns.rcode
            rcode_names = {0: 'No Error', 1: 'Format Error', 2: 'Server Failure', 3: 'NXDOMAIN', 4: 'Not Implemented', 5: 'Query Refused'}
            if rcode == 3:
                return f"DNS response: {qname} not found (NXDOMAIN)"
            if rcode != 0:
                return f"DNS response: error {rcode_names.get(rcode, rcode)}"
            try:
                if dns.an:
                    answers = []
                    rr = dns.an
                    while rr:
                        if rr.type == 1:
                            answers.append(rr.rdata)
                        elif rr.type == 5:
                            answers.append(rr.rdata.decode().rstrip('.') if isinstance(rr.rdata, bytes) else rr.rdata)
                        try:
                            rr = rr[1] if rr[1].haslayer(DNS) else None
                        except (IndexError, AttributeError):
                            break
                    return f"DNS response: {qname} -> {', '.join(answers) if answers else 'resolved'}"
            except Exception:
                pass
            return f"DNS response: {qname} (rcode={rcode})"

    if protocol == 'HTTP':
        if pkt.haslayer('Raw'):
            payload = pkt['Raw'].load.decode(errors='ignore').split('\r\n')[0]
            return f"HTTP: {payload}"
        sport = pkt[TCP].sport
        dport = pkt[TCP].dport
        return f"HTTP packet, port {sport} -> {dport}"

    if protocol == 'TLS':
        sport = pkt[TCP].sport
        dport = pkt[TCP].dport
        if pkt[TCP].flags & 0x02:
            return f"TLS client hello, port {sport} -> {dport}"
        return f"TLS packet, port {sport} -> {dport}"

    if protocol == 'TCP':
        flags = _format_tcp_flags(pkt[TCP].flags)
        return f"TCP {flags}, port {pkt[TCP].sport} -> {pkt[TCP].dport}" if flags else f"TCP packet, port {pkt[TCP].sport} -> {pkt[TCP].dport}"

    if protocol == 'UDP':
        return f"UDP packet, port {pkt[UDP].sport} -> {pkt[UDP].dport}"

    return pkt.summary()


def parse_pcap_to_packets(pcap_file_path):
    """
    Reads a PCAP file and returns a list of dicts, one per packet,
    ready to be saved as Packet model instances.
    """
    packets = rdpcap(pcap_file_path)
    parsed = []

    for i, pkt in enumerate(packets):
        has_ip = pkt.haslayer(IP)
        has_arp = pkt.haslayer(ARP)

        if has_arp:
            source_ip = pkt[ARP].psrc
            dest_ip = pkt[ARP].pdst
        elif has_ip:
            source_ip = pkt[IP].src
            dest_ip = pkt[IP].dst
        else:
            # Skip non-IP/ARP packets (can't store in GenericIPAddressField)
            continue

        protocol = _detect_protocol(pkt)
        flags = ''

        if pkt.haslayer(TCP):
            flags = _format_tcp_flags(pkt[TCP].flags)

        summary = _build_summary(pkt, protocol).replace('\x00', '')[:255]

        raw_data = {
            'length': len(pkt),
            'time': float(pkt.time) if hasattr(pkt, 'time') else None,
        }
        if has_ip:
            raw_data['ip'] = {'src': pkt[IP].src, 'dst': pkt[IP].dst}
        if has_arp:
            raw_data['mac'] = {'src': pkt[ARP].hwsrc, 'dst': pkt[ARP].hwdst}
            raw_data['arp_op'] = 'who-has' if pkt[ARP].op == 1 else 'is-at'
        if pkt.haslayer(TCP):
            raw_data['tcp'] = {'sport': pkt[TCP].sport, 'dport': pkt[TCP].dport, 'flags': flags}
        elif pkt.haslayer(UDP):
            raw_data['udp'] = {'sport': pkt[UDP].sport, 'dport': pkt[UDP].dport}

        if pkt.haslayer(DNS):
            dns = pkt[DNS]
            dns_info = {}
            qtypes = {1: 'A', 28: 'AAAA', 5: 'CNAME', 15: 'MX', 16: 'TXT', 12: 'PTR', 2: 'NS', 255: 'ANY', 33: 'SRV', 6: 'SOA'}
            if dns.qd:
                qname = dns.qd.qname.decode().rstrip('.') if isinstance(dns.qd.qname, bytes) else str(dns.qd.qname)
                dns_info['query_name'] = qname
                dns_info['query_type'] = qtypes.get(dns.qd.qtype, str(dns.qd.qtype))
            dns_info['response_code'] = dns.rcode
            rcode_names = {0: 'No Error', 1: 'Format Error', 2: 'Server Failure', 3: 'NXDOMAIN', 4: 'Not Implemented', 5: 'Query Refused'}
            dns_info['rcode_name'] = rcode_names.get(dns.rcode, str(dns.rcode))
            if dns.an:
                answers = []
                rr = dns.an
                while rr:
                    try:
                        if hasattr(rr, 'rdata'):
                            answers.append(str(rr.rdata))
                        rr = rr[1] if rr[1].haslayer(DNS) else None
                    except (IndexError, AttributeError):
                        break
                if answers:
                    dns_info['answers'] = answers
            dns_info['is_response'] = dns.qr == 1
            raw_data['dns'] = dns_info

        parsed.append({
            'packet_number': len(parsed) + 1,
            'source_ip': source_ip,
            'dest_ip': dest_ip,
            'protocol': protocol,
            'flags': flags,
            'summary': summary[:255],
            'raw_data': raw_data,
        })

    return parsed


def parse_pcap_file(file_obj):
    """
    Accepts a file-like object (e.g. Django UploadedFile), writes it to a
    temp file, parses it, and returns the same list of packet dicts.
    """
    suffix = os.path.splitext(getattr(file_obj, 'name', ''))[1] or '.pcap'
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        for chunk in file_obj.chunks():
            tmp.write(chunk)
        tmp_path = tmp.name
    try:
        return parse_pcap_to_packets(tmp_path)
    finally:
        os.unlink(tmp_path)
