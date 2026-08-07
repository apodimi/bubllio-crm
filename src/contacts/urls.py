from django.urls import path

from .views import ContactListCreateAPIView

urlpatterns = [
    path("", ContactListCreateAPIView.as_view(), name="contact-list"),
]
