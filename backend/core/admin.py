from django.contrib import admin
from django.contrib import messages
from .models import Lab, Packet, Challenge, Attempt, Progress
from .pcap_parser import parse_pcap_to_packets
from .ai_explainer import generate_challenges_for_lab


@admin.register(Lab)
class LabAdmin(admin.ModelAdmin):
    list_display = ['title', 'topic', 'difficulty', 'is_published']
    actions = ['generate_challenges_with_ai']

    def save_model(self, request, obj, form, change):
        is_new_file = 'pcap_file' in form.changed_data
        super().save_model(request, obj, form, change)

        if is_new_file and obj.pcap_file:
            Packet.objects.filter(lab=obj).delete()
            parsed_packets = parse_pcap_to_packets(obj.pcap_file.path)
            for p in parsed_packets:
                Packet.objects.create(lab=obj, **p)

    def generate_challenges_with_ai(self, request, queryset):
        for lab in queryset:
            if not lab.packets.exists():
                self.message_user(request, f"{lab.title}: no packets found, skipped.", level=messages.WARNING)
                continue

            try:
                generated = generate_challenges_for_lab(lab)
            except Exception as e:
                self.message_user(request, f"{lab.title}: AI generation failed ({e})", level=messages.ERROR)
                continue

            for item in generated:
                challenge = Challenge.objects.create(
                    lab=lab,
                    order=lab.challenges.count() + 1,
                    question=item['question'],
                    correct_answer=item['correct_answer'],
                )
                Packet.objects.filter(
                    lab=lab, packet_number__in=item.get('relevant_packet_numbers', [])
                ).update(challenge=challenge)

            self.message_user(request, f"{lab.title}: generated {len(generated)} draft challenges. Please review before publishing.")

    generate_challenges_with_ai.short_description = "Generate draft challenges with AI"


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