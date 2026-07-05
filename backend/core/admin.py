from django.contrib import admin
from .models import Lab, Packet, Challenge, Attempt, Progress
from .pcap_parser import parse_pcap_to_packets


@admin.register(Lab)
class LabAdmin(admin.ModelAdmin):
    list_display = ['title', 'topic', 'difficulty', 'is_published']

    def save_model(self, request, obj, form, change):
        is_new_file = 'pcap_file' in form.changed_data
        super().save_model(request, obj, form, change)

        if is_new_file and obj.pcap_file:
            Packet.objects.filter(lab=obj).delete()
            parsed_packets = parse_pcap_to_packets(obj.pcap_file.path)
            for p in parsed_packets:
                Packet.objects.create(lab=obj, **p)


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