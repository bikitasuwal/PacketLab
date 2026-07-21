import os
import glob
from django.core.management.base import BaseCommand
from django.core.files import File
from core.models import Lab, Packet, Challenge
from core.pcap_parser import parse_pcap_to_packets
from core.ai_explainer import generate_challenges_for_lab


PCAP_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), 'media', 'pcaps')

# Map pcap filenames to lab metadata
PCAP_LABS = {
    'real_dns_traffic.pcap': {
        'title': 'Real DNS Query Analysis',
        'topic': 'DNS',
        'difficulty': 'Beginner',
        'resources': [{'title': 'DNS RFC 1035', 'url': 'https://tools.ietf.org/html/rfc1035'}],
    },
    'real_dhcp_traffic.pcap': {
        'title': 'Real DHCP Address Assignment',
        'topic': 'DHCP',
        'difficulty': 'Beginner',
        'resources': [{'title': 'DHCP RFC 2131', 'url': 'https://tools.ietf.org/html/rfc2131'}],
    },
    'real_smtp_traffic.pcap': {
        'title': 'Real SMTP Email Exchange',
        'topic': 'SMTP',
        'difficulty': 'Intermediate',
        'resources': [{'title': 'SMTP RFC 5321', 'url': 'https://tools.ietf.org/html/rfc5321'}],
    },
    'real_vnc_session.pcap': {
        'title': 'Real VNC Remote Desktop Session',
        'topic': 'VNC',
        'difficulty': 'Intermediate',
        'resources': [{'title': 'VNC Protocol', 'url': 'https://datatracker.ietf.org/doc/html/rfc6143'}],
    },
    'real_hsrp_traffic.pcap': {
        'title': 'Real HSRP Gateway Redundancy',
        'topic': 'HSRP',
        'difficulty': 'Advanced',
        'resources': [{'title': 'HSRP RFC 2281', 'url': 'https://tools.ietf.org/html/rfc2281'}],
    },
    'real_icmp_traffic.pcap': {
        'title': 'Real ICMP Traffic Analysis',
        'topic': 'ICMP',
        'difficulty': 'Beginner',
        'resources': [{'title': 'ICMP RFC 792', 'url': 'https://tools.ietf.org/html/rfc792'}],
    },
    'http.cap': {
        'title': 'Real HTTP Web Traffic',
        'topic': 'HTTP',
        'difficulty': 'Beginner',
        'resources': [{'title': 'HTTP RFC 7230', 'url': 'https://tools.ietf.org/html/rfc7230'}],
    },
    'nb6-http.pcap': {
        'title': 'HTTP Browsing Session Capture',
        'topic': 'HTTP',
        'difficulty': 'Beginner',
        'resources': [{'title': 'HTTP RFC 7230', 'url': 'https://tools.ietf.org/html/rfc7230'}],
    },
    'dns_cname_lookup.pcap': {
        'title': 'DNS CNAME Resolution',
        'topic': 'DNS',
        'difficulty': 'Beginner',
        'resources': [{'title': 'DNS RFC 1035', 'url': 'https://tools.ietf.org/html/rfc1035'}],
    },
    'telnet-raw.pcap': {
        'title': 'Real Telnet Session Capture',
        'topic': 'Telnet',
        'difficulty': 'Intermediate',
        'resources': [{'title': 'Telnet RFC 854', 'url': 'https://tools.ietf.org/html/rfc854'}],
    },
    'tcp_full_session.pcap': {
        'title': 'Full TCP Session Analysis',
        'topic': 'TCP',
        'difficulty': 'Intermediate',
        'resources': [{'title': 'TCP RFC 793', 'url': 'https://tools.ietf.org/html/rfc793'}],
    },
}


class Command(BaseCommand):
    help = 'Import real PCAP files from media/pcaps and create labs with AI-generated challenges'

    def add_arguments(self, parser):
        parser.add_argument(
            '--pcap-dir',
            type=str,
            default=PCAP_DIR,
            help='Directory containing pcap files',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be imported without making changes',
        )

    def handle(self, *args, **options):
        pcap_dir = options['pcap_dir']
        dry_run = options['dry_run']

        if not os.path.exists(pcap_dir):
            self.stderr.write(self.style.ERROR(f'Directory not found: {pcap_dir}'))
            return

        # Find all pcap files that have lab metadata defined
        found = []
        for filename, meta in PCAP_LABS.items():
            filepath = os.path.join(pcap_dir, filename)
            if os.path.exists(filepath):
                found.append((filename, filepath, meta))

        if not found:
            self.stdout.write(self.style.WARNING('No matching pcap files found in ' + pcap_dir))
            return

        self.stdout.write(f'Found {len(found)} pcap files to import:\n')

        for filename, filepath, meta in found:
            existing = Lab.objects.filter(title=meta['title']).exists()
            status = 'EXISTS' if existing else 'NEW'
            self.stdout.write(f'  [{status}] {filename} -> {meta["title"]}')

        if dry_run:
            self.stdout.write(self.style.WARNING('\nDry run - no changes made'))
            return

        self.stdout.write('')

        created_count = 0
        for filename, filepath, meta in found:
            # Skip if lab with same title already exists
            if Lab.objects.filter(title=meta['title']).exists():
                self.stdout.write(self.style.WARNING(f'Skipping {filename} (lab already exists)'))
                continue

            try:
                # Create lab
                lab = Lab.objects.create(
                    title=meta['title'],
                    topic=meta['topic'],
                    difficulty=meta['difficulty'],
                    resources=meta['resources'],
                )

                # Save pcap file to lab
                with open(filepath, 'rb') as f:
                    lab.pcap_file.save(filename, File(f), save=True)

                # Parse packets
                parsed_packets = parse_pcap_to_packets(filepath)
                for p in parsed_packets:
                    Packet.objects.create(lab=lab, **p)

                # Generate challenges with AI
                try:
                    generated, difficulty = generate_challenges_for_lab(lab)
                    if difficulty:
                        lab.difficulty = difficulty
                        lab.save(update_fields=['difficulty'])
                    for item in generated:
                        challenge = Challenge.objects.create(
                            lab=lab,
                            order=lab.challenges.count() + 1,
                            question=item['question'],
                            correct_answer=item['correct_answer'],
                        )
                        packet_nums = [int(n) for n in item.get('relevant_packet_numbers', []) if str(n).isdigit()]
                        Packet.objects.filter(
                            lab=lab, packet_number__in=packet_nums
                        ).update(challenge=challenge)
                    self.stdout.write(self.style.SUCCESS(
                        f'  Created: {meta["title"]} ({len(parsed_packets)} packets, {len(generated)} challenges)'
                    ))
                except Exception as e:
                    self.stdout.write(self.style.WARNING(
                        f'  Created: {meta["title"]} ({len(parsed_packets)} packets, AI challenges failed: {e})'
                    ))

                created_count += 1

            except Exception as e:
                self.stderr.write(self.style.ERROR(f'  Failed {filename}: {e}'))

        self.stdout.write(self.style.SUCCESS(f'\nDone! Created {created_count} labs'))
