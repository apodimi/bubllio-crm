from rest_framework.response import Response
from rest_framework.views import APIView

from organizations.permissions import Capability, get_organization_for_user

from .models import Automation, AutomationRun
from .serializers import AutomationRunSerializer, AutomationSerializer
from .services import run_automation


class AutomationListCreateAPIView(APIView):
    def get(self, request, organization_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.VIEW_CRM,
        )
        automations = Automation.objects.filter(organization=organization)
        serializer = AutomationSerializer(automations, many=True)
        return Response(serializer.data)

    def post(self, request, organization_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.MANAGE_AUTOMATIONS,
        )
        serializer = AutomationSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save(organization=organization)
            return Response(serializer.data, status=201)

        return Response(serializer.errors, status=400)


class AutomationRunListAPIView(APIView):
    def get(self, request, organization_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.VIEW_CRM,
        )
        runs = AutomationRun.objects.filter(
            automation__organization=organization
        ).order_by("-created_at")
        serializer = AutomationRunSerializer(runs, many=True)
        return Response(serializer.data)


class AutomationTestAPIView(APIView):
    def post(self, request, organization_id, automation_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.MANAGE_AUTOMATIONS,
        )
        try:
            automation = Automation.objects.get(
                id=automation_id,
                organization=organization,
            )
        except Automation.DoesNotExist:
            return Response({"detail": "Automation not found."}, status=404)

        payload = request.data.get("payload") or {
            "test": True,
            "message": "Manual automation test run.",
        }

        run = run_automation(
            automation=automation,
            trigger=automation.trigger,
            payload=payload,
        )
        serializer = AutomationRunSerializer(run)

        return Response(
            {
                "status": run.status,
                "run": serializer.data,
                "dev_note": (
                    "In local development, send_email uses Django's console email "
                    "backend, so the email is printed in the runserver terminal."
                ),
            },
            status=201,
        )
