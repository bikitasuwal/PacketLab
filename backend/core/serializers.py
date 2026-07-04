from rest_framework import serializers
from .models import Lab, Packet, Challenge


class PacketSerializer(serializers.ModelSerializer):
    class Meta:
        model = Packet
        fields = [
            'id', 'packet_number', 'source_ip', 'dest_ip',
            'protocol', 'flags', 'summary', 'raw_data'
        ]


class ChallengeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Challenge
        fields = ['id', 'order', 'question']
        # correct_answer intentionally excluded — never leak the answer key


class LabListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lab
        fields = ['id', 'title', 'topic', 'difficulty', 'is_published']


class LabDetailSerializer(serializers.ModelSerializer):
    packets = PacketSerializer(many=True, read_only=True)
    challenges = ChallengeSerializer(many=True, read_only=True)

    class Meta:
        model = Lab
        fields = [
            'id', 'title', 'topic', 'difficulty',
            'resources', 'is_published', 'packets', 'challenges'
        ]