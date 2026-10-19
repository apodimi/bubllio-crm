from django.db import IntegrityError
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from access.permissions import IsInstallationAdmin
from onboarding.models import InstallationUpdateEvent, InstallationUpdateRun
from onboarding.services.update_agent import UpdateAgentRejected, UpdateAgentUnavailable
from onboarding.services.update_orchestration import (
    create_update_run,
    get_update_center_status,
    run_preflight,
    sync_update_run,
    validate_target_version,
)


class UpdateEventSerializer(serializers.ModelSerializer):
    actor = serializers.SerializerMethodField()

    class Meta:
        model = InstallationUpdateEvent
        fields = ("id", "action", "actor", "details", "created_at")

    def get_actor(self, obj: InstallationUpdateEvent) -> str | None:
        return obj.actor.username if obj.actor else None


class UpdateRunSerializer(serializers.ModelSerializer):
    events = UpdateEventSerializer(many=True, read_only=True)

    class Meta:
        model = InstallationUpdateRun
        fields = (
            "id",
            "target_version",
            "status",
            "progress",
            "phase_label",
            "migration_policy",
            "failure_code",
            "failure_message",
            "requested_at",
            "started_at",
            "finished_at",
            "updated_at",
            "events",
        )


class UpdateRunDetailSerializer(UpdateRunSerializer):
    agent_connected = serializers.SerializerMethodField()
    state_fresh = serializers.SerializerMethodField()

    class Meta(UpdateRunSerializer.Meta):
        fields = UpdateRunSerializer.Meta.fields + (
            "agent_connected",
            "state_fresh",
        )

    def get_agent_connected(self, obj) -> bool:
        return self.context.get("agent_connected", True)

    def get_state_fresh(self, obj) -> bool:
        return self.context.get("state_fresh", True)


class TargetVersionSerializer(serializers.Serializer):
    target_version = serializers.CharField(max_length=32)

    def validate_target_version(self, value):
        try:
            return validate_target_version(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc


class UpdateStartSerializer(TargetVersionSerializer):
    current_password = serializers.CharField(
        max_length=256,
        trim_whitespace=False,
        write_only=True,
    )


class UpdateCenterStatusSerializer(serializers.Serializer):
    status = serializers.CharField()
    enabled = serializers.BooleanField()
    connected = serializers.BooleanField()
    current_version = serializers.CharField()
    latest_version = serializers.CharField(allow_null=True)
    update_available = serializers.BooleanField()
    release_name = serializers.CharField(allow_null=True)
    release_url = serializers.URLField(allow_null=True)
    published_at = serializers.DateTimeField(allow_null=True)
    active_run = UpdateRunSerializer(allow_null=True)
    latest_run = UpdateRunSerializer(allow_null=True)
    preflight = serializers.JSONField(allow_null=True)


class InstallationUpdateCenterStatusAPIView(APIView):
    permission_classes = [IsInstallationAdmin]
    serializer_class = UpdateCenterStatusSerializer

    def get(self, request):
        payload = get_update_center_status()
        payload["active_run"] = (
            UpdateRunSerializer(payload["active_run"]).data if payload["active_run"] else None
        )
        payload["latest_run"] = (
            UpdateRunSerializer(payload["latest_run"]).data if payload["latest_run"] else None
        )
        response = Response(payload)
        response["Cache-Control"] = "private, no-store"
        return response


class InstallationUpdatePreflightAPIView(APIView):
    permission_classes = [IsInstallationAdmin]
    serializer_class = TargetVersionSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            payload = run_preflight(serializer.validated_data["target_version"])
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except UpdateAgentRejected:
            return Response(
                {"detail": "The update agent rejected the preflight request."},
                status=status.HTTP_409_CONFLICT,
            )
        except UpdateAgentUnavailable:
            return Response(
                {"detail": "The update agent is unavailable."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        response = Response(payload)
        response["Cache-Control"] = "private, no-store"
        return response


class InstallationUpdateStartAPIView(APIView):
    permission_classes = [IsInstallationAdmin]
    serializer_class = UpdateStartSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        if not request.user.check_password(serializer.validated_data["current_password"]):
            return Response(
                {"detail": "Password confirmation failed."},
                status=status.HTTP_403_FORBIDDEN,
            )
        idempotency_key = request.headers.get("Idempotency-Key", "")
        try:
            run, created = create_update_run(
                target_version=serializer.validated_data["target_version"],
                idempotency_key=idempotency_key,
                actor=request.user,
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except IntegrityError:
            return Response(
                {"detail": "Another installation update is already active."},
                status=status.HTTP_409_CONFLICT,
            )

        response_status = status.HTTP_202_ACCEPTED if created else status.HTTP_200_OK
        if run.status == InstallationUpdateRun.Status.MANUAL_INTERVENTION:
            response_status = status.HTTP_409_CONFLICT
        elif run.status == InstallationUpdateRun.Status.FAILED:
            response_status = (
                status.HTTP_503_SERVICE_UNAVAILABLE
                if run.failure_code == "agent_unavailable"
                else status.HTTP_409_CONFLICT
            )
        response = Response(UpdateRunSerializer(run).data, status=response_status)
        response["Cache-Control"] = "private, no-store"
        return response


class InstallationUpdateDetailAPIView(APIView):
    permission_classes = [IsInstallationAdmin]
    serializer_class = UpdateRunDetailSerializer

    def get(self, request, run_id):
        run = get_object_or_404(InstallationUpdateRun, pk=run_id)
        agent_connected = True
        state_fresh = True
        try:
            run = sync_update_run(run)
        except UpdateAgentUnavailable:
            agent_connected = False
            state_fresh = False
        response = Response(
            self.serializer_class(
                run,
                context={
                    "agent_connected": agent_connected,
                    "state_fresh": state_fresh,
                },
            ).data
        )
        response["Cache-Control"] = "private, no-store"
        return response
