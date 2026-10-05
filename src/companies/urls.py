from django.urls import path

from .views import (
    CompanyActivityAPIView,
    CompanyAssigneeListAPIView,
    CompanyArchiveAPIView,
    CompanyDetailAPIView,
    CompanyListCreateAPIView,
    CompanyRestoreAPIView,
)

urlpatterns = [
    path("", CompanyListCreateAPIView.as_view(), name="company-list"),
    path("assignees/", CompanyAssigneeListAPIView.as_view(), name="company-assignee-list"),
    path("<uuid:company_id>/", CompanyDetailAPIView.as_view(), name="company-detail"),
    path("<uuid:company_id>/activity/", CompanyActivityAPIView.as_view(), name="company-activity"),
    path("<uuid:company_id>/archive/", CompanyArchiveAPIView.as_view(), name="company-archive"),
    path("<uuid:company_id>/restore/", CompanyRestoreAPIView.as_view(), name="company-restore"),
]
