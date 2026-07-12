from django.urls import path
from .views import explain_packet_view, upload_pcap_view, explain_uploaded_packet_view

urlpatterns = [
    path('<int:pk>/explain/', explain_packet_view, name='packet-explain'),
    path('upload/', upload_pcap_view, name='pcap-upload'),
    path('explain/', explain_uploaded_packet_view, name='packet-explain-uploaded'),
]