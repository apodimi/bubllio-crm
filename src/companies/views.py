import uuid

from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from access.permissions import Capability, get_organization_for_user
from bubllio_crm.pagination import collection_response

from .models import Company, CompanyActivity, CompanyTimelineEvent
from .serializers import (
    CompanyActivitySerializer,
    CompanyAssigneeSerializer,
    CompanySerializer,
    CompanyTimelineEventSerializer,
    CompanyTimelineNoteSerializer,
    CrmSummarySerializer,
)
from .services import (
    archive_company,
    create_company,
    record_company_timeline_event,
    restore_company,
    update_company,
)
from .summary import crm_summary


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


class CompanySummaryAPIView(APIView):
    serializer_class = CrmSummarySerializer

    def get(self, request, organization_id):
        organization = get_organization_for_user(
            user=request.user, organization_id=organization_id, capability=Capability.VIEW_CRM,
        )
        return Response(crm_summary(organization))


class CompanyListCreateAPIView(APIView):
    serializer_class = CompanySerializer

    @extend_schema(operation_id="list_companies")
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

        ordering = request.query_params.get("ordering", "name")
        descending = ordering.startswith("-")
        ordering_field = ordering[1:] if descending else ordering
        allowed_ordering_fields = {
            "name",
            "updated_at",
            "created_at",
            "lifecycle_stage",
        }
        if ordering_field not in allowed_ordering_fields:
            return Response(
                {
                    "ordering": [
                        "Choose name, updated_at, created_at, or lifecycle_stage; "
                        "prefix with - for descending order."
                    ]
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        ordering_expression = f"-{ordering_field}" if descending else ordering_field
        return collection_response(
            request,
            companies.order_by(ordering_expression, "id"),
            CompanySerializer,
        )

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
    serializer_class = CompanyAssigneeSerializer

    def get(self, request, organization_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.MANAGE_CRM,
        )
        memberships = organization.memberships.select_related("user").order_by(
            "user__username"
        )
        return Response(CompanyAssigneeSerializer(memberships, many=True).data)


class CompanyDetailAPIView(APIView):
    serializer_class = CompanySerializer

    @extend_schema(operation_id="retrieve_company")
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
        company = update_company(
            company=company,
            serializer=serializer,
            actor=request.user,
        )
        return Response(CompanySerializer(company).data)

    def delete(self, request, organization_id, company_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.MANAGE_CRM,
        )
        company = get_company_by_public_reference(
            organization=organization, reference=company_id
        )
        if (
            company.contacts.exists()
            or company.deals.exists()
            or company.tasks.exists()
            or company.subscriptions.exists()
        ):
            return Response(
                {"detail": "Archive this company before removing its connected CRM records."},
                status=status.HTTP_409_CONFLICT,
            )
        company.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CompanyActivityAPIView(APIView):
    serializer_class = CompanyActivitySerializer

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


class CompanyTimelineAPIView(APIView):
    serializer_class = CompanyTimelineEventSerializer

    def get(self, request, organization_id, company_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.VIEW_CRM,
        )
        company = get_company_by_public_reference(
            organization=organization, reference=company_id
        )
        events = company.timeline_events.select_related("actor")
        category = request.query_params.get("category")
        if category:
            if category not in CompanyTimelineEvent.Category.values:
                return Response(
                    {"category": ["Select a valid timeline category."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            events = events.filter(category=category)
        try:
            page = int(request.query_params.get("page", 1))
            page_size = int(request.query_params.get("page_size", 25))
            if page < 1 or not 1 <= page_size <= 100:
                raise ValueError
        except (TypeError, ValueError):
            return Response(
                {"page": ["Use page >= 1 and page_size between 1 and 100."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        count = events.count()
        offset = (page - 1) * page_size
        return Response(
            {
                "count": count,
                "results": CompanyTimelineEventSerializer(
                    events[offset : offset + page_size], many=True
                ).data,
            }
        )

    def post(self, request, organization_id, company_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.MANAGE_CRM,
        )
        company = get_company_by_public_reference(
            organization=organization, reference=company_id
        )
        serializer = CompanyTimelineNoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        event = record_company_timeline_event(
            company=company,
            actor=request.user,
            category=CompanyTimelineEvent.Category.NOTE,
            event_type=CompanyTimelineEvent.EventType.NOTE_ADDED,
            source_type="company",
            source_id=company.id,
            body=serializer.validated_data["body"],
        )
        return Response(
            CompanyTimelineEventSerializer(event).data,
            status=status.HTTP_201_CREATED,
        )


class CompanyArchiveAPIView(APIView):
    serializer_class = CompanySerializer

    def post(self, request, organization_id, company_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.MANAGE_CRM,
        )
        company = get_company_by_public_reference(
            organization=organization, reference=company_id
        )
        company = archive_company(company=company, actor=request.user)
        return Response(CompanySerializer(company).data)


class CompanyRestoreAPIView(APIView):
    serializer_class = CompanySerializer

    def post(self, request, organization_id, company_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.MANAGE_CRM,
        )
        company = get_company_by_public_reference(
            organization=organization, reference=company_id
        )
        company = restore_company(company=company, actor=request.user)
        return Response(CompanySerializer(company).data)
