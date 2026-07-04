from django.urls import path
from .views import submit_answer_view

urlpatterns = [
    path('<int:pk>/submit/', submit_answer_view, name='challenge-submit'),
]