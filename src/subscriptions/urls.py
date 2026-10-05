from django.urls import path

from .views import (
    CatalogDetailAPIView,
    CatalogListCreateAPIView,
    ChargeListAPIView,
    ChargePaymentListCreateAPIView,
    SubscriptionDetailAPIView,
    SubscriptionListCreateAPIView,
)

urlpatterns = [
    path("catalog/", CatalogListCreateAPIView.as_view(), name="service-catalog-list"),
    path("catalog/<uuid:item_id>/", CatalogDetailAPIView.as_view(), name="service-catalog-detail"),
    path("subscriptions/", SubscriptionListCreateAPIView.as_view(), name="subscription-list"),
    path("subscriptions/<uuid:subscription_id>/", SubscriptionDetailAPIView.as_view(), name="subscription-detail"),
    path("charges/", ChargeListAPIView.as_view(), name="charge-list"),
    path("charges/<uuid:charge_id>/payments/", ChargePaymentListCreateAPIView.as_view(), name="charge-payment-list"),
]
