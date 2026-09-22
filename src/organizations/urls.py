from django.urls import include, path

from .views import (
    OrganizationDetailAPIView,
    OrganizationListCreateAPIView,
    OrganizationMembershipDetailAPIView,
    OrganizationMembershipListCreateAPIView,
    EmailAccountListCreateAPIView,
    EmailAccountDetailAPIView,
    EmailAccountTestAPIView,
    OrganizationSettingsAPIView,
    OrganizationSettingsOptionsAPIView,
    InstallationSettingsAPIView,
    PersonalWorkspaceAPIView,
)
from .invitation_views import OrganizationInvitationListCreateAPIView

urlpatterns = [
    path("", OrganizationListCreateAPIView.as_view(), name="organization-list"),
    path("installation-settings/", InstallationSettingsAPIView.as_view(), name="installation-settings"),
    path("personal/", PersonalWorkspaceAPIView.as_view(), name="personal-workspace"),
    path("settings/options/", OrganizationSettingsOptionsAPIView.as_view(), name="organization-settings-options"),
    path("<uuid:organization_id>/", OrganizationDetailAPIView.as_view(), name="organization-detail"),
    path("<uuid:organization_id>/invitations/", OrganizationInvitationListCreateAPIView.as_view(), name="organization-invitation-list"),
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
    path("<uuid:organization_id>/settings/", OrganizationSettingsAPIView.as_view(), name="organization-settings"),
    path("<uuid:organization_id>/email-accounts/", EmailAccountListCreateAPIView.as_view(), name="email-account-list"),
    path("<uuid:organization_id>/email-accounts/<uuid:account_id>/", EmailAccountDetailAPIView.as_view(), name="email-account-detail"),
    path("<uuid:organization_id>/email-accounts/<uuid:account_id>/test/", EmailAccountTestAPIView.as_view(), name="email-account-test"),
    path("<uuid:organization_id>/companies/", include("companies.urls")),
    path("<uuid:organization_id>/contacts/", include("contacts.urls")),
    path("<uuid:organization_id>/automations/", include("automations.urls")),
]
