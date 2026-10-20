from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from access.permissions import Capability, get_organization_for_user
from deals.models import Deal

from .models import CollaboratorService, DealCostLine, ExternalCollaborator
from .serializers import (
    CollaboratorServiceSerializer,
    DealCostLineSerializer,
    DealProfitabilitySerializer,
    ExternalCollaboratorSerializer,
)
from .services import deal_profitability


def _active_filter(request, queryset):
    active = request.query_params.get("active")
    if active in {"true", "false"}:
        return queryset.filter(is_active=active == "true")
    return queryset


class ExternalCollaboratorListCreateAPIView(APIView):
    serializer_class = ExternalCollaboratorSerializer

    @extend_schema(operation_id="list_external_collaborators")
    def get(self, request, organization_id):
        organization = get_organization_for_user(
            user=request.user, organization_id=organization_id, capability=Capability.VIEW_CRM
        )
        collaborators = _active_filter(
            request, ExternalCollaborator.objects.filter(organization=organization)
        )
        return Response(ExternalCollaboratorSerializer(collaborators, many=True).data)

    def post(self, request, organization_id):
        organization = get_organization_for_user(
            user=request.user, organization_id=organization_id, capability=Capability.MANAGE_CRM
        )
        serializer = ExternalCollaboratorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(organization=organization)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ExternalCollaboratorDetailAPIView(APIView):
    serializer_class = ExternalCollaboratorSerializer

    def _object(self, request, organization_id, collaborator_id, capability):
        organization = get_organization_for_user(
            user=request.user, organization_id=organization_id, capability=capability
        )
        return get_object_or_404(
            ExternalCollaborator, organization=organization, id=collaborator_id
        )

    @extend_schema(operation_id="retrieve_external_collaborator")
    def get(self, request, organization_id, collaborator_id):
        return Response(
            ExternalCollaboratorSerializer(
                self._object(request, organization_id, collaborator_id, Capability.VIEW_CRM)
            ).data
        )

    def patch(self, request, organization_id, collaborator_id):
        collaborator = self._object(
            request, organization_id, collaborator_id, Capability.MANAGE_CRM
        )
        serializer = ExternalCollaboratorSerializer(
            collaborator, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class CollaboratorServiceListCreateAPIView(APIView):
    serializer_class = CollaboratorServiceSerializer

    @extend_schema(operation_id="list_collaborator_services")
    def get(self, request, organization_id):
        organization = get_organization_for_user(
            user=request.user, organization_id=organization_id, capability=Capability.VIEW_CRM
        )
        services = CollaboratorService.objects.filter(organization=organization).select_related(
            "collaborator"
        )
        services = _active_filter(request, services)
        if request.query_params.get("collaborator"):
            services = services.filter(collaborator_id=request.query_params["collaborator"])
        return Response(CollaboratorServiceSerializer(services, many=True).data)

    def post(self, request, organization_id):
        organization = get_organization_for_user(
            user=request.user, organization_id=organization_id, capability=Capability.MANAGE_CRM
        )
        serializer = CollaboratorServiceSerializer(
            data=request.data, context={"organization": organization}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(organization=organization)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class CollaboratorServiceDetailAPIView(APIView):
    serializer_class = CollaboratorServiceSerializer

    def _object(self, request, organization_id, service_id, capability):
        organization = get_organization_for_user(
            user=request.user, organization_id=organization_id, capability=capability
        )
        return organization, get_object_or_404(
            CollaboratorService.objects.select_related("collaborator"),
            organization=organization,
            id=service_id,
        )

    @extend_schema(operation_id="retrieve_collaborator_service")
    def get(self, request, organization_id, service_id):
        _, service = self._object(request, organization_id, service_id, Capability.VIEW_CRM)
        return Response(CollaboratorServiceSerializer(service).data)

    def patch(self, request, organization_id, service_id):
        organization, service = self._object(
            request, organization_id, service_id, Capability.MANAGE_CRM
        )
        serializer = CollaboratorServiceSerializer(
            service, data=request.data, partial=True, context={"organization": organization}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class DealCostLineListCreateAPIView(APIView):
    serializer_class = DealCostLineSerializer

    def _deal(self, request, organization_id, deal_id, capability):
        organization = get_organization_for_user(
            user=request.user, organization_id=organization_id, capability=capability
        )
        return organization, get_object_or_404(Deal, organization=organization, id=deal_id)

    @extend_schema(operation_id="list_deal_cost_lines")
    def get(self, request, organization_id, deal_id):
        organization, deal = self._deal(
            request, organization_id, deal_id, Capability.VIEW_CRM
        )
        lines = DealCostLine.objects.filter(
            organization=organization, deal=deal
        ).select_related("collaborator", "collaborator_service")
        return Response(DealCostLineSerializer(lines, many=True).data)

    def post(self, request, organization_id, deal_id):
        organization, deal = self._deal(
            request, organization_id, deal_id, Capability.MANAGE_CRM
        )
        serializer = DealCostLineSerializer(
            data=request.data, context={"organization": organization, "deal": deal}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(organization=organization, deal=deal)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class DealCostLineDetailAPIView(APIView):
    serializer_class = DealCostLineSerializer

    def _object(self, request, organization_id, deal_id, cost_id, capability):
        organization = get_organization_for_user(
            user=request.user, organization_id=organization_id, capability=capability
        )
        deal = get_object_or_404(Deal, organization=organization, id=deal_id)
        line = get_object_or_404(
            DealCostLine.objects.select_related("collaborator", "collaborator_service"),
            organization=organization,
            deal=deal,
            id=cost_id,
        )
        return organization, deal, line

    @extend_schema(operation_id="retrieve_deal_cost_line")
    def get(self, request, organization_id, deal_id, cost_id):
        _, _, line = self._object(
            request, organization_id, deal_id, cost_id, Capability.VIEW_CRM
        )
        return Response(DealCostLineSerializer(line).data)

    def patch(self, request, organization_id, deal_id, cost_id):
        organization, deal, line = self._object(
            request, organization_id, deal_id, cost_id, Capability.MANAGE_CRM
        )
        serializer = DealCostLineSerializer(
            line,
            data=request.data,
            partial=True,
            context={"organization": organization, "deal": deal},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, organization_id, deal_id, cost_id):
        _, _, line = self._object(
            request, organization_id, deal_id, cost_id, Capability.MANAGE_CRM
        )
        line.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class DealProfitabilityAPIView(APIView):
    serializer_class = DealProfitabilitySerializer

    @extend_schema(operation_id="retrieve_deal_profitability")
    def get(self, request, organization_id, deal_id):
        organization = get_organization_for_user(
            user=request.user, organization_id=organization_id, capability=Capability.VIEW_CRM
        )
        deal = get_object_or_404(Deal, organization=organization, id=deal_id)
        serializer = DealProfitabilitySerializer(deal_profitability(deal))
        return Response(serializer.data)

