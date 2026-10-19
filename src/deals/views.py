from django.db.models import Exists, OuterRef, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema
from access.permissions import Capability, get_organization_for_user
from companies.models import CompanyTimelineEvent
from companies.services import record_company_timeline_event
from activities.models import Task
from .models import Deal
from .serializers import DealListFilterSerializer, DealSerializer
from .services import move_deal


class DealListCreateAPIView(APIView):
    serializer_class = DealSerializer

    @extend_schema(operation_id="list_deals")
    def get(self, request, organization_id):
        organization = get_organization_for_user(user=request.user, organization_id=organization_id, capability=Capability.VIEW_CRM)
        deals = Deal.objects.filter(organization=organization).select_related("company", "contact", "assigned_to")
        archived = request.query_params.get("archived", "active")
        if archived not in {"active", "archived", "all"}:
            return Response({"archived": ["Choose active, archived, or all."]}, status=status.HTTP_400_BAD_REQUEST)
        deals = deals.filter(archived_at__isnull=archived != "archived") if archived != "all" else deals
        stage = request.query_params.get("stage")
        if stage:
            if stage not in Deal.Stage.values:
                return Response({"stage": ["Select a valid stage."]}, status=status.HTTP_400_BAD_REQUEST)
            deals = deals.filter(stage=stage)
        if request.query_params.get("search"):
            term = request.query_params["search"]
            deals = deals.filter(Q(title__icontains=term) | Q(company__name__icontains=term))
        filters = DealListFilterSerializer(
            data=request.query_params,
            context={"organization": organization},
        )
        filters.is_valid(raise_exception=True)
        assigned_to = filters.validated_data.get("assigned_to")
        if assigned_to == "me":
            deals = deals.filter(assigned_to=request.user)
        elif assigned_to == "unassigned":
            deals = deals.filter(assigned_to__isnull=True)
        elif assigned_to is not None:
            deals = deals.filter(assigned_to_id=assigned_to)

        next_action = filters.validated_data.get("next_action")
        if next_action:
            deals = deals.exclude(stage__in=(Deal.Stage.WON, Deal.Stage.LOST))
            incomplete_tasks = Task.objects.filter(
                organization=organization,
                deal_id=OuterRef("pk"),
                completed_at__isnull=True,
            )
            deals = deals.annotate(has_next_action=Exists(incomplete_tasks)).filter(
                has_next_action=next_action == "present"
            )

        expected_close_from = filters.validated_data.get("expected_close_from")
        if expected_close_from:
            deals = deals.filter(expected_close_date__gte=expected_close_from)
        expected_close_to = filters.validated_data.get("expected_close_to")
        if expected_close_to:
            deals = deals.filter(expected_close_date__lte=expected_close_to)
        deals = deals.order_by("stage", "sort_order", "created_at", "id")
        limit = filters.validated_data.get("limit")
        if limit is not None:
            deals = deals[:limit]
        return Response(DealSerializer(deals, many=True).data)

    def post(self, request, organization_id):
        organization = get_organization_for_user(user=request.user, organization_id=organization_id, capability=Capability.MANAGE_CRM)
        serializer = DealSerializer(data=request.data, context={"organization": organization})
        serializer.is_valid(raise_exception=True)
        deal = serializer.save(organization=organization)
        record_company_timeline_event(
            company=deal.company,
            actor=request.user,
            category=CompanyTimelineEvent.Category.DEAL,
            event_type=CompanyTimelineEvent.EventType.DEAL_CREATED,
            source_type="deal",
            source_id=deal.id,
            details={"deal_title": deal.title, "stage": deal.stage},
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class DealDetailAPIView(APIView):
    serializer_class = DealSerializer

    def _deal(self, request, organization_id, deal_id, capability):
        organization = get_organization_for_user(user=request.user, organization_id=organization_id, capability=capability)
        return organization, get_object_or_404(Deal.objects.select_related("company", "contact", "assigned_to"), organization=organization, id=deal_id)

    @extend_schema(operation_id="retrieve_deal")
    def get(self, request, organization_id, deal_id):
        _, deal = self._deal(request, organization_id, deal_id, Capability.VIEW_CRM)
        return Response(DealSerializer(deal).data)

    def patch(self, request, organization_id, deal_id):
        organization, deal = self._deal(request, organization_id, deal_id, Capability.MANAGE_CRM)
        serializer = DealSerializer(deal, data=request.data, partial=True, context={"organization": organization})
        serializer.is_valid(raise_exception=True)
        previous_stage = deal.stage
        changed_fields = list(serializer.validated_data)
        deal = serializer.save()
        event_type = (
            CompanyTimelineEvent.EventType.DEAL_STAGE_CHANGED
            if "stage" in changed_fields and deal.stage != previous_stage
            else CompanyTimelineEvent.EventType.DEAL_UPDATED
        )
        details = {"deal_title": deal.title, "fields": changed_fields}
        if event_type == CompanyTimelineEvent.EventType.DEAL_STAGE_CHANGED:
            details.update({"from_stage": previous_stage, "to_stage": deal.stage})
        record_company_timeline_event(
            company=deal.company,
            actor=request.user,
            category=CompanyTimelineEvent.Category.DEAL,
            event_type=event_type,
            source_type="deal",
            source_id=deal.id,
            details=details,
        )
        return Response(serializer.data)

    def delete(self, request, organization_id, deal_id):
        _, deal = self._deal(request, organization_id, deal_id, Capability.MANAGE_CRM)
        deal.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class DealArchiveAPIView(APIView):
    serializer_class = DealSerializer

    def post(self, request, organization_id, deal_id):
        organization = get_organization_for_user(user=request.user, organization_id=organization_id, capability=Capability.MANAGE_CRM)
        deal = get_object_or_404(Deal, organization=organization, id=deal_id)
        restoring = deal.archived_at is not None
        deal.archived_at = None if restoring else timezone.now()
        deal.save(update_fields=("archived_at", "updated_at"))
        record_company_timeline_event(
            company=deal.company,
            actor=request.user,
            category=CompanyTimelineEvent.Category.DEAL,
            event_type=(
                CompanyTimelineEvent.EventType.DEAL_RESTORED
                if restoring
                else CompanyTimelineEvent.EventType.DEAL_ARCHIVED
            ),
            source_type="deal",
            source_id=deal.id,
            details={"deal_title": deal.title},
        )
        return Response(DealSerializer(deal).data)


class DealMoveAPIView(APIView):
    serializer_class = DealSerializer

    def post(self, request, organization_id, deal_id):
        organization = get_organization_for_user(user=request.user, organization_id=organization_id, capability=Capability.MANAGE_CRM)
        deal = get_object_or_404(Deal, organization=organization, id=deal_id, archived_at__isnull=True)
        stage = request.data.get("stage")
        position = request.data.get("position")
        if stage not in Deal.Stage.values:
            return Response({"stage": ["Select a valid stage."]}, status=status.HTTP_400_BAD_REQUEST)
        if not isinstance(position, int) or isinstance(position, bool) or position < 0:
            return Response({"position": ["Enter a non-negative whole number."]}, status=status.HTTP_400_BAD_REQUEST)
        if stage == Deal.Stage.LOST and not deal.lost_reason.strip():
            return Response({"lost_reason": ["Add a reason before moving a deal to Lost."]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            DealSerializer(
                move_deal(
                    deal=deal,
                    stage=stage,
                    position=position,
                    actor=request.user,
                )
            ).data
        )
