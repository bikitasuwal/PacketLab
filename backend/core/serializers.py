from rest_framework import serializers
from .models import Lab, Packet


class PacketSerializer(serializers.ModelSerializer):
    class Meta:
        model = Packet
        fields = [
            'id', 'packet_number', 'source_ip', 'dest_ip',
            'protocol', 'flags', 'summary', 'raw_data'
        ]


class LabListSerializer(serializers.ModelSerializer):
    """Lightweight version — used for the browse/list page, no packets included"""
    class Meta:
        model = Lab
        fields = [
            'id', 'title', 'topic', 'difficulty', 'is_published'
        ]


class LabDetailSerializer(serializers.ModelSerializer):
    """Full version — used when opening a single lab, includes everything"""
    packets = PacketSerializer(many=True, read_only=True)

    class Meta:
        model = Lab
        fields = [
            'id', 'title', 'topic', 'difficulty', 'challenge_question',
            'resources', 'is_published', 'packets'
        ]
        # Note: correct_answer is intentionally excluded — 
        # never send the answer key to the frontend