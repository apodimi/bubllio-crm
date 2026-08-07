from django.urls import path

from .views import CompanyListCreateAPIView

urlpatterns = [
    path("", CompanyListCreateAPIView.as_view(), name="company-list"),
]
