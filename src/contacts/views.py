from uuid import UUID

from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from access.permissions import Capability, get_organization_for_user

from .models import Contact
from .serializers import ContactSerializer


class ContactListCreateAPIView(APIView):
    def get(self, request, organization_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.VIEW_CRM,
        )
        contacts = Contact.objects.filter(organization=organization).select_related("company")
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
        serializer.save()
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
