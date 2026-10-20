from django.urls import path
from costing.views import (
    DealCostLineDetailAPIView,
    DealCostLineListCreateAPIView,
    DealProfitabilityAPIView,
)
from .views import DealArchiveAPIView, DealDetailAPIView, DealListCreateAPIView, DealMoveAPIView

urlpatterns = [
    path("", DealListCreateAPIView.as_view(), name="deal-list"),
    path("<uuid:deal_id>/", DealDetailAPIView.as_view(), name="deal-detail"),
    path("<uuid:deal_id>/archive/", DealArchiveAPIView.as_view(), name="deal-archive"),
    path("<uuid:deal_id>/move/", DealMoveAPIView.as_view(), name="deal-move"),
    path("<uuid:deal_id>/costs/", DealCostLineListCreateAPIView.as_view(), name="deal-cost-list"),
    path("<uuid:deal_id>/costs/<uuid:cost_id>/", DealCostLineDetailAPIView.as_view(), name="deal-cost-detail"),
    path("<uuid:deal_id>/profitability/", DealProfitabilityAPIView.as_view(), name="deal-profitability"),
]
