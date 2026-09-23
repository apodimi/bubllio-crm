"""
URL configuration for bubllio_crm project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from accounts.auth_views import CurrentUserAPIView, LogoutAPIView
from accounts.views import (
    CurrentAccountSettingsAPIView,
    CurrentUserProfileAPIView,
    CurrentUserExportAPIView,
    CurrentUserDeleteAPIView,
    PasswordChangeAPIView,
    PasswordResetConfirmAPIView,
    PasswordResetRequestAPIView,
)
from onboarding.api.setup import InstallationSetupAPIView, InstallationSmtpTestAPIView
from access.api.invitations import InvitationAcceptAPIView, InvitationDetailAPIView
from onboarding.api.installation_admins import InstallationAdminInvitationAcceptAPIView, InstallationAdminInvitationDetailAPIView

urlpatterns = [
    path("api/v1/setup/", InstallationSetupAPIView.as_view(), name="installation-setup"),
    path("api/v1/setup/smtp-test/", InstallationSmtpTestAPIView.as_view(), name="installation-smtp-test"),
    path("api/v1/invitations/<str:token>/", InvitationDetailAPIView.as_view(), name="invitation-detail"),
    path("api/v1/invitations/<str:token>/accept/", InvitationAcceptAPIView.as_view(), name="invitation-accept"),
    path("api/v1/installation-admin-invitations/<str:token>/", InstallationAdminInvitationDetailAPIView.as_view(), name="installation-admin-invitation-detail"),
    path("api/v1/installation-admin-invitations/<str:token>/accept/", InstallationAdminInvitationAcceptAPIView.as_view(), name="installation-admin-invitation-accept"),
    path("admin/", admin.site.urls),
    path("api-auth/", include("rest_framework.urls")),
    path("api/v1/auth/token/", TokenObtainPairView.as_view(), name="token-obtain-pair"),
    path("api/v1/auth/token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("api/v1/auth/me/", CurrentUserAPIView.as_view(), name="current-user"),
    path("api/v1/auth/me/profile/", CurrentUserProfileAPIView.as_view(), name="current-user-profile"),
    path("api/v1/auth/me/settings/", CurrentAccountSettingsAPIView.as_view(), name="current-account-settings"),
    path("api/v1/auth/me/password/", PasswordChangeAPIView.as_view(), name="password-change"),
    path("api/v1/auth/me/export/", CurrentUserExportAPIView.as_view(), name="current-user-export"),
    path("api/v1/auth/me/delete/", CurrentUserDeleteAPIView.as_view(), name="current-user-delete"),
    path("api/v1/auth/password-reset/", PasswordResetRequestAPIView.as_view(), name="password-reset-request"),
    path("api/v1/auth/password-reset/<uidb64>/<token>/", PasswordResetConfirmAPIView.as_view(), name="password-reset-confirm"),
    path("api/v1/auth/logout/", LogoutAPIView.as_view(), name="logout"),
    path("api/v1/organizations/", include("organizations.urls")),
]
