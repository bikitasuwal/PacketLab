from django.urls import path
from .views import LabListView, LabDetailView, submit_answer_view

urlpatterns = [
    path('', LabListView.as_view(), name='lab-list'),
    path('<int:pk>/', LabDetailView.as_view(), name='lab-detail'),
    path('<int:pk>/submit/', submit_answer_view, name='lab-submit'),
]