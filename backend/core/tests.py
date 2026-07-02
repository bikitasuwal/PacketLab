import pytest
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from core.models import Lab, Packet

@pytest.fixture
def api_client():
    return APIClient()


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
    user = User.objects.create_user(username='logoutuser', password='pass123')
    login_response = api_client.post('/api/auth/login/', {
        'username': 'logoutuser',
        'password': 'pass123'
    })
    access_token = login_response.data['access']
    refresh_token = login_response.data['refresh']

    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
    response = api_client.post('/api/auth/logout/', {
        'refresh': refresh_token
    })
    assert response.status_code == 200


@pytest.mark.django_db
def test_logout_without_token(api_client):
    response = api_client.post('/api/auth/logout/', {
        'refresh': 'sometoken'
    })
    assert response.status_code == 401

@pytest.mark.django_db
def test_dummy_users_can_login(api_client):
    dummy_users = [
        ('user1', 'zxcvbnm,./'),
        ('user2', 'zxcvbnm,./'),
    ]

    for username, password in dummy_users:
        User.objects.create_user(username=username, password=password)

        login_response = api_client.post('/api/auth/login/', {
            'username': username,
            'password': password
        })
        assert login_response.status_code == 200
        assert 'access' in login_response.data

        access_token = login_response.data['access']
        refresh_token = login_response.data['refresh']

        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        logout_response = api_client.post('/api/auth/logout/', {
            'refresh': refresh_token
        })
        assert logout_response.status_code == 200

        api_client.credentials()  # clear auth for next loop iteration


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


@pytest.mark.django_db
def test_lab_list_requires_auth(api_client):
    response = api_client.get('/api/labs/')
    assert response.status_code == 401


@pytest.mark.django_db
def test_lab_list_returns_published_labs(authenticated_client):
    Lab.objects.create(
        title='Test Lab 1', topic='TCP', difficulty='Beginner',
        pcap_file='pcaps/test1.pcap', challenge_question='Q1?',
        correct_answer='A1', is_published=True
    )
    Lab.objects.create(
        title='Test Lab 2 (draft)', topic='DNS', difficulty='Beginner',
        pcap_file='pcaps/test2.pcap', challenge_question='Q2?',
        correct_answer='A2', is_published=False
    )

    response = authenticated_client.get('/api/labs/')
    assert response.status_code == 200
    assert len(response.data) == 1
    assert response.data[0]['title'] == 'Test Lab 1'


@pytest.mark.django_db
def test_lab_detail_includes_packets(authenticated_client):
    lab = Lab.objects.create(
        title='Handshake Lab', topic='TCP', difficulty='Beginner',
        pcap_file='pcaps/handshake.pcap', challenge_question='Which is SYN-ACK?',
        correct_answer='Packet 2', is_published=True
    )
    Packet.objects.create(
        lab=lab, packet_number=1, source_ip='192.168.1.5',
        dest_ip='93.184.216.34', protocol='TCP', flags='SYN',
        summary='Client requests connection'
    )
    Packet.objects.create(
        lab=lab, packet_number=2, source_ip='93.184.216.34',
        dest_ip='192.168.1.5', protocol='TCP', flags='SYN, ACK',
        summary='Server acknowledges'
    )

    response = authenticated_client.get(f'/api/labs/{lab.id}/')
    assert response.status_code == 200
    assert response.data['title'] == 'Handshake Lab'
    assert len(response.data['packets']) == 2
    assert 'correct_answer' not in response.data  # answer key must never leak


@pytest.mark.django_db
def test_lab_detail_not_found(authenticated_client):
    response = authenticated_client.get('/api/labs/9999/')
    assert response.status_code == 404