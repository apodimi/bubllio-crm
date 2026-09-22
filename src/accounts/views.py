import base64
import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework.permissions import IsAuthenticated
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView

from organizations.email_service import send_password_reset_email
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


class PasswordResetRequestAPIView(APIView):
    permission_classes = [AllowAny]

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
