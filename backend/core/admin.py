from django.contrib import admin
from django.contrib import messages
from .models import Lab, Packet, Challenge, Attempt, Progress, Rating
from .pcap_parser import parse_pcap_to_packets
from .ai_explainer import generate_challenges_for_lab


@admin.register(Lab)
class LabAdmin(admin.ModelAdmin):
    list_display = ['title', 'topic', 'difficulty', 'is_published']

    def save_model(self, request, obj, form, change):
        is_new_file = 'pcap_file' in form.changed_data
        super().save_model(request, obj, form, change)

        if is_new_file and obj.pcap_file:
            Packet.objects.filter(lab=obj).delete()
            Challenge.objects.filter(lab=obj).delete()

            try:
                parsed_packets = parse_pcap_to_packets(obj.pcap_file.path)
                for p in parsed_packets:
                    Packet.objects.create(lab=obj, **p)
            except Exception as e:
                self.message_user(request, f"Failed to parse pcap: {e}", level=messages.ERROR)
                return

            try:
                generated = generate_challenges_for_lab(obj)
                for item in generated:
                    challenge = Challenge.objects.create(
                        lab=obj,
                        order=obj.challenges.count() + 1,
                        question=item['question'],
                        correct_answer=item['correct_answer'],
                    )
                    Packet.objects.filter(
                        lab=obj, packet_number__in=item.get('relevant_packet_numbers', [])
                    ).update(challenge=challenge)
                self.message_user(
                    request,
                    f"Created {len(parsed_packets)} packets and {len(generated)} challenges."
                )
            except Exception as e:
                self.message_user(
                    request,
                    f"Parsed {len(parsed_packets)} packets, but AI challenge generation failed: {e}",
                    level=messages.WARNING
                )


@admin.register(Challenge)
class ChallengeAdmin(admin.ModelAdmin):
    list_display = ['lab', 'order', 'question']
    ordering = ['lab', 'order']


@admin.register(Packet)
class PacketAdmin(admin.ModelAdmin):
    list_display = ['lab', 'packet_number', 'protocol', 'source_ip', 'dest_ip', 'challenge']
    list_editable = ['challenge']
    list_filter = ['lab', 'protocol']
    ordering = ['lab', 'packet_number']


admin.site.register(Attempt)
admin.site.register(Progress)
admin.site.register(Rating)
