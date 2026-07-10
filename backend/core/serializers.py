from rest_framework import serializers
from .models import Lab, Packet, Challenge, Attempt


class PacketSerializer(serializers.ModelSerializer):
    class Meta:
        model = Packet
        fields = [
            'id', 'packet_number', 'source_ip', 'dest_ip',
            'protocol', 'flags', 'summary', 'raw_data'
        ]


class ChallengeSerializer(serializers.ModelSerializer):
    packets = PacketSerializer(many=True, read_only=True)
    is_completed = serializers.SerializerMethodField()

    class Meta:
        model = Challenge
        fields = ['id', 'order', 'question', 'packets', 'is_completed']

    def get_is_completed(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return Attempt.objects.filter(
            student=request.user, challenge=obj, is_correct=True
        ).exists()


class LabListSerializer(serializers.ModelSerializer):
    is_completed = serializers.SerializerMethodField()
    challenges_completed = serializers.SerializerMethodField()
    total_challenges = serializers.SerializerMethodField()

    class Meta:
        model = Lab
        fields = [
            'id', 'title', 'topic', 'difficulty', 'is_published',
            'is_completed', 'challenges_completed', 'total_challenges'
        ]

    def get_total_challenges(self, obj):
        return obj.challenges.count()

    def get_challenges_completed(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 0
        return Attempt.objects.filter(
            student=request.user, challenge__lab=obj, is_correct=True
        ).values('challenge').distinct().count()

    def get_is_completed(self, obj):
        total = self.get_total_challenges(obj)
        completed = self.get_challenges_completed(obj)
        return total > 0 and completed == total


class LabDetailSerializer(serializers.ModelSerializer):
    challenges = ChallengeSerializer(many=True, read_only=True)

    class Meta:
        model = Lab
        fields = ['id', 'title', 'topic', 'difficulty', 'resources', 'is_published', 'challenges']