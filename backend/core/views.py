from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.generics import ListAPIView, RetrieveAPIView
from .models import Lab, Attempt, Progress, Packet, Challenge
from .serializers import LabListSerializer, LabDetailSerializer
from django.shortcuts import get_object_or_404
from .ai_explainer import explain_packet


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    username = request.data.get('username')
    email = request.data.get('email')
    password = request.data.get('password')

    if not username or not password:
        return Response(
            {'error': 'Username and password are required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if User.objects.filter(username=username).exists():
        return Response(
            {'error': 'Username already taken.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    user = User.objects.create_user(username=username, email=email, password=password)
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

    if is_correct:
        correct_challenge_ids_after = correct_challenge_ids_before | {challenge.id}
        is_complete_now = correct_challenge_ids_after >= set(lab.challenges.values_list('id', flat=True))

        if is_complete_now and not was_complete_before:
            progress.labs_completed += 1
            progress.save()

    return Response({
        'is_correct': is_correct,
        'correct_answer': challenge.correct_answer,
        'message': 'Correct! Well done.' if is_correct else f'Not quite. The correct answer was: {challenge.correct_answer}'
    })

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