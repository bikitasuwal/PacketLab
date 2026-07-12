from django.db import models
from django.contrib.auth.models import User


class Lab(models.Model):
    DIFFICULTY_CHOICES = [
        ('Beginner', 'Beginner'),
        ('Intermediate', 'Intermediate'),
        ('Advanced', 'Advanced'),
    ]

    title = models.CharField(max_length=200)
    topic = models.CharField(max_length=100)
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES)
    pcap_file = models.FileField(upload_to='pcaps/')
    resources = models.JSONField(default=list)
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class Packet(models.Model):
    lab = models.ForeignKey(Lab, on_delete=models.CASCADE, related_name='packets')
    challenge = models.ForeignKey(
        'Challenge', on_delete=models.SET_NULL, null=True, blank=True, related_name='packets'
    )
    packet_number = models.IntegerField()
    source_ip = models.GenericIPAddressField()
    dest_ip = models.GenericIPAddressField()
    protocol = models.CharField(max_length=20)
    flags = models.CharField(max_length=100, blank=True)
    summary = models.CharField(max_length=255)
    raw_data = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"Packet {self.packet_number} - {self.lab.title}"


class Challenge(models.Model):
    lab = models.ForeignKey(Lab, on_delete=models.CASCADE, related_name='challenges')
    order = models.IntegerField(default=1)
    question = models.TextField()
    correct_answer = models.CharField(max_length=255)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.lab.title} - Q{self.order}"


class Attempt(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='attempts')
    challenge = models.ForeignKey(Challenge, on_delete=models.CASCADE, related_name='attempts')
    answer_given = models.CharField(max_length=255)
    is_correct = models.BooleanField()
    ai_explanation = models.TextField(blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.student.username} - {self.challenge}"


class Progress(models.Model):
    student = models.OneToOneField(User, on_delete=models.CASCADE, related_name='progress')
    labs_completed = models.IntegerField(default=0)
    total_labs = models.IntegerField(default=0)
    last_activity = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.student.username} - {self.labs_completed}/{self.total_labs}"


class Rating(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ratings')
    lab = models.ForeignKey(Lab, on_delete=models.CASCADE, related_name='ratings')
    score = models.IntegerField()  # 1-5
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['student', 'lab']

    def __str__(self):
        return f"{self.student.username} - {self.lab.title} - {self.score}/5"