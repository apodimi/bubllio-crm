from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Automation, AutomationRun
from .serializers import AutomationRunSerializer, AutomationSerializer
from .services import run_automation


class AutomationListCreateAPIView(APIView):
    def get(self, request):
        automations = Automation.objects.all()
        serializer = AutomationSerializer(automations, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = AutomationSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)

        return Response(serializer.errors, status=400)


class AutomationRunListAPIView(APIView):
    def get(self, request):
        runs = AutomationRun.objects.all().order_by("-created_at")
        serializer = AutomationRunSerializer(runs, many=True)
        return Response(serializer.data)


class AutomationTestAPIView(APIView):
    def post(self, request, automation_id):
        try:
            automation = Automation.objects.get(id=automation_id)
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
