from django.urls import path

from .views import (
    CollaboratorServiceDetailAPIView,
    CollaboratorServiceListCreateAPIView,
    ExternalCollaboratorDetailAPIView,
    ExternalCollaboratorListCreateAPIView,
)


urlpatterns = [
    path("collaborators/", ExternalCollaboratorListCreateAPIView.as_view(), name="external-collaborator-list"),
    path("collaborators/<uuid:collaborator_id>/", ExternalCollaboratorDetailAPIView.as_view(), name="external-collaborator-detail"),
    path("collaborator-services/", CollaboratorServiceListCreateAPIView.as_view(), name="collaborator-service-list"),
    path("collaborator-services/<uuid:service_id>/", CollaboratorServiceDetailAPIView.as_view(), name="collaborator-service-detail"),
]
