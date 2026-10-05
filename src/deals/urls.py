from django.urls import path
from .views import DealArchiveAPIView, DealDetailAPIView, DealListCreateAPIView, DealMoveAPIView

urlpatterns = [path("", DealListCreateAPIView.as_view(), name="deal-list"), path("<uuid:deal_id>/", DealDetailAPIView.as_view(), name="deal-detail"), path("<uuid:deal_id>/archive/", DealArchiveAPIView.as_view(), name="deal-archive"), path("<uuid:deal_id>/move/", DealMoveAPIView.as_view(), name="deal-move")]
