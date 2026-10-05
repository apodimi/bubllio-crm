from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from access.permissions import Capability, get_organization_for_user

from .models import Charge, CustomerSubscription, ServiceCatalogItem
from .serializers import (
    ChargeSerializer,
    CustomerSubscriptionSerializer,
    PaymentSerializer,
    ServiceCatalogItemSerializer,
)


class CatalogListCreateAPIView(APIView):
    def get(self, request, organization_id):
        organization = get_organization_for_user(
            user=request.user, organization_id=organization_id, capability=Capability.VIEW_CRM
        )
        items = ServiceCatalogItem.objects.filter(organization=organization)
        if request.query_params.get("active") in {"true", "false"}:
            items = items.filter(is_active=request.query_params["active"] == "true")
        return Response(ServiceCatalogItemSerializer(items, many=True).data)

    def post(self, request, organization_id):
        organization = get_organization_for_user(
            user=request.user, organization_id=organization_id, capability=Capability.MANAGE_CRM
        )
        serializer = ServiceCatalogItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(organization=organization)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class CatalogDetailAPIView(APIView):
    def _item(self, request, organization_id, item_id, capability):
        organization = get_organization_for_user(
            user=request.user, organization_id=organization_id, capability=capability
        )
        return get_object_or_404(ServiceCatalogItem, organization=organization, id=item_id)

    def get(self, request, organization_id, item_id):
        return Response(ServiceCatalogItemSerializer(self._item(request, organization_id, item_id, Capability.VIEW_CRM)).data)

    def patch(self, request, organization_id, item_id):
        item = self._item(request, organization_id, item_id, Capability.MANAGE_CRM)
        serializer = ServiceCatalogItemSerializer(item, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class SubscriptionListCreateAPIView(APIView):
    def get(self, request, organization_id):
        organization = get_organization_for_user(
            user=request.user, organization_id=organization_id, capability=Capability.VIEW_CRM
        )
        subscriptions = CustomerSubscription.objects.filter(organization=organization).select_related(
            "company", "catalog_item", "assigned_to"
        )
        if request.query_params.get("company"):
            subscriptions = subscriptions.filter(company_id=request.query_params["company"])
        if request.query_params.get("status"):
            subscriptions = subscriptions.filter(status=request.query_params["status"])
        return Response(CustomerSubscriptionSerializer(subscriptions, many=True).data)

    def post(self, request, organization_id):
        organization = get_organization_for_user(
            user=request.user, organization_id=organization_id, capability=Capability.MANAGE_CRM
        )
        serializer = CustomerSubscriptionSerializer(data=request.data, context={"organization": organization})
        serializer.is_valid(raise_exception=True)
        serializer.save(organization=organization)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class SubscriptionDetailAPIView(APIView):
    def _subscription(self, request, organization_id, subscription_id, capability):
        organization = get_organization_for_user(
            user=request.user, organization_id=organization_id, capability=capability
        )
        return organization, get_object_or_404(
            CustomerSubscription.objects.select_related("company", "catalog_item", "assigned_to"),
            organization=organization,
            id=subscription_id,
        )

    def get(self, request, organization_id, subscription_id):
        _, subscription = self._subscription(request, organization_id, subscription_id, Capability.VIEW_CRM)
        return Response(CustomerSubscriptionSerializer(subscription).data)

    def patch(self, request, organization_id, subscription_id):
        organization, subscription = self._subscription(
            request, organization_id, subscription_id, Capability.MANAGE_CRM
        )
        serializer = CustomerSubscriptionSerializer(
            subscription, data=request.data, partial=True, context={"organization": organization}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ChargeListAPIView(APIView):
    def get(self, request, organization_id):
        organization = get_organization_for_user(
            user=request.user, organization_id=organization_id, capability=Capability.VIEW_CRM
        )
        charges = Charge.objects.filter(organization=organization).select_related(
            "subscription", "subscription__company"
        ).prefetch_related("payments", "payments__recorded_by")
        if request.query_params.get("company"):
            charges = charges.filter(subscription__company_id=request.query_params["company"])
        if request.query_params.get("subscription"):
            charges = charges.filter(subscription_id=request.query_params["subscription"])
        return Response(ChargeSerializer(charges, many=True).data)


class ChargePaymentListCreateAPIView(APIView):
    def _charge(self, request, organization_id, charge_id, capability):
        organization = get_organization_for_user(
            user=request.user, organization_id=organization_id, capability=capability
        )
        return get_object_or_404(
            Charge.objects.select_related("subscription", "subscription__company").prefetch_related("payments"),
            organization=organization,
            id=charge_id,
        )

    def get(self, request, organization_id, charge_id):
        charge = self._charge(request, organization_id, charge_id, Capability.VIEW_CRM)
        return Response(PaymentSerializer(charge.payments.select_related("recorded_by"), many=True).data)

    def post(self, request, organization_id, charge_id):
        charge = self._charge(request, organization_id, charge_id, Capability.MANAGE_CRM)
        serializer = PaymentSerializer(data=request.data, context={"charge": charge, "request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

