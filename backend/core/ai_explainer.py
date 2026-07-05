import os
from groq import Groq

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))


def explain_packet(packet):
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