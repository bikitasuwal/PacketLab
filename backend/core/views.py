import re
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.db import transaction
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.generics import ListAPIView, RetrieveAPIView
from .models import Lab, Attempt, Progress, Packet, Challenge, Rating
from .serializers import LabListSerializer, LabDetailSerializer, RatingSerializer
from django.shortcuts import get_object_or_404
from .ai_explainer import explain_packet

EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$')
PASSWORD_REGEX = re.compile(r'^(?=.*[A-Za-z])(?=.*\d).{8,}$')


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    username = request.data.get('username')
    email = request.data.get('email')
    password = request.data.get('password')
    first_name = request.data.get('first_name', '')
    last_name = request.data.get('last_name', '')

    if not username or not password:
        return Response(
            {'error': 'Username and password are required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if email and not EMAIL_REGEX.match(email):
        return Response(
            {'error': 'Please enter a valid email address.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not PASSWORD_REGEX.match(password):
        return Response(
            {'error': 'Password must be at least 8 characters and contain at least one letter and one number.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if User.objects.filter(username=username).exists():
        return Response(
            {'error': 'Username already taken.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    user = User.objects.create_user(
        username=username, email=email, password=password,
        first_name=first_name, last_name=last_name
    )
    return Response(
        {'message': 'User registered successfully.', 'username': user.username},
        status=status.HTTP_201_CREATED
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')

    user = authenticate(username=username, password=password)

    if user is None:
        return Response(
            {'error': 'Invalid credentials.'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'username': user.username,
        'is_staff': user.is_staff,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    try:
        refresh_token = request.data.get('refresh')
        token = RefreshToken(refresh_token)
        token.blacklist()
        return Response({'message': 'Logged out successfully.'}, status=status.HTTP_200_OK)
    except Exception:
        return Response({'error': 'Invalid or missing refresh token.'}, status=status.HTTP_400_BAD_REQUEST)
    
class LabListView(ListAPIView):
    queryset = Lab.objects.filter(is_published=True)
    serializer_class = LabListSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_context(self):
        return {'request': self.request}


class LabDetailView(RetrieveAPIView):
    queryset = Lab.objects.filter(is_published=True)
    serializer_class = LabDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_context(self):
        return {'request': self.request}



@api_view(['POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def submit_answer_view(request, pk):
    challenge = get_object_or_404(Challenge, pk=pk)
    answer_given = request.data.get('answer', '').strip()

    if not answer_given:
        return Response(
            {'error': 'Answer cannot be empty.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    is_correct = answer_given.lower() == challenge.correct_answer.strip().lower()
    lab = challenge.lab

    # Ensure a Progress row exists as soon as the student engages with any lab,
    # and keep total_labs in sync with however many published labs currently exist
    current_total = Lab.objects.filter(is_published=True).count()
    progress, created = Progress.objects.get_or_create(
        student=request.user,
        defaults={'labs_completed': 0, 'total_labs': current_total}
    )
    if progress.total_labs != current_total:
        progress.total_labs = current_total
        progress.save()

    # Check completion status BEFORE this attempt
    correct_challenge_ids_before = set(
        Attempt.objects.filter(
            student=request.user, challenge__lab=lab, is_correct=True
        ).values_list('challenge_id', flat=True)
    )
    was_complete_before = correct_challenge_ids_before >= set(lab.challenges.values_list('id', flat=True))

    Attempt.objects.create(
        student=request.user,
        challenge=challenge,
        answer_given=answer_given,
        is_correct=is_correct,
        ai_explanation=''
    )

    # Count total wrong attempts for this challenge
    wrong_attempts = Attempt.objects.filter(
        student=request.user, challenge=challenge, is_correct=False
    ).count()

    response_data = {
        'is_correct': is_correct,
        'message': 'Correct! Well done.' if is_correct else 'Not quite. Try again!',
    }

    if is_correct:
        correct_challenge_ids_after = correct_challenge_ids_before | {challenge.id}
        is_complete_now = correct_challenge_ids_after >= set(lab.challenges.values_list('id', flat=True))

        if is_complete_now and not was_complete_before:
            progress.labs_completed += 1
            progress.save()
    elif wrong_attempts >= 3:
        response_data['show_answer'] = True
        response_data['correct_answer'] = challenge.correct_answer

    return Response(response_data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_progress_view(request):
    current_total = Lab.objects.filter(is_published=True).count()

    progress, created = Progress.objects.get_or_create(
        student=request.user,
        defaults={'labs_completed': 0, 'total_labs': current_total}
    )

    # Keep total_labs in sync even if it already existed with a stale value
    if progress.total_labs != current_total:
        progress.total_labs = current_total
        progress.save()

    return Response({
        'labs_completed': progress.labs_completed,
        'total_labs': progress.total_labs,
        'last_activity': progress.last_activity,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def explain_packet_view(request, pk):
    packet = get_object_or_404(Packet, pk=pk)

    try:
        explanation = explain_packet(packet)
    except Exception as e:
        return Response(
            {'error': 'Could not generate explanation right now.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

    return Response({'explanation': explanation})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def rate_lab_view(request, pk):
    lab = get_object_or_404(Lab, pk=pk)
    score = request.data.get('score')

    if not isinstance(score, int) or score < 1 or score > 5:
        return Response(
            {'error': 'Score must be an integer between 1 and 5.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    rating, created = Rating.objects.update_or_create(
        student=request.user,
        lab=lab,
        defaults={'score': score}
    )

    return Response({
        'message': 'Rating saved.' if created else 'Rating updated.',
        'score': rating.score,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def lab_rating_view(request, pk):
    lab = get_object_or_404(Lab, pk=pk)
    rating = Rating.objects.filter(student=request.user, lab=lab).first()
    from django.db.models import Avg
    avg = lab.ratings.aggregate(avg=Avg('score'))['avg']

    return Response({
        'user_rating': rating.score if rating else None,
        'average_rating': round(avg, 1) if avg else None,
        'total_ratings': lab.ratings.count(),
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_pcap_view(request):
    pcap_file = request.FILES.get('pcap_file')
    if not pcap_file:
        return Response(
            {'error': 'No file provided.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not pcap_file.name.endswith('.pcap'):
        return Response(
            {'error': 'Only .pcap files are supported.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        from .pcap_parser import parse_pcap_file
        packets = parse_pcap_file(pcap_file)
        if not packets:
            return Response(
                {'error': 'No packets found in the file.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Build protocol stats
        protocols = {}
        for p in packets:
            proto = p['protocol']
            protocols[proto] = protocols.get(proto, 0) + 1

        return Response({
            'packets': packets,
            'count': len(packets),
            'protocols': protocols,
            'filename': pcap_file.name,
        })

    except ImportError:
        return Response(
            {'error': 'PCAP parsing is not available.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    except Exception as e:
        return Response(
            {'error': f'Failed to parse PCAP file: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def explain_uploaded_packet_view(request):
    """Explain a single packet from uploaded data (not from DB)."""
    packet_data = request.data.get('packet')
    if not packet_data:
        return Response(
            {'error': 'No packet data provided.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    class PacketProxy:
        def __init__(self, d):
            for k, v in d.items():
                setattr(self, k, v)

    try:
        explanation = explain_packet(PacketProxy(packet_data))
        return Response({'explanation': explanation})
    except Exception as e:
        return Response(
            {'error': 'Could not generate explanation.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )