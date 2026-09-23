import logging
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import UserProfile
from organizations.services.email_service import send_installation_admin_invitation_email
from access.api.invitations import InvitationRegistrationSerializer, token_hash
from organizations.models import EmailAccount, InstallationAdminInvitation, InstallationState
from access.permissions import IsInstallationAdmin

logger = logging.getLogger(__name__)
User = get_user_model()


class InstallationAdminInviteSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        return value.strip().lower()


class InstallationAdminInvitationListCreateAPIView(APIView):
    permission_classes = [IsInstallationAdmin]
    throttle_scope = "installation_admin_invitation"

    def get_throttles(self):
        return [ScopedRateThrottle()] if self.request.method == "POST" else []

    def get(self, request):
        invitations = InstallationAdminInvitation.objects.filter(
            accepted_at__isnull=True, expires_at__gt=timezone.now(),
        ).order_by("-created_at")
        return Response({
            "administrators": list(User.objects.filter(is_superuser=True, is_active=True).values("id", "username", "email")),
            "invitations": [
                {"id": str(invitation.id), "email": invitation.email, "expires_at": invitation.expires_at}
                for invitation in invitations
            ],
        })

    def post(self, request):
        serializer = InstallationAdminInviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        if User.objects.filter(email__iexact=email, is_superuser=True, is_active=True).exists():
            return Response({"email": ["This person is already an installation administrator."]}, status=400)
        fallback_id = InstallationState.objects.values_list("fallback_email_account_id", flat=True).first()
        account = EmailAccount.objects.filter(pk=fallback_id, is_active=True).first() if fallback_id else None
        if account is None:
            return Response({"detail": "Configure installation fallback SMTP before inviting administrators."}, status=400)

        token = secrets.token_urlsafe(32)
        base_url = getattr(settings, "BUBLLIO_APP_URL", "").rstrip("/") or request.build_absolute_uri("/").rstrip("/")
        invite_url = f"{base_url}/installation-admin-invite/{token}"
        try:
            with transaction.atomic():
                InstallationAdminInvitation.objects.filter(email__iexact=email, accepted_at__isnull=True).delete()
                invitation = InstallationAdminInvitation.objects.create(
                    email=email, token_hash=token_hash(token), invited_by=request.user,
                    expires_at=timezone.now() + timedelta(days=7),
                )
                send_installation_admin_invitation_email(account=account, recipient=email, invite_url=invite_url)
        except Exception:
            logger.exception("Installation administrator invitation delivery failed for invitation email=%s", email)
            return Response({"detail": "The invitation email could not be sent. Check installation SMTP."}, status=502)
        return Response({"id": str(invitation.id), "email": email, "expires_at": invitation.expires_at}, status=201)


class InstallationAdminInvitationDetailAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        invitation = get_object_or_404(
            InstallationAdminInvitation,
            token_hash=token_hash(token), accepted_at__isnull=True,
            expires_at__gt=timezone.now(),
        )
        return Response({"email": invitation.email, "expires_at": invitation.expires_at})


class InstallationAdminInvitationAcceptAPIView(APIView):
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request, token):
        invitation = get_object_or_404(
            InstallationAdminInvitation.objects.select_for_update(),
            token_hash=token_hash(token), accepted_at__isnull=True,
            expires_at__gt=timezone.now(),
        )
        if request.user.is_authenticated:
            if request.user.email.lower() != invitation.email.lower():
                return Response({"detail": "Sign in with the invited email address."}, status=403)
            user = request.user
            tokens = None
        else:
            if User.objects.filter(email__iexact=invitation.email).exists():
                return Response({"detail": "An account with this email exists. Sign in before accepting the invitation."}, status=409)
            serializer = InvitationRegistrationSerializer(data=request.data, context={"invited_email": invitation.email})
            serializer.is_valid(raise_exception=True)
            user = User.objects.create_superuser(
                username=serializer.validated_data["username"],
                email=invitation.email,
                password=serializer.validated_data["password"],
            )
            UserProfile.objects.create(
                user=user,
                display_name=serializer.validated_data["display_name"],
                first_name=serializer.validated_data.get("first_name", ""),
                last_name=serializer.validated_data.get("last_name", ""),
                date_of_birth=serializer.validated_data.get("date_of_birth"),
                timezone=serializer.validated_data.get("timezone", "UTC"),
                locale=serializer.validated_data.get("locale", "en-us"),
                onboarding_completed_at=timezone.now(),
            )
            refresh = RefreshToken.for_user(user)
            tokens = {"access": str(refresh.access_token), "refresh": str(refresh)}
        if not user.is_superuser or not user.is_staff:
            user.is_superuser = True
            user.is_staff = True
            user.save(update_fields=("is_superuser", "is_staff"))
        invitation.accepted_at = timezone.now()
        invitation.save(update_fields=("accepted_at",))
        return Response({"tokens": tokens, "is_superuser": True}, status=201)
