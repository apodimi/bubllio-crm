from django.urls import path

from .views import ContactActivityAPIView, ContactArchiveAPIView, ContactDetailAPIView, ContactListCreateAPIView, ContactRestoreAPIView

urlpatterns = [
    path("", ContactListCreateAPIView.as_view(), name="contact-list"),
    path("<uuid:contact_id>/", ContactDetailAPIView.as_view(), name="contact-detail"),
    path("<uuid:contact_id>/activity/", ContactActivityAPIView.as_view(), name="contact-activity"),
    path("<uuid:contact_id>/archive/", ContactArchiveAPIView.as_view(), name="contact-archive"),
    path("<uuid:contact_id>/restore/", ContactRestoreAPIView.as_view(), name="contact-restore"),
]
