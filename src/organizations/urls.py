from django.urls import include, path

from .api.email_accounts import EmailAccountDetailAPIView, EmailAccountListCreateAPIView, EmailAccountTestAPIView
from onboarding.api.installation_admins import InstallationAdminInvitationListCreateAPIView
from onboarding.api.installation_settings import InstallationSettingsAPIView
from access.api.invitations import OrganizationInvitationListCreateAPIView
from access.api.memberships import OrganizationMembershipDetailAPIView, OrganizationMembershipListAPIView
from .api.provisioning import (
    WorkspaceCreatorGrantAPIView, WorkspaceCreatorGrantDetailAPIView,
    WorkspaceProvisioningListAPIView, WorkspaceProvisioningDetailAPIView,
)
from .api.workspace_settings import OrganizationSettingsAPIView, OrganizationSettingsOptionsAPIView
from .api.workspaces import OrganizationDetailAPIView, OrganizationListCreateAPIView, PersonalWorkspaceAPIView

urlpatterns = [
    path("", OrganizationListCreateAPIView.as_view(), name="organization-list"),
    path("installation-settings/", InstallationSettingsAPIView.as_view(), name="installation-settings"),
    path("installation-admin-invitations/", InstallationAdminInvitationListCreateAPIView.as_view(), name="installation-admin-invitations"),
    path("workspace-creators/", WorkspaceCreatorGrantAPIView.as_view(), name="workspace-creators"),
    path("workspace-creators/<uuid:grant_id>/", WorkspaceCreatorGrantDetailAPIView.as_view(), name="workspace-creator-detail"),
    path("provisioning/", WorkspaceProvisioningListAPIView.as_view(), name="workspace-provisioning-list"),
    path("provisioning/<uuid:organization_id>/", WorkspaceProvisioningDetailAPIView.as_view(), name="workspace-provisioning-detail"),
    path("personal/", PersonalWorkspaceAPIView.as_view(), name="personal-workspace"),
    path("settings/options/", OrganizationSettingsOptionsAPIView.as_view(), name="organization-settings-options"),
    path("<uuid:organization_id>/", OrganizationDetailAPIView.as_view(), name="organization-detail"),
    path("<uuid:organization_id>/invitations/", OrganizationInvitationListCreateAPIView.as_view(), name="organization-invitation-list"),
    path(
        "<uuid:organization_id>/members/",
        OrganizationMembershipListAPIView.as_view(),
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
