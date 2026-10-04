from django.urls import path

from .views import CompanyDetailAPIView, CompanyListCreateAPIView

urlpatterns = [
    path("", CompanyListCreateAPIView.as_view(), name="company-list"),
    path("<uuid:company_id>/", CompanyDetailAPIView.as_view(), name="company-detail"),
]
