from django.db.models import Q
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
        contacts = Contact.objects.filter(organization=organization)
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
            serializer.save(organization=organization)
            return Response(serializer.data, status=201)

        return Response(serializer.errors, status=400)
