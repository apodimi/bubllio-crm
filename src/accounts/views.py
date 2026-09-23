import base64
import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.http import JsonResponse
from rest_framework.permissions import IsAuthenticated
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework import status
from rest_framework.views import APIView

from organizations.services.email_service import send_password_reset_email
from organizations.models import EmailAccount, InstallationState
from .models import UserProfile
from .serializers import (
    AccountSettingsSerializer,
    PasswordChangeSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    UserProfileSerializer,
)

logger = logging.getLogger(__name__)
User = get_user_model()


class CurrentUserProfileAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get_profile(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        return profile

    def get(self, request):
        return Response(UserProfileSerializer(self.get_profile(request)).data)

    def patch(self, request):
        profile = self.get_profile(request)
        serializer = UserProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        return Response(UserProfileSerializer(serializer.save()).data)


class CurrentAccountSettingsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        UserProfile.objects.get_or_create(user=request.user)
        return Response(AccountSettingsSerializer(request.user).data)

    def patch(self, request):
        UserProfile.objects.get_or_create(user=request.user)
        serializer = AccountSettingsSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        return Response(AccountSettingsSerializer(serializer.save()).data)


class PasswordChangeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={"user": request.user})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=("password",))
        return Response({"detail": "Password changed successfully."})


class CurrentUserExportAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        memberships = request.user.organization_memberships.select_related("organization").order_by("created_at")
        payload = {
            "account": {
                "username": request.user.username,
                "email": request.user.email,
                "date_joined": request.user.date_joined,
            },
            "profile": {
                "display_name": profile.display_name,
                "first_name": profile.first_name,
                "last_name": profile.last_name,
                "date_of_birth": profile.date_of_birth,
                "timezone": profile.timezone,
                "locale": profile.locale,
                "marketing_consent": profile.marketing_consent,
                "privacy_policy_version": profile.privacy_policy_version,
                "privacy_policy_accepted_at": profile.privacy_policy_accepted_at,
            },
            "memberships": [
                {
                    "organization_id": str(membership.organization_id),
                    "organization_name": membership.organization.name,
                    "role": membership.role,
                    "created_at": membership.created_at,
                }
                for membership in memberships
            ],
        }
        return JsonResponse(payload, json_dumps_params={"default": str}, headers={"Content-Disposition": "attachment; filename=bubllio-account-export.json"})


class CurrentUserDeleteAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        password = request.data.get("password", "")
        if not request.user.check_password(password):
            return Response({"password": "The password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)
        if request.data.get("confirmation") != "DELETE":
            return Response({"confirmation": "Type DELETE to confirm account deletion."}, status=status.HTTP_400_BAD_REQUEST)
        owned = request.user.organization_memberships.filter(role="owner").select_related("organization")
        if owned.exists():
            names = ", ".join(membership.organization.name for membership in owned)
            return Response({"detail": f"Transfer ownership before deleting this account: {names}."}, status=status.HTTP_409_CONFLICT)
        request.user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PasswordResetRequestAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password_reset"

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].strip().lower()
        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            base_url = getattr(settings, "BUBLLIO_APP_URL", "").rstrip("/")
            reset_url = f"{base_url}/reset-password/{uid}/{token}"
            account_id = InstallationState.objects.values_list("fallback_email_account_id", flat=True).first()
            account = EmailAccount.objects.filter(id=account_id, is_active=True).first() if account_id else None
            try:
                if account:
                    send_password_reset_email(account=account, recipient=user.email, reset_url=reset_url)
                else:
                    send_mail(
                        "Reset your Bubllio CRM password",
                        f"Reset your password here: {reset_url}",
                        settings.DEFAULT_FROM_EMAIL,
                        [user.email],
                        fail_silently=False,
                    )
            except Exception:
                logger.exception("Password reset email delivery failed for user=%s", user.pk)
        return Response({"detail": "If an account exists for that email, reset instructions have been sent."})


class PasswordResetConfirmAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, uidb64, token):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = User.objects.get(pk=force_str(urlsafe_base64_decode(uidb64)))
        except (TypeError, ValueError, OverflowError, User.DoesNotExist, base64.binascii.Error):
            return Response({"detail": "This password reset link is invalid or expired."}, status=status.HTTP_400_BAD_REQUEST)
        if not default_token_generator.check_token(user, token):
            return Response({"detail": "This password reset link is invalid or expired."}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=("password",))
        return Response({"detail": "Password reset successfully."})
