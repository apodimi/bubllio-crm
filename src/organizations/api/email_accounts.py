from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from organizations.models import EmailAccount
from access.permissions import Capability, get_organization_for_user
from organizations.serializers import EmailAccountSerializer
from ..services.email_service import mark_test_failure, mark_test_success, send_test_email


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
