from django.urls import include, path

from .api.email_accounts import EmailAccountDetailAPIView, EmailAccountListCreateAPIView, EmailAccountTestAPIView
from onboarding.api.installation_admins import InstallationAdminInvitationListCreateAPIView
from onboarding.api.installation_settings import InstallationSettingsAPIView
from access.api.invitations import (
    OrganizationInvitationDetailAPIView,
    OrganizationInvitationListCreateAPIView,
    OrganizationInvitationResendAPIView,
)
from access.api.memberships import OrganizationMembershipDetailAPIView, OrganizationMembershipListAPIView
from .api.provisioning import (
    WorkspaceProvisioningListAPIView, WorkspaceProvisioningDetailAPIView,
)
from .api.workspace_settings import OrganizationSettingsAPIView, OrganizationSettingsOptionsAPIView
from .api.workspace_operations import WorkspaceActivityAPIView, WorkspaceDataExportAPIView
from .api.workspaces import OrganizationDetailAPIView, OrganizationListCreateAPIView, PersonalWorkspaceAPIView

urlpatterns = [
    path("", OrganizationListCreateAPIView.as_view(), name="organization-list"),
    path("installation-settings/", InstallationSettingsAPIView.as_view(), name="installation-settings"),
    path("installation-admin-invitations/", InstallationAdminInvitationListCreateAPIView.as_view(), name="installation-admin-invitations"),
    path("provisioning/", WorkspaceProvisioningListAPIView.as_view(), name="workspace-provisioning-list"),
    path("provisioning/<uuid:organization_id>/", WorkspaceProvisioningDetailAPIView.as_view(), name="workspace-provisioning-detail"),
    path("personal/", PersonalWorkspaceAPIView.as_view(), name="personal-workspace"),
    path("settings/options/", OrganizationSettingsOptionsAPIView.as_view(), name="organization-settings-options"),
    path("<uuid:organization_id>/", OrganizationDetailAPIView.as_view(), name="organization-detail"),
    path("<uuid:organization_id>/invitations/", OrganizationInvitationListCreateAPIView.as_view(), name="organization-invitation-list"),
    path(
        "<uuid:organization_id>/invitations/<uuid:invitation_id>/",
        OrganizationInvitationDetailAPIView.as_view(),
        name="organization-invitation-detail",
    ),
    path(
        "<uuid:organization_id>/invitations/<uuid:invitation_id>/resend/",
        OrganizationInvitationResendAPIView.as_view(),
        name="organization-invitation-resend",
    ),
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
    path("<uuid:organization_id>/activity/", WorkspaceActivityAPIView.as_view(), name="workspace-activity"),
    path("<uuid:organization_id>/data-export/", WorkspaceDataExportAPIView.as_view(), name="workspace-data-export"),
    path("<uuid:organization_id>/email-accounts/", EmailAccountListCreateAPIView.as_view(), name="email-account-list"),
    path("<uuid:organization_id>/email-accounts/<uuid:account_id>/", EmailAccountDetailAPIView.as_view(), name="email-account-detail"),
    path("<uuid:organization_id>/email-accounts/<uuid:account_id>/test/", EmailAccountTestAPIView.as_view(), name="email-account-test"),
    path("<uuid:organization_id>/companies/", include("companies.urls")),
    path("<uuid:organization_id>/contacts/", include("contacts.urls")),
    path("<uuid:organization_id>/deals/", include("deals.urls")),
    path("<uuid:organization_id>/tasks/", include("activities.urls")),
    path("<uuid:organization_id>/services/", include("subscriptions.urls")),
    path("<uuid:organization_id>/automations/", include("automations.urls")),
]
