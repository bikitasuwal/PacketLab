from rest_framework import serializers
from .models import Lab, Packet, Challenge, Attempt, Rating


class PacketSerializer(serializers.ModelSerializer):
    class Meta:
        model = Packet
        fields = [
            'id', 'packet_number', 'source_ip', 'dest_ip',
            'protocol', 'flags', 'summary', 'raw_data'
        ]


class AttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attempt
        fields = ['id', 'answer_given', 'is_correct', 'submitted_at']


class ChallengeSerializer(serializers.ModelSerializer):
    packets = PacketSerializer(many=True, read_only=True)
    is_completed = serializers.SerializerMethodField()
    previous_attempts = serializers.SerializerMethodField()

    class Meta:
        model = Challenge
        fields = ['id', 'order', 'question', 'packets', 'is_completed', 'previous_attempts']

    def get_is_completed(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return Attempt.objects.filter(
            student=request.user, challenge=obj, is_correct=True
        ).exists()

    def get_previous_attempts(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return []
        attempts = Attempt.objects.filter(
            student=request.user, challenge=obj, is_correct=False
        ).order_by('-submitted_at')[:5]
        return AttemptSerializer(attempts, many=True).data


class RatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rating
        fields = ['id', 'lab', 'score', 'created_at']
        read_only_fields = ['id', 'created_at']


class LabListSerializer(serializers.ModelSerializer):
    average_rating = serializers.SerializerMethodField()
    is_completed = serializers.SerializerMethodField()
    challenges_completed = serializers.SerializerMethodField()
    total_challenges = serializers.SerializerMethodField()

    class Meta:
        model = Lab
        fields = [
            'id', 'title', 'topic', 'difficulty', 'is_published',
            'is_completed', 'challenges_completed', 'total_challenges',
            'average_rating'
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

    def get_average_rating(self, obj):
        from django.db.models import Avg
        result = obj.ratings.aggregate(avg=Avg('score'))
        return round(result['avg'], 1) if result['avg'] else None


class LabDetailSerializer(serializers.ModelSerializer):
    challenges = ChallengeSerializer(many=True, read_only=True)

    class Meta:
        model = Lab
        fields = ['id', 'title', 'topic', 'difficulty', 'resources', 'is_published', 'challenges']