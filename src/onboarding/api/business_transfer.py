import tempfile

from django.http import FileResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from access.permissions import IsInstallationAdmin
from onboarding.services.business_transfer import FORMAT, FORMAT_VERSION, write_business_transfer
from organizations.models import WorkspaceAccessEvent
from .schema_serializers import BusinessTransferSerializer


class InstallationBusinessTransferAPIView(APIView):
    serializer_class = BusinessTransferSerializer
    permission_classes = [IsInstallationAdmin]

    def get(self, request):
        output = tempfile.TemporaryFile(mode="w+b")
        try:
            write_business_transfer(output)
        except ValueError as error:
            output.close()
            return Response({"detail": str(error)}, status=status.HTTP_409_CONFLICT)
        except Exception:
            output.close()
            raise

        try:
            WorkspaceAccessEvent.objects.create(
                action=WorkspaceAccessEvent.Action.DOWNLOAD_DATA_EXPORT,
                actor=request.user,
                details={"format": FORMAT, "format_version": FORMAT_VERSION},
            )
        except Exception:
            output.close()
            raise
        timestamp = timezone.now().strftime("%Y%m%d-%H%M%S")
        response = FileResponse(
            output,
            as_attachment=True,
            filename=f"bubllio-crm-business-transfer-{timestamp}.json",
            content_type="application/json",
        )
        response["Cache-Control"] = "private, no-store"

        return response
