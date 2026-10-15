from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from access.permissions import Capability, roles_with_capability
from organizations.models import Organization
from organizations.services.global_search import SEARCH_TYPES, search_crm


class SearchTypesField(serializers.CharField):
    default_error_messages = {
        "invalid": "Choose one or more of: company, contact, deal.",
    }

    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        result_types = []
        for raw_type in value.split(","):
            result_type = raw_type.strip()
            if result_type not in SEARCH_TYPES:
                self.fail("invalid")
            if result_type not in result_types:
                result_types.append(result_type)
        return tuple(result_types)


class GlobalSearchQuerySerializer(serializers.Serializer):
    q = serializers.CharField(min_length=2, max_length=100, trim_whitespace=True)
    organization = serializers.UUIDField(required=False)
    types = SearchTypesField(required=False, default=SEARCH_TYPES)
    page = serializers.IntegerField(min_value=1, default=1)
    page_size = serializers.IntegerField(min_value=1, max_value=50, default=20)

    def validate(self, attrs):
        if "types" in self.initial_data and not self.initial_data.get("types", "").strip():
            raise serializers.ValidationError(
                {"types": ["Choose one or more of: company, contact, deal."]}
            )
        return attrs


class GlobalSearchAPIView(APIView):
    serializer_class = GlobalSearchQuerySerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "global_search"

    def get(self, request):
        query_serializer = GlobalSearchQuerySerializer(data=request.query_params)
        query_serializer.is_valid(raise_exception=True)
        params = query_serializer.validated_data

        organizations = Organization.objects.filter(
            memberships__user=request.user,
            memberships__role__in=roles_with_capability(Capability.VIEW_CRM),
            provisioning__isnull=True,
        ).distinct()
        organization_id = params.get("organization")
        if organization_id:
            organization = get_object_or_404(organizations, id=organization_id)
            organizations = Organization.objects.filter(id=organization.id)

        search = search_crm(
            organizations=organizations,
            query=params["q"],
            result_types=params["types"],
            page=params["page"],
            page_size=params["page_size"],
        )
        return Response(
            {
                "query": params["q"],
                "count": search["count"],
                "page": params["page"],
                "page_size": params["page_size"],
                "results": search["results"],
            }
        )
