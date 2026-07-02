from django.contrib import admin
from .models import Lab, Packet, Attempt, Progress

admin.site.register(Lab)
admin.site.register(Packet)
admin.site.register(Attempt)
admin.site.register(Progress)