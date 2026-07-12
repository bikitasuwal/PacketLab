from django.urls import path
from .views import LabListView, LabDetailView, rate_lab_view, lab_rating_view

urlpatterns = [
    path('', LabListView.as_view(), name='lab-list'),
    path('<int:pk>/', LabDetailView.as_view(), name='lab-detail'),
    path('<int:pk>/rate/', rate_lab_view, name='lab-rate'),
    path('<int:pk>/rating/', lab_rating_view, name='lab-rating'),
]