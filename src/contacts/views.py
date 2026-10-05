from uuid import UUID

from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from access.permissions import Capability, get_organization_for_user

from .models import Contact, ContactActivity
from .serializers import ContactActivitySerializer, ContactSerializer


def record_contact_activity(*, contact, actor, action, details=None):
    return ContactActivity.objects.create(organization=contact.organization, contact=contact, actor=actor, action=action, details=details or {})


class ContactListCreateAPIView(APIView):
    def get(self, request, organization_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.VIEW_CRM,
        )
        contacts = Contact.objects.filter(organization=organization).select_related("company", "assigned_to")
        archived = request.query_params.get("archived", "active")
        if archived == "active":
            contacts = contacts.filter(archived_at__isnull=True)
        elif archived == "archived":
            contacts = contacts.filter(archived_at__isnull=False)
        elif archived != "all":
            return Response({"archived": ["Choose active, archived, or all."]}, status=status.HTTP_400_BAD_REQUEST)
        search = request.query_params.get("search")

        if search:
            contacts = contacts.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search) |
                Q(phone_number__icontains=search) |
                Q(department__icontains=search) |
                Q(job_title__icontains=search)
            )

        company_id = request.query_params.get("company")
        if company_id:
            try:
                UUID(company_id)
            except (TypeError, ValueError):
                return Response(
                    {"company": ["Select a valid company."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            contacts = contacts.filter(company_id=company_id)

        serializer = ContactSerializer(contacts, many=True)
        return Response(serializer.data)

    def post(self, request, organization_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.MANAGE_CRM,
        )
        serializer = ContactSerializer(
            data=request.data,
            context={"organization": organization},
        )

        if serializer.is_valid():
            contact = serializer.save(organization=organization)
            record_contact_activity(contact=contact, actor=request.user, action=ContactActivity.Action.CREATED)
            if contact.company:
                from companies.models import CompanyActivity
                from companies.services import record_company_activity

                record_company_activity(
                    company=contact.company,
                    actor=request.user,
                    action=CompanyActivity.Action.CONTACT_ADDED,
                    details={
                        "contact_id": str(contact.id),
                        "contact_name": str(contact),
                    },
                )
            return Response(serializer.data, status=201)

        return Response(serializer.errors, status=400)


class ContactDetailAPIView(APIView):
    def get(self, request, organization_id, contact_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.VIEW_CRM,
        )
        contact = get_object_or_404(
            Contact.objects.select_related("company"),
            id=contact_id,
            organization=organization,
        )
        return Response(ContactSerializer(contact).data)

    def patch(self, request, organization_id, contact_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.MANAGE_CRM,
        )
        contact = get_object_or_404(Contact, id=contact_id, organization=organization)
        serializer = ContactSerializer(
            contact,
            data=request.data,
            partial=True,
            context={"organization": organization},
        )
        serializer.is_valid(raise_exception=True)
        changed_fields = list(serializer.validated_data)
        assignment_changed = "assigned_to" in changed_fields and serializer.validated_data["assigned_to"] != contact.assigned_to
        serializer.save()
        record_contact_activity(contact=contact, actor=request.user, action=ContactActivity.Action.ASSIGNED if assignment_changed else ContactActivity.Action.UPDATED, details={"fields": changed_fields})
        return Response(serializer.data)

    def delete(self, request, organization_id, contact_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.MANAGE_CRM,
        )
        contact = get_object_or_404(Contact, id=contact_id, organization=organization)
        contact.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ContactActivityAPIView(APIView):
    def get(self, request, organization_id, contact_id):
        organization = get_organization_for_user(user=request.user, organization_id=organization_id, capability=Capability.VIEW_CRM)
        contact = get_object_or_404(Contact, id=contact_id, organization=organization)
        return Response(ContactActivitySerializer(contact.activities.all(), many=True).data)


class ContactArchiveAPIView(APIView):
    def post(self, request, organization_id, contact_id):
        organization = get_organization_for_user(user=request.user, organization_id=organization_id, capability=Capability.MANAGE_CRM)
        contact = get_object_or_404(Contact, id=contact_id, organization=organization)
        if not contact.archived_at:
            contact.archived_at = timezone.now()
            contact.is_primary = False
            contact.save(update_fields=("archived_at", "is_primary", "updated_at"))
            record_contact_activity(contact=contact, actor=request.user, action=ContactActivity.Action.ARCHIVED)
        return Response(ContactSerializer(contact).data)


class ContactRestoreAPIView(APIView):
    def post(self, request, organization_id, contact_id):
        organization = get_organization_for_user(user=request.user, organization_id=organization_id, capability=Capability.MANAGE_CRM)
        contact = get_object_or_404(Contact, id=contact_id, organization=organization)
        if contact.archived_at:
            contact.archived_at = None
            contact.save(update_fields=("archived_at", "updated_at"))
            record_contact_activity(contact=contact, actor=request.user, action=ContactActivity.Action.RESTORED)
        return Response(ContactSerializer(contact).data)
