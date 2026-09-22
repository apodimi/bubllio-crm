from django.core.exceptions import ImproperlyConfigured
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import EmailAccount, InstallationState, Organization, OrganizationMembership, OrganizationSettings
from .choices import locale_choices, timezone_choices
from .email_service import mark_test_failure, mark_test_success, send_test_email
from .permissions import Capability, get_membership, get_organization_for_user
from .serializers import (
    EmailAccountSerializer,
    OrganizationMembershipSerializer,
    OrganizationSerializer,
    OrganizationSettingsSerializer,
)


class OrganizationListCreateAPIView(APIView):
    def get(self, request):
        organizations = Organization.objects.filter(memberships__user=request.user)
        serializer = OrganizationSerializer(
            organizations.distinct(),
            many=True,
            context={"request": request},
        )
        return Response(serializer.data)

    @transaction.atomic
    def post(self, request):
        serializer = OrganizationSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        organization = serializer.save()
        OrganizationMembership.objects.create(
            organization=organization,
            user=request.user,
            role=OrganizationMembership.Role.OWNER,
        )
        OrganizationSettings.objects.create(organization=organization)
        return Response(
            OrganizationSerializer(organization, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class OrganizationDetailAPIView(APIView):
    def get(self, request, organization_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.VIEW_CRM,
        )
        return Response(
            OrganizationSerializer(organization, context={"request": request}).data
        )

    def delete(self, request, organization_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.DELETE_ORGANIZATION,
        )
        if organization.is_personal:
            return Response(
                {"detail": "Personal workspaces cannot be deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        organization.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class OrganizationMembershipListCreateAPIView(APIView):
    def _organization(self, request, organization_id):
        return get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.MANAGE_MEMBERS,
        )

    def get(self, request, organization_id):
        organization = self._organization(request, organization_id)
        if organization.is_personal:
            return Response([])
        memberships = organization.memberships.select_related("user").order_by("created_at")
        return Response(OrganizationMembershipSerializer(memberships, many=True).data)

    def post(self, request, organization_id):
        organization = self._organization(request, organization_id)
        if organization.is_personal:
            return Response(
                {"detail": "Personal workspaces cannot have additional members."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        requester = get_membership(user=request.user, organization=organization)
        serializer = OrganizationMembershipSerializer(
            data=request.data,
            context={"organization": organization},
        )
        serializer.is_valid(raise_exception=True)

        if (
            requester is not None
            and requester.role == OrganizationMembership.Role.ADMIN
            and serializer.validated_data["role"] == OrganizationMembership.Role.ADMIN
        ):
            return Response(
                {"role": "Only an owner can add an administrator."},
                status=status.HTTP_403_FORBIDDEN,
            )

        membership = serializer.save()
        return Response(
            OrganizationMembershipSerializer(membership).data,
            status=status.HTTP_201_CREATED,
        )


class OrganizationMembershipDetailAPIView(APIView):
    def _context(self, request, organization_id, membership_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.MANAGE_MEMBERS,
        )
        requester = get_membership(user=request.user, organization=organization)
        target = get_object_or_404(
            OrganizationMembership.objects.select_related("user"),
            id=membership_id,
            organization=organization,
        )
        return organization, requester, target

    @transaction.atomic
    def patch(self, request, organization_id, membership_id):
        organization, requester, target = self._context(
            request, organization_id, membership_id
        )
        requested_role = request.data.get("role")
        valid_roles = OrganizationMembership.Role.values
        if requested_role not in valid_roles:
            return Response(
                {"role": [f"Role must be one of: {', '.join(valid_roles)}."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        requester_is_owner = requester is None or requester.role == OrganizationMembership.Role.OWNER
        if requested_role == OrganizationMembership.Role.OWNER:
            if not requester_is_owner:
                return Response(
                    {"role": "Only the owner can transfer ownership."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            if target.role != OrganizationMembership.Role.OWNER:
                OrganizationMembership.objects.select_for_update().filter(
                    organization=organization,
                    role=OrganizationMembership.Role.OWNER,
                ).update(role=OrganizationMembership.Role.ADMIN)
                target.role = OrganizationMembership.Role.OWNER
                target.save(update_fields=("role", "updated_at"))
        else:
            if target.role == OrganizationMembership.Role.OWNER:
                return Response(
                    {"role": "Transfer ownership before changing the current owner."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not requester_is_owner and (
                target.role == OrganizationMembership.Role.ADMIN
                or requested_role == OrganizationMembership.Role.ADMIN
            ):
                return Response(
                    {"role": "Administrators can manage only members and viewers."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            target.role = requested_role
            target.save(update_fields=("role", "updated_at"))

        return Response(OrganizationMembershipSerializer(target).data)

    def delete(self, request, organization_id, membership_id):
        _, requester, target = self._context(request, organization_id, membership_id)
        requester_is_owner = requester is None or requester.role == OrganizationMembership.Role.OWNER
        if target.role == OrganizationMembership.Role.OWNER:
            return Response(
                {"detail": "Transfer ownership before removing the owner."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not requester_is_owner and target.role == OrganizationMembership.Role.ADMIN:
            return Response(
                {"detail": "Administrators cannot remove other administrators."},
                status=status.HTTP_403_FORBIDDEN,
            )
        target.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class OrganizationSettingsAPIView(APIView):
    def get_organization(self, request, organization_id, capability):
        return get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=capability,
        )

    def get(self, request, organization_id):
        organization = self.get_organization(request, organization_id, Capability.VIEW_CRM)
        settings, _ = OrganizationSettings.objects.get_or_create(organization=organization)
        return Response(OrganizationSettingsSerializer(settings).data)

    def patch(self, request, organization_id):
        organization = self.get_organization(request, organization_id, Capability.MANAGE_SETTINGS)
        settings, _ = OrganizationSettings.objects.get_or_create(organization=organization)
        serializer = OrganizationSettingsSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class OrganizationSettingsOptionsAPIView(APIView):
    """Return the choices used by organization-settings forms."""

    def get(self, request):
        return Response(
            {
                "timezones": [{"value": value, "label": label} for value, label in timezone_choices()],
                "locales": [{"value": value, "label": label} for value, label in locale_choices()],
            }
        )


class InstallationSettingsAPIView(APIView):
    """Manage installation-wide settings reserved for the installation admin."""

    permission_classes = [IsAdminUser]

    def _state(self):
        return InstallationState.objects.select_related("fallback_email_account").get(pk=1)

    def get(self, request):
        state = self._state()
        account = state.fallback_email_account
        return Response({
            "smtp": EmailAccountSerializer(account).data if account else None,
            "configured": account is not None and account.is_active,
        })

    @transaction.atomic
    def patch(self, request):
        state = InstallationState.objects.select_for_update().select_related("fallback_email_account").get(pk=1)
        account = state.fallback_email_account
        payload = request.data.copy()
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
            state.save(update_fields=("fallback_email_account",))
        return Response({
            "smtp": EmailAccountSerializer(account).data,
            "configured": account.is_active,
        })


class EmailAccountListCreateAPIView(APIView):
    def get_organization(self, request, organization_id, capability):
        return get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=capability,
        )

    def get(self, request, organization_id):
        organization = self.get_organization(request, organization_id, Capability.VIEW_CRM)
        accounts = organization.email_accounts.order_by("name")
        return Response(EmailAccountSerializer(accounts, many=True).data)

    @transaction.atomic
    def post(self, request, organization_id):
        organization = self.get_organization(request, organization_id, Capability.MANAGE_SETTINGS)
        serializer = EmailAccountSerializer(
            data=request.data,
            context={"organization": organization},
        )
        serializer.is_valid(raise_exception=True)
        if serializer.validated_data.get("is_default"):
            EmailAccount.objects.filter(organization=organization).update(is_default=False)
        account = serializer.save()
        return Response(EmailAccountSerializer(account).data, status=status.HTTP_201_CREATED)


class EmailAccountDetailAPIView(APIView):
    def get_context(self, request, organization_id, account_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.MANAGE_SETTINGS,
        )
        account = get_object_or_404(EmailAccount, id=account_id, organization=organization)
        return organization, account

    def get(self, request, organization_id, account_id):
        _, account = self.get_context(request, organization_id, account_id)
        return Response(EmailAccountSerializer(account).data)

    @transaction.atomic
    def patch(self, request, organization_id, account_id):
        organization, account = self.get_context(request, organization_id, account_id)
        serializer = EmailAccountSerializer(
            account,
            data=request.data,
            partial=True,
            context={"organization": organization},
        )
        serializer.is_valid(raise_exception=True)
        if serializer.validated_data.get("is_default"):
            EmailAccount.objects.filter(organization=organization).exclude(id=account.id).update(
                is_default=False
            )
        account = serializer.save()
        return Response(EmailAccountSerializer(account).data)

    def delete(self, request, organization_id, account_id):
        _, account = self.get_context(request, organization_id, account_id)
        account.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class EmailAccountTestAPIView(APIView):
    def post(self, request, organization_id, account_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.MANAGE_SETTINGS,
        )
        account = get_object_or_404(EmailAccount, id=account_id, organization=organization)
        recipient = request.data.get("recipient")
        if not recipient:
            return Response({"recipient": "This field is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            recipient = serializers.EmailField().run_validation(recipient)
        except serializers.ValidationError as exc:
            return Response({"recipient": exc.detail}, status=status.HTTP_400_BAD_REQUEST)
        try:
            send_test_email(account=account, recipient=recipient)
        except Exception as exc:
            mark_test_failure(account, exc)
            return Response(
                {"detail": "Email test failed. Check the account settings and server logs.", "status": "failed"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        mark_test_success(account)
        return Response({"detail": "Test email sent.", "status": "success"})
