from django.urls import path
from .views import explain_packet_view

urlpatterns = [
    path('<int:pk>/explain/', explain_packet_view, name='packet-explain'),
]