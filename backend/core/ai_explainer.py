import os
from groq import Groq
import json

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

    num_challenges = min(8, max(5, len(packet_list) // 3))

    packet_summaries = "\n".join([
        f"Packet {p.packet_number}: {p.protocol} | {p.source_ip} -> {p.dest_ip} | "
        f"flags: {p.flags or 'none'} | {p.summary}"
        for p in packet_list
    ])

    prompt = f"""You are creating quiz questions for a cybersecurity networking course,
based on a real captured network traffic lab called "{lab.title}" (topic: {lab.topic}).

Here are the packets in this capture:
{packet_summaries}

Generate exactly {num_challenges} challenge questions that test whether a student correctly
understood this traffic. Each question must have ONE clear, short, unambiguous correct
answer that could be typed as plain text (e.g. a packet number, an IP address, a domain
name, or a short word/number).

Also assess the difficulty of this lab based on the protocols and complexity of the traffic.
Use one of: "Beginner", "Intermediate", or "Advanced".

Respond ONLY with valid JSON, no other text, in exactly this format:
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
            {"role": "system", "content": "You are a precise quiz generator. Only output valid JSON."},
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