from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from access.permissions import Capability, get_organization_for_user

from .models import Charge, CustomerSubscription, ServiceCatalogItem
from .services import cancel_subscription, resume_subscription, subscription_overview
from .serializers import (
    ChargeSerializer,
    CustomerSubscriptionSerializer,
    PaymentSerializer,
    ServiceCatalogItemSerializer,
    SubscriptionOverviewSerializer,
)


class CatalogListCreateAPIView(APIView):
    serializer_class = ServiceCatalogItemSerializer

    @extend_schema(operation_id="list_service_catalog_items")
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
    serializer_class = ServiceCatalogItemSerializer

    def _item(self, request, organization_id, item_id, capability):
        organization = get_organization_for_user(
            user=request.user, organization_id=organization_id, capability=capability
        )
        return get_object_or_404(ServiceCatalogItem, organization=organization, id=item_id)

    @extend_schema(operation_id="retrieve_service_catalog_item")
    def get(self, request, organization_id, item_id):
        return Response(ServiceCatalogItemSerializer(self._item(request, organization_id, item_id, Capability.VIEW_CRM)).data)

    def patch(self, request, organization_id, item_id):
        item = self._item(request, organization_id, item_id, Capability.MANAGE_CRM)
        serializer = ServiceCatalogItemSerializer(item, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class SubscriptionListCreateAPIView(APIView):
    serializer_class = CustomerSubscriptionSerializer

    @extend_schema(operation_id="list_customer_subscriptions")
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
    serializer_class = CustomerSubscriptionSerializer

    def _subscription(self, request, organization_id, subscription_id, capability):
        organization = get_organization_for_user(
            user=request.user, organization_id=organization_id, capability=capability
        )
        return organization, get_object_or_404(
            CustomerSubscription.objects.select_related("company", "catalog_item", "assigned_to"),
            organization=organization,
            id=subscription_id,
        )

    @extend_schema(operation_id="retrieve_customer_subscription")
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


class SubscriptionCancelAPIView(APIView):
    serializer_class = CustomerSubscriptionSerializer

    def post(self, request, organization_id, subscription_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.MANAGE_CRM,
        )
        subscription = get_object_or_404(
            CustomerSubscription, organization=organization, id=subscription_id
        )
        if subscription.effective_status in {
            CustomerSubscription.Status.CANCELLED,
            CustomerSubscription.Status.EXPIRED,
        }:
            return Response(
                {"status": ["This subscription has already ended."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        mode = request.data.get("mode", "end_of_period")
        if mode not in {"end_of_period", "immediate"}:
            return Response(
                {"mode": ["Choose end_of_period or immediate."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        subscription = cancel_subscription(
            subscription=subscription, immediate=mode == "immediate"
        )
        return Response(CustomerSubscriptionSerializer(subscription).data)


class SubscriptionResumeAPIView(APIView):
    serializer_class = CustomerSubscriptionSerializer

    def post(self, request, organization_id, subscription_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.MANAGE_CRM,
        )
        subscription = get_object_or_404(
            CustomerSubscription, organization=organization, id=subscription_id
        )
        try:
            subscription = resume_subscription(subscription=subscription)
        except ValueError as error:
            return Response({"status": [str(error)]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(CustomerSubscriptionSerializer(subscription).data)


class SubscriptionOverviewAPIView(APIView):
    serializer_class = SubscriptionOverviewSerializer

    def get(self, request, organization_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.VIEW_CRM,
        )
        return Response(subscription_overview(organization))


class ChargeListAPIView(APIView):
    serializer_class = ChargeSerializer

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
    serializer_class = PaymentSerializer

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
