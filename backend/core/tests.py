import pytest
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from core.models import Lab, Packet, Challenge, Attempt, Progress
from unittest.mock import patch

@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def authenticated_client(api_client):
    user = User.objects.create_user(username='labtester', password='testpass123')
    login_response = api_client.post('/api/auth/login/', {
        'username': 'labtester',
        'password': 'testpass123'
    })
    access_token = login_response.data['access']
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
    return api_client


# ---------- Auth tests ----------

@pytest.mark.django_db
def test_register_success(api_client):
    response = api_client.post('/api/auth/register/', {
        'username': 'testuser1',
        'email': 'testuser1@test.com',
        'password': 'testpass123'
    })
    assert response.status_code == 201
    assert response.data['username'] == 'testuser1'


@pytest.mark.django_db
def test_register_duplicate_username(api_client):
    User.objects.create_user(username='dupeuser', password='pass123')
    response = api_client.post('/api/auth/register/', {
        'username': 'dupeuser',
        'email': 'dupe@test.com',
        'password': 'pass456'
    })
    assert response.status_code == 400


@pytest.mark.django_db
def test_register_missing_fields(api_client):
    response = api_client.post('/api/auth/register/', {
        'username': '',
        'password': ''
    })
    assert response.status_code == 400


@pytest.mark.django_db
def test_login_success(api_client):
    User.objects.create_user(username='loginuser', password='mypassword')
    response = api_client.post('/api/auth/login/', {
        'username': 'loginuser',
        'password': 'mypassword'
    })
    assert response.status_code == 200
    assert 'access' in response.data
    assert 'refresh' in response.data


@pytest.mark.django_db
def test_login_invalid_credentials(api_client):
    User.objects.create_user(username='loginuser2', password='correctpass')
    response = api_client.post('/api/auth/login/', {
        'username': 'loginuser2',
        'password': 'wrongpass'
    })
    assert response.status_code == 401


@pytest.mark.django_db
def test_logout_success(api_client):
    User.objects.create_user(username='logoutuser', password='pass123')
    login_response = api_client.post('/api/auth/login/', {
        'username': 'logoutuser',
        'password': 'pass123'
    })
    access_token = login_response.data['access']
    refresh_token = login_response.data['refresh']

    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
    response = api_client.post('/api/auth/logout/', {'refresh': refresh_token})
    assert response.status_code == 200


@pytest.mark.django_db
def test_logout_without_token(api_client):
    response = api_client.post('/api/auth/logout/', {'refresh': 'sometoken'})
    assert response.status_code == 401


@pytest.mark.django_db
def test_dummy_users_can_login(api_client):
    dummy_users = [
        ('priya_s', 'pass12345'),
        ('rahul_k', 'pass12345'),
        ('sneha_t', 'pass12345'),
        ('arjun_m', 'pass12345'),
        ('kabin_r', 'pass12345'),
    ]

    for username, password in dummy_users:
        User.objects.create_user(username=username, password=password)

        login_response = api_client.post('/api/auth/login/', {
            'username': username, 'password': password
        })
        assert login_response.status_code == 200

        access_token = login_response.data['access']
        refresh_token = login_response.data['refresh']

        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        logout_response = api_client.post('/api/auth/logout/', {'refresh': refresh_token})
        assert logout_response.status_code == 200

        api_client.credentials()


# ---------- Lab / Packet tests ----------

@pytest.mark.django_db
def test_lab_list_requires_auth(api_client):
    response = api_client.get('/api/labs/')
    assert response.status_code == 401


@pytest.mark.django_db
def test_lab_list_returns_published_labs(authenticated_client):
    Lab.objects.create(
        title='Test Lab 1', topic='TCP', difficulty='Beginner',
        pcap_file='pcaps/test1.pcap', is_published=True
    )
    Lab.objects.create(
        title='Test Lab 2 (draft)', topic='DNS', difficulty='Beginner',
        pcap_file='pcaps/test2.pcap', is_published=False
    )

    response = authenticated_client.get('/api/labs/')
    assert response.status_code == 200
    assert len(response.data) == 1
    assert response.data[0]['title'] == 'Test Lab 1'


@pytest.mark.django_db
def test_lab_detail_includes_packets_and_challenges(authenticated_client):
    lab = Lab.objects.create(
        title='Handshake Lab', topic='TCP', difficulty='Beginner',
        pcap_file='pcaps/handshake.pcap', is_published=True
    )
    challenge = Challenge.objects.create(
        lab=lab, order=1, question='Which packet is SYN?',
        correct_answer='Packet 1'
    )
    Packet.objects.create(
        lab=lab, challenge=challenge, packet_number=1, source_ip='192.168.1.5',
        dest_ip='93.184.216.34', protocol='TCP', flags='SYN',
        summary='Client requests connection'
    )

    response = authenticated_client.get(f'/api/labs/{lab.id}/')
    assert response.status_code == 200
    assert len(response.data['challenges']) == 1
    assert len(response.data['challenges'][0]['packets']) == 1
    assert 'correct_answer' not in response.data['challenges'][0]


@pytest.mark.django_db
def test_lab_detail_not_found(authenticated_client):
    response = authenticated_client.get('/api/labs/9999/')
    assert response.status_code == 404


# ---------- Challenge submission tests ----------

@pytest.mark.django_db
def test_submit_correct_answer(authenticated_client):
    lab = Lab.objects.create(
        title='Submit Test Lab', topic='TCP', difficulty='Beginner',
        pcap_file='pcaps/test.pcap', is_published=True
    )
    challenge = Challenge.objects.create(
        lab=lab, order=1, question='Q?', correct_answer='Packet 2'
    )

    response = authenticated_client.post(f'/api/challenges/{challenge.id}/submit/', {
        'answer': 'Packet 2'
    })
    assert response.status_code == 200
    assert response.data['is_correct'] is True


@pytest.mark.django_db
def test_submit_incorrect_answer(authenticated_client):
    lab = Lab.objects.create(
        title='Submit Test Lab 2', topic='TCP', difficulty='Beginner',
        pcap_file='pcaps/test.pcap', is_published=True
    )
    challenge = Challenge.objects.create(
        lab=lab, order=1, question='Q?', correct_answer='Packet 2'
    )

    response = authenticated_client.post(f'/api/challenges/{challenge.id}/submit/', {
        'answer': 'Packet 1'
    })
    assert response.status_code == 200
    assert response.data['is_correct'] is False
    assert response.data['correct_answer'] == 'Packet 2'


@pytest.mark.django_db
def test_submit_empty_answer_rejected(authenticated_client):
    lab = Lab.objects.create(
        title='Submit Test Lab 3', topic='TCP', difficulty='Beginner',
        pcap_file='pcaps/test.pcap', is_published=True
    )
    challenge = Challenge.objects.create(
        lab=lab, order=1, question='Q?', correct_answer='Packet 2'
    )

    response = authenticated_client.post(f'/api/challenges/{challenge.id}/submit/', {
        'answer': ''
    })
    assert response.status_code == 400


@pytest.mark.django_db
def test_submit_creates_attempt_record(authenticated_client):
    lab = Lab.objects.create(
        title='Submit Test Lab 4', topic='TCP', difficulty='Beginner',
        pcap_file='pcaps/test.pcap', is_published=True
    )
    challenge = Challenge.objects.create(
        lab=lab, order=1, question='Q?', correct_answer='Packet 2'
    )

    authenticated_client.post(f'/api/challenges/{challenge.id}/submit/', {'answer': 'Packet 2'})

    assert Attempt.objects.filter(challenge=challenge, is_correct=True).count() == 1


@pytest.mark.django_db
def test_submit_updates_progress_only_when_lab_fully_complete(authenticated_client):
    lab = Lab.objects.create(
        title='Submit Test Lab 5', topic='TCP', difficulty='Beginner',
        pcap_file='pcaps/test.pcap', is_published=True
    )
    challenge1 = Challenge.objects.create(lab=lab, order=1, question='Q1?', correct_answer='A1')
    challenge2 = Challenge.objects.create(lab=lab, order=2, question='Q2?', correct_answer='A2')

    # Answer only the first challenge correctly — lab not fully complete yet
    authenticated_client.post(f'/api/challenges/{challenge1.id}/submit/', {'answer': 'A1'})
    user = User.objects.get(username='labtester')
    progress = Progress.objects.get(student=user)
    assert progress.labs_completed == 0

    # Answer the second challenge correctly — NOW the lab is fully complete
    authenticated_client.post(f'/api/challenges/{challenge2.id}/submit/', {'answer': 'A2'})
    progress.refresh_from_db()
    assert progress.labs_completed == 1


@pytest.mark.django_db
def test_submit_requires_auth(api_client):
    lab = Lab.objects.create(
        title='Submit Test Lab 6', topic='TCP', difficulty='Beginner',
        pcap_file='pcaps/test.pcap', is_published=True
    )
    challenge = Challenge.objects.create(lab=lab, order=1, question='Q?', correct_answer='A')

    response = api_client.post(f'/api/challenges/{challenge.id}/submit/', {'answer': 'A'})
    assert response.status_code == 401


# ---------- Progress tests ----------

@pytest.mark.django_db
def test_progress_requires_auth(api_client):
    response = api_client.get('/api/progress/')
    assert response.status_code == 401


@pytest.mark.django_db
def test_progress_creates_default_if_none_exists(authenticated_client):
    response = authenticated_client.get('/api/progress/')
    assert response.status_code == 200
    assert response.data['labs_completed'] == 0


@pytest.mark.django_db
def test_explain_packet_requires_auth(api_client):
    lab = Lab.objects.create(
        title='Explain Test Lab', topic='TCP', difficulty='Beginner',
        pcap_file='pcaps/test.pcap', is_published=True
    )
    packet = Packet.objects.create(
        lab=lab, packet_number=1, source_ip='192.168.1.5',
        dest_ip='93.184.216.34', protocol='TCP', flags='SYN',
        summary='Client requests connection'
    )

    response = api_client.post(f'/api/packets/{packet.id}/explain/')
    assert response.status_code == 401


@pytest.mark.django_db
def test_explain_packet_not_found(authenticated_client):
    response = authenticated_client.post('/api/packets/9999/explain/')
    assert response.status_code == 404


@pytest.mark.django_db
@patch('core.views.explain_packet')
def test_explain_packet_returns_explanation(mock_explain, authenticated_client):
    mock_explain.return_value = "This is a mocked AI explanation."

    lab = Lab.objects.create(
        title='Explain Test Lab 2', topic='TCP', difficulty='Beginner',
        pcap_file='pcaps/test.pcap', is_published=True
    )
    packet = Packet.objects.create(
        lab=lab, packet_number=1, source_ip='192.168.1.5',
        dest_ip='93.184.216.34', protocol='TCP', flags='SYN',
        summary='Client requests connection'
    )

    response = authenticated_client.post(f'/api/packets/{packet.id}/explain/')
    assert response.status_code == 200
    assert response.data['explanation'] == "This is a mocked AI explanation."

@pytest.mark.django_db
def test_lab_list_shows_completion_status(authenticated_client):
    lab = Lab.objects.create(
        title='Completion Test Lab', topic='TCP', difficulty='Beginner',
        pcap_file='pcaps/test.pcap', is_published=True
    )
    challenge = Challenge.objects.create(lab=lab, order=1, question='Q?', correct_answer='A1')

    response = authenticated_client.get('/api/labs/')
    lab_data = next(l for l in response.data if l['id'] == lab.id)
    assert lab_data['is_completed'] is False
    assert lab_data['challenges_completed'] == 0
    assert lab_data['total_challenges'] == 1

    authenticated_client.post(f'/api/challenges/{challenge.id}/submit/', {'answer': 'A1'})

    response = authenticated_client.get('/api/labs/')
    lab_data = next(l for l in response.data if l['id'] == lab.id)
    assert lab_data['is_completed'] is True
    assert lab_data['challenges_completed'] == 1