from django.urls import path

from .views import OrganizationDetailAPIView, OrganizationListCreateAPIView

urlpatterns = [
    path("", OrganizationListCreateAPIView.as_view(), name="organization-list"),
    path("<uuid:organization_id>/", OrganizationDetailAPIView.as_view(), name="organization-detail"),
]
