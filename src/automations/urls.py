from django.urls import path

from .views import AutomationListCreateAPIView, AutomationRunListAPIView, AutomationTestAPIView

urlpatterns = [
    path("", AutomationListCreateAPIView.as_view(), name="automation-list"),
    path("runs/", AutomationRunListAPIView.as_view(), name="automation-run-list"),
    path("<uuid:automation_id>/test/", AutomationTestAPIView.as_view(), name="automation-test"),
]
