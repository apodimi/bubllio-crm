from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from access.permissions import Capability, get_organization_for_user
from .models import Deal
from .serializers import DealSerializer


class DealListCreateAPIView(APIView):
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
        return Response(DealSerializer(deals, many=True).data)

    def post(self, request, organization_id):
        organization = get_organization_for_user(user=request.user, organization_id=organization_id, capability=Capability.MANAGE_CRM)
        serializer = DealSerializer(data=request.data, context={"organization": organization})
        serializer.is_valid(raise_exception=True)
        serializer.save(organization=organization)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class DealDetailAPIView(APIView):
    def _deal(self, request, organization_id, deal_id, capability):
        organization = get_organization_for_user(user=request.user, organization_id=organization_id, capability=capability)
        return organization, get_object_or_404(Deal.objects.select_related("company", "contact", "assigned_to"), organization=organization, id=deal_id)

    def get(self, request, organization_id, deal_id):
        _, deal = self._deal(request, organization_id, deal_id, Capability.VIEW_CRM)
        return Response(DealSerializer(deal).data)

    def patch(self, request, organization_id, deal_id):
        organization, deal = self._deal(request, organization_id, deal_id, Capability.MANAGE_CRM)
        serializer = DealSerializer(deal, data=request.data, partial=True, context={"organization": organization})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, organization_id, deal_id):
        _, deal = self._deal(request, organization_id, deal_id, Capability.MANAGE_CRM)
        deal.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class DealArchiveAPIView(APIView):
    def post(self, request, organization_id, deal_id):
        organization = get_organization_for_user(user=request.user, organization_id=organization_id, capability=Capability.MANAGE_CRM)
        deal = get_object_or_404(Deal, organization=organization, id=deal_id)
        deal.archived_at = None if deal.archived_at else timezone.now()
        deal.save(update_fields=("archived_at", "updated_at"))
        return Response(DealSerializer(deal).data)
