from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from access.permissions import Capability, get_organization_for_user

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


class CompanyDetailAPIView(APIView):
    def get(self, request, organization_id, company_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.VIEW_CRM,
        )
        company = get_object_or_404(Company, id=company_id, organization=organization)
        return Response(CompanySerializer(company).data)

    def patch(self, request, organization_id, company_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.MANAGE_CRM,
        )
        company = get_object_or_404(Company, id=company_id, organization=organization)
        serializer = CompanySerializer(company, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, organization_id, company_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.MANAGE_CRM,
        )
        company = get_object_or_404(Company, id=company_id, organization=organization)
        company.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
