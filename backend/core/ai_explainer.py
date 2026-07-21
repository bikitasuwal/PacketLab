import os
import json
from groq import Groq

def get_client():
    return Groq(api_key=os.environ.get("GROQ_API_KEY"))


def explain_packet(packet):
    client = get_client()

    prompt = f"""You are helping a beginner cybersecurity student understand a network packet.
Explain this packet in plain, simple English in 2-3 sentences maximum. Avoid jargon where possible.

Packet details:
Protocol: {packet.protocol}
Source IP: {packet.source_ip}
Destination IP: {packet.dest_ip}
Flags: {packet.flags or 'none'}
Summary: {packet.summary}
"""

    response = client.chat.completions.create(
        messages=[
            {"role": "system", "content": "You are a friendly cybersecurity tutor."},
            {"role": "user", "content": prompt},
        ],
        model="llama-3.3-70b-versatile",
        max_completion_tokens=200,
        temperature=0.5,
    )

    return response.choices[0].message.content


def generate_challenges_for_lab(lab):
    packets = lab.packets.all().order_by('packet_number')

    # Limit to 50 packets to avoid token limits; sample evenly if too many
    max_packets = 50
    if packets.count() > max_packets:
        step = packets.count() // max_packets
        packet_list = list(packets)[::step][:max_packets]
    else:
        packet_list = list(packets)

    num_challenges = 5

    packet_summaries = []
    for p in packet_list:
        parts = [
            f"Packet {p.packet_number}: {p.protocol} | {p.source_ip} -> {p.dest_ip}",
        ]
        if p.flags:
            parts.append(f"flags: {p.flags}")
        if p.raw_data:
            if 'dns' in p.raw_data:
                dns = p.raw_data['dns']
                if dns.get('query_name'):
                    parts.append(f"query: {dns['query_name']}")
                if dns.get('query_type'):
                    parts.append(f"type: {dns['query_type']}")
                if 'response_code' in dns:
                    parts.append(f"rcode: {dns['response_code']} ({dns.get('rcode_name', '')})")
                if dns.get('answers'):
                    parts.append(f"answers: {', '.join(dns['answers'])}")
                if dns.get('is_response') is not None:
                    parts.append(f"is_response: {dns['is_response']}")
            if 'tcp' in p.raw_data:
                tcp = p.raw_data['tcp']
                parts.append(f"ports: {tcp['sport']} -> {tcp['dport']}")
            if 'udp' in p.raw_data:
                udp = p.raw_data['udp']
                parts.append(f"ports: {udp['sport']} -> {udp['dport']}")
        parts.append(f"summary: {p.summary}")
        packet_summaries.append(" | ".join(parts))

    packet_summaries_str = "\n".join(packet_summaries)

    prompt = f"""You are creating quiz questions for a cybersecurity networking course,
based on a real captured network traffic lab called "{lab.title}" (topic: {lab.topic}).

Here are the packets in this capture (with full details):
{packet_summaries_str}

Generate exactly {num_challenges} challenge questions. Every question MUST be answerable
by looking at the packet data above. Use specific data points from the packets.

MANDATORY question types (use a variety of these):
- IP identification: "What is the source IP address in packet X?"
- Packet counting by IP: "How many packets are sent from [specific IP]?"
- Port identification: "What destination port is used in packet X?"
- Protocol questions: "Which protocol does packet X use?"
- Flag analysis: "Which packets have the SYN flag set?"
- DNS-specific: "What query type is used in packet X?" or "What is the response code for the DNS query in packet X?"
- DNS answers: "What IP address does the DNS response in packet X return?"
- Comparison: "Which IP sends more packets — [IP A] or [IP B]?"
- Counting: "How many packets use the [specific] flag?"

Every question MUST reference at least one specific IP address, packet number, or protocol
from the data above. Questions should test whether the student read and understood the
actual packet data.

Do NOT generate theory/definition questions like "What is DNS?" or "Explain TCP handshake".

Also assess the difficulty of this lab based on the protocols and complexity.
Use one of: "Beginner", "Intermediate", or "Advanced".

Respond ONLY with valid JSON in this format:
{{
  "difficulty": "Beginner",
  "challenges": [
    {{
      "question": "...",
      "correct_answer": "...",
      "relevant_packet_numbers": [1, 2]
    }}
  ]
}}
"""

    client = get_client()
    response = client.chat.completions.create(
        messages=[
            {"role": "system", "content": "You are a cybersecurity quiz generator. Every question MUST reference specific data from the packet capture. Never generate definition or theory questions. Only output valid JSON."},
            {"role": "user", "content": prompt},
        ],
        model="llama-3.3-70b-versatile",
        max_completion_tokens=1600,
        temperature=0.3,
    )

    raw_content = response.choices[0].message.content.strip()

    if raw_content.startswith('```'):
        raw_content = raw_content.strip('`')
        if raw_content.startswith('json'):
            raw_content = raw_content[4:].strip()

    try:
        data = json.loads(raw_content)
        if isinstance(data, dict) and 'challenges' in data:
            return data.get('challenges', []), data.get('difficulty')
        return data, None
    except json.JSONDecodeError:
        return [], None