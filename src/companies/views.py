import uuid

from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from access.permissions import Capability, get_organization_for_user

from .models import Company, CompanyActivity
from .serializers import CompanyActivitySerializer, CompanyAssigneeSerializer, CompanySerializer
from .services import create_company, record_company_activity


def get_company_by_public_reference(*, organization, reference):
    try:
        company_id = uuid.UUID(str(reference))
    except ValueError:
        return get_object_or_404(
            Company,
            organization=organization,
            customer_code__iexact=reference,
        )
    return get_object_or_404(Company, organization=organization, id=company_id)


class CompanyListCreateAPIView(APIView):
    def get(self, request, organization_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.VIEW_CRM,
        )
        companies = Company.objects.filter(organization=organization).select_related("assigned_to")
        archived = request.query_params.get("archived", "active")
        if archived == "active":
            companies = companies.filter(archived_at__isnull=True)
        elif archived == "archived":
            companies = companies.filter(archived_at__isnull=False)
        elif archived != "all":
            return Response(
                {"archived": ["Choose active, archived, or all."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        search = request.query_params.get("search")

        if search:
            companies = companies.filter(
                Q(name__icontains=search) |
                Q(customer_code__icontains=search) |
                Q(tax_id__icontains=search) |
                Q(industry__icontains=search) |
                Q(email__icontains=search) |
                Q(phone_number__icontains=search) |
                Q(website__icontains=search) |
                Q(city__icontains=search) |
                Q(country__icontains=search) |
                Q(notes__icontains=search)
            )

        lifecycle_stage = request.query_params.get("lifecycle_stage")
        if lifecycle_stage:
            valid_stages = {choice for choice, _label in Company.LifecycleStage.choices}
            if lifecycle_stage not in valid_stages:
                return Response(
                    {"lifecycle_stage": ["Select a valid lifecycle stage."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            companies = companies.filter(lifecycle_stage=lifecycle_stage)

        assigned_to = request.query_params.get("assigned_to")
        if assigned_to == "unassigned":
            companies = companies.filter(assigned_to__isnull=True)
        elif assigned_to:
            companies = companies.filter(assigned_to_id=assigned_to)

        serializer = CompanySerializer(companies, many=True)
        return Response(serializer.data)

    def post(self, request, organization_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.MANAGE_CRM,
        )
        serializer = CompanySerializer(data=request.data, context={"organization": organization})
        if serializer.is_valid():
            create_company(serializer=serializer, organization=organization, actor=request.user)

            return Response(serializer.data, status=201)

        return Response(serializer.errors, status=400)


class CompanyAssigneeListAPIView(APIView):
    def get(self, request, organization_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.VIEW_CRM,
        )
        memberships = organization.memberships.select_related("user").order_by(
            "user__username"
        )
        return Response(CompanyAssigneeSerializer(memberships, many=True).data)


class CompanyDetailAPIView(APIView):
    def get(self, request, organization_id, company_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.VIEW_CRM,
        )
        company = get_company_by_public_reference(
            organization=organization, reference=company_id
        )
        return Response(CompanySerializer(company).data)

    def patch(self, request, organization_id, company_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.MANAGE_CRM,
        )
        company = get_company_by_public_reference(
            organization=organization, reference=company_id
        )
        serializer = CompanySerializer(
            company,
            data=request.data,
            partial=True,
            context={"organization": organization},
        )
        serializer.is_valid(raise_exception=True)
        changed_fields = list(serializer.validated_data)
        assignment_changed = "assigned_to" in changed_fields and (
            serializer.validated_data["assigned_to"] != company.assigned_to
        )
        serializer.save()
        record_company_activity(
            company=company,
            actor=request.user,
            action=(
                CompanyActivity.Action.ASSIGNED
                if assignment_changed
                else CompanyActivity.Action.UPDATED
            ),
            details={"fields": changed_fields},
        )
        return Response(serializer.data)

    def delete(self, request, organization_id, company_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.MANAGE_CRM,
        )
        company = get_company_by_public_reference(
            organization=organization, reference=company_id
        )
        if company.contacts.exists():
            return Response(
                {"detail": "Archive this company before removing its connected contacts."},
                status=status.HTTP_409_CONFLICT,
            )
        company.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CompanyActivityAPIView(APIView):
    def get(self, request, organization_id, company_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.VIEW_CRM,
        )
        company = get_company_by_public_reference(
            organization=organization, reference=company_id
        )
        return Response(CompanyActivitySerializer(company.activities.all(), many=True).data)


class CompanyArchiveAPIView(APIView):
    def post(self, request, organization_id, company_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.MANAGE_CRM,
        )
        company = get_company_by_public_reference(
            organization=organization, reference=company_id
        )
        if not company.archived_at:
            company.archived_at = timezone.now()
            company.save(update_fields=("archived_at", "updated_at"))
            record_company_activity(
                company=company,
                actor=request.user,
                action=CompanyActivity.Action.ARCHIVED,
            )
        return Response(CompanySerializer(company).data)


class CompanyRestoreAPIView(APIView):
    def post(self, request, organization_id, company_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.MANAGE_CRM,
        )
        company = get_company_by_public_reference(
            organization=organization, reference=company_id
        )
        if company.archived_at:
            company.archived_at = None
            company.save(update_fields=("archived_at", "updated_at"))
            record_company_activity(
                company=company,
                actor=request.user,
                action=CompanyActivity.Action.RESTORED,
            )
        return Response(CompanySerializer(company).data)
