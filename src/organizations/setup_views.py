import hmac
import os

from django.contrib.auth import get_user_model
from django.core.exceptions import ImproperlyConfigured
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from .email_security import encrypt_secret
from .email_service import send_setup_test_email
from .models import EmailAccount, InstallationState, Organization, OrganizationMembership, OrganizationSettings
from .setup_serializers import InstallationSetupSerializer, InstallationSmtpTestSerializer
from .personal_workspace import ensure_personal_workspace


class SetupAttemptThrottle(AnonRateThrottle):
    scope = "installation_setup"


def setup_available():
    token = os.environ.get("BUBLLIO_SETUP_TOKEN", "")
    return (
        len(token) >= 32
        and not InstallationState.objects.filter(completed_at__isnull=False).exists()
        and not get_user_model().objects.exists()
        and not Organization.objects.exists()
    )


def setup_access_error(request):
    if not setup_available():
        return Response({"detail": "Installation setup is unavailable."}, status=status.HTTP_403_FORBIDDEN)
    supplied = request.data.get("setup_token", "")
    expected = os.environ["BUBLLIO_SETUP_TOKEN"]
    if not isinstance(supplied, str) or not hmac.compare_digest(supplied, expected):
        return Response({"setup_token": ["Invalid setup token."]}, status=status.HTTP_400_BAD_REQUEST)
    return None


class InstallationSetupAPIView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [SetupAttemptThrottle]

    def get_throttles(self):
        return [] if self.request.method == "GET" else super().get_throttles()

    def get(self, request):
        response = Response({"available": setup_available()})
        response["Cache-Control"] = "no-store"
        return response

    @transaction.atomic
    def post(self, request):
        state = InstallationState.objects.select_for_update().get(pk=1)
        error = setup_access_error(request)
        if error is not None:
            return error
        if state.completed_at is not None:
            return Response({"detail": "Installation setup is unavailable."}, status=status.HTTP_403_FORBIDDEN)

        serializer = InstallationSetupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data
        if Organization.objects.filter(slug=values["organization_slug"]).exists():
            return Response({"organization_slug": ["This slug is already in use."]}, status=status.HTTP_400_BAD_REQUEST)

        smtp_values = values.get("smtp")
        if smtp_values:
            try:
                encrypted_password = encrypt_secret(smtp_values["password"])
            except ImproperlyConfigured:
                return Response(
                    {"smtp": ["Set a valid BUBLLIO_EMAIL_ENCRYPTION_KEY on the server before adding SMTP."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        user = get_user_model().objects.create_superuser(
            username=values["username"], email=values["email"], password=values["password"]
        )
        organization = Organization.objects.create(name=values["organization_name"], slug=values["organization_slug"])
        OrganizationMembership.objects.create(organization=organization, user=user, role=OrganizationMembership.Role.OWNER)
        OrganizationSettings.objects.get_or_create(organization=organization)
        if smtp_values:
            account = EmailAccount.objects.create(
                organization=organization,
                encrypted_password=encrypted_password,
                **{key: value for key, value in smtp_values.items() if key != "password"},
            )
            state.fallback_email_account = account
        state.completed_at = timezone.now()
        state.save(update_fields=["completed_at", "fallback_email_account"])
        ensure_personal_workspace(user)
        return Response({"detail": "Installation complete. Sign in with your new admin account."}, status=status.HTTP_201_CREATED)


class InstallationSmtpTestAPIView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [SetupAttemptThrottle]

    def post(self, request):
        error = setup_access_error(request)
        if error is not None:
            return error
        serializer = InstallationSmtpTestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        smtp = serializer.validated_data["smtp"]
        try:
            send_setup_test_email(smtp=smtp, recipient=serializer.validated_data["recipient"])
        except Exception:
            return Response(
                {"detail": "Test email could not be sent. Check the SMTP settings and recipient."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        return Response({"detail": "Test email sent. Check the recipient inbox."})
