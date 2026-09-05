from django.db.models import Q
from rest_framework.response import Response
from rest_framework.views import APIView

from organizations.permissions import Capability, get_organization_for_user

from .models import Company
from .serializers import CompanySerializer


class CompanyListCreateAPIView(APIView):
    def get(self, request, organization_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.VIEW_CRM,
        )
        companies = Company.objects.filter(organization=organization)
        search = request.query_params.get("search")

        if search:
            companies = companies.filter(
                Q(name__icontains=search) |
                Q(email__icontains=search) |
                Q(phone_number__icontains=search) |
                Q(website__icontains=search)
            )

        serializer = CompanySerializer(companies, many=True)
        return Response(serializer.data)

    def post(self, request, organization_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.MANAGE_CRM,
        )
        serializer = CompanySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(organization=organization)

            return Response(serializer.data, status=201)

        return Response(serializer.errors, status=400)
