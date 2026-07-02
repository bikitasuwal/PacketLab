from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.generics import ListAPIView, RetrieveAPIView
from .models import Lab, Attempt, Progress
from .serializers import LabListSerializer, LabDetailSerializer
from django.shortcuts import get_object_or_404


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


class LabDetailView(RetrieveAPIView):
    queryset = Lab.objects.filter(is_published=True)
    serializer_class = LabDetailSerializer
    permission_classes = [IsAuthenticated]

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_answer_view(request, pk):
    lab = get_object_or_404(Lab, pk=pk, is_published=True)
    answer_given = request.data.get('answer', '').strip()

    if not answer_given:
        return Response(
            {'error': 'Answer cannot be empty.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    is_correct = answer_given.lower() == lab.correct_answer.strip().lower()

    Attempt.objects.create(
        student=request.user,
        lab=lab,
        answer_given=answer_given,
        is_correct=is_correct,
        ai_explanation=''  # AI explanation feature comes later
    )

    if is_correct:
        progress, created = Progress.objects.get_or_create(
            student=request.user,
            defaults={'labs_completed': 0, 'total_labs': Lab.objects.filter(is_published=True).count()}
        )
        already_completed = Attempt.objects.filter(
            student=request.user, lab=lab, is_correct=True
        ).count() > 1  # more than 1 means they'd already gotten it right before

        if not already_completed:
            progress.labs_completed += 1
            progress.save()

    return Response({
        'is_correct': is_correct,
        'correct_answer': lab.correct_answer,
        'message': 'Correct! Well done.' if is_correct else f'Not quite. The correct answer was: {lab.correct_answer}'
    })