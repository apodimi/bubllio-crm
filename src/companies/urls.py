from django.urls import path

from .views import (
    CompanyActivityAPIView,
    CompanyAttentionAPIView,
    CompanyAssigneeListAPIView,
    CompanyArchiveAPIView,
    CompanyDetailAPIView,
    CompanyListCreateAPIView,
    CompanyRestoreAPIView,
    CompanySummaryAPIView,
    CompanyTimelineAPIView,
)

urlpatterns = [
    path("", CompanyListCreateAPIView.as_view(), name="company-list"),
    path("summary/", CompanySummaryAPIView.as_view(), name="crm-summary"),
    path("assignees/", CompanyAssigneeListAPIView.as_view(), name="company-assignee-list"),
    path("attention/", CompanyAttentionAPIView.as_view(), name="company-attention"),
    path("<str:company_id>/", CompanyDetailAPIView.as_view(), name="company-detail"),
    path("<str:company_id>/activity/", CompanyActivityAPIView.as_view(), name="company-activity"),
    path("<str:company_id>/timeline/", CompanyTimelineAPIView.as_view(), name="company-timeline"),
    path("<str:company_id>/archive/", CompanyArchiveAPIView.as_view(), name="company-archive"),
    path("<str:company_id>/restore/", CompanyRestoreAPIView.as_view(), name="company-restore"),
]
