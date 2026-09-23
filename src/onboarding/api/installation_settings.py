"""Installation-wide policy and fallback SMTP, reserved for IT administrators."""

from django.core.exceptions import ImproperlyConfigured
from django.db import transaction
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from organizations.models import EmailAccount, InstallationState, Organization
from access.permissions import IsInstallationAdmin
from organizations.serializers import EmailAccountSerializer


class InstallationSettingsAPIView(APIView):
    """Manage installation-wide settings reserved for the installation admin."""

    permission_classes = [IsInstallationAdmin]

    def _state(self):
        return InstallationState.objects.select_related("fallback_email_account").get(pk=1)

    def get(self, request):
        state = self._state()
        account = state.fallback_email_account
        return Response({
            "smtp": EmailAccountSerializer(account).data if account else None,
            "configured": account is not None and account.is_active,
            "allow_personal_workspaces": state.allow_personal_workspaces,
        })

    @transaction.atomic
    def patch(self, request):
        state = InstallationState.objects.select_for_update().select_related("fallback_email_account").get(pk=1)
        allow_personal_workspaces = request.data.get("allow_personal_workspaces")
        if allow_personal_workspaces is not None and not isinstance(allow_personal_workspaces, bool):
            return Response(
                {"allow_personal_workspaces": ["This field must be a boolean."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        smtp_fields = {"name", "host", "port", "username", "password", "from_email"}
        if allow_personal_workspaces is not None and not smtp_fields.intersection(request.data):
            state.allow_personal_workspaces = allow_personal_workspaces
            state.save(update_fields=("allow_personal_workspaces",))
            account = state.fallback_email_account
            return Response({
                "smtp": EmailAccountSerializer(account).data if account else None,
                "configured": account is not None and account.is_active,
                "allow_personal_workspaces": state.allow_personal_workspaces,
            })
        account = state.fallback_email_account
        payload = request.data.copy()
        payload.pop("allow_personal_workspaces", None)
        payload["is_default"] = True
        payload["is_active"] = True

        if account is None:
            organization = Organization.objects.order_by("created_at").first()
            if organization is None:
                return Response(
                    {"detail": "Create the first workspace before configuring installation SMTP."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            serializer = EmailAccountSerializer(
                data=payload,
                context={"organization": organization},
            )
        else:
            serializer = EmailAccountSerializer(
                account,
                data=payload,
                partial=True,
                context={"organization": account.organization},
            )
        serializer.is_valid(raise_exception=True)
        try:
            if serializer.validated_data.get("is_default"):
                EmailAccount.objects.filter(organization=serializer.context["organization"]).update(is_default=False)
            account = serializer.save()
        except ImproperlyConfigured as error:
            return Response({"smtp": [str(error)]}, status=status.HTTP_400_BAD_REQUEST)

        if state.fallback_email_account_id != account.id:
            state.fallback_email_account = account
        if allow_personal_workspaces is not None:
            state.allow_personal_workspaces = allow_personal_workspaces
        if state.fallback_email_account_id != account.id or allow_personal_workspaces is not None:
            state.save(update_fields=("fallback_email_account", "allow_personal_workspaces"))
        return Response({
            "smtp": EmailAccountSerializer(account).data,
            "configured": account.is_active,
            "allow_personal_workspaces": state.allow_personal_workspaces,
        })
