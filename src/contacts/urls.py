from django.urls import path

from .views import ContactDetailAPIView, ContactListCreateAPIView

urlpatterns = [
    path("", ContactListCreateAPIView.as_view(), name="contact-list"),
    path("<uuid:contact_id>/", ContactDetailAPIView.as_view(), name="contact-detail"),
]
