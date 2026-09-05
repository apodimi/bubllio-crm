from django.urls import include, path

from .views import (
    OrganizationDetailAPIView,
    OrganizationListCreateAPIView,
    OrganizationMembershipDetailAPIView,
    OrganizationMembershipListCreateAPIView,
)

urlpatterns = [
    path("", OrganizationListCreateAPIView.as_view(), name="organization-list"),
    path("<uuid:organization_id>/", OrganizationDetailAPIView.as_view(), name="organization-detail"),
    path(
        "<uuid:organization_id>/members/",
        OrganizationMembershipListCreateAPIView.as_view(),
        name="organization-membership-list",
    ),
    path(
        "<uuid:organization_id>/members/<uuid:membership_id>/",
        OrganizationMembershipDetailAPIView.as_view(),
        name="organization-membership-detail",
    ),
    path("<uuid:organization_id>/companies/", include("companies.urls")),
    path("<uuid:organization_id>/contacts/", include("contacts.urls")),
    path("<uuid:organization_id>/automations/", include("automations.urls")),
]
