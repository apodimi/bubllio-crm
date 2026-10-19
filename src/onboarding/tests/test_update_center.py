import hashlib
import hmac
import json
from io import BytesIO
from unittest.mock import Mock, patch
from urllib.error import HTTPError

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from onboarding.models import InstallationUpdateEvent, InstallationUpdateRun
from onboarding.services.update_agent import (
    RejectRedirectHandler,
    UpdateAgentRejected,
    UpdateAgentUnavailable,
    request_preflight,
)


AGENT_SETTINGS = {
    "BUBLLIO_UPDATE_AGENT_ENABLED": True,
    "BUBLLIO_UPDATE_AGENT_URL": "http://update-agent:8080",
    "BUBLLIO_UPDATE_AGENT_SOCKET": "",
    "BUBLLIO_UPDATE_AGENT_INSTALLATION_ID": "11111111-1111-4111-8111-111111111111",
    "BUBLLIO_UPDATE_AGENT_SECRET": "test-shared-secret-at-least-32-bytes",
    "BUBLLIO_UPDATE_AGENT_TIMEOUT": 5,
    "BUBLLIO_UPDATE_AGENT_ALLOW_INSECURE_HTTP": True,
}


def preflight(*, policy="online_safe", eligible=True):
    return {
        "installation_id": "11111111-1111-4111-8111-111111111111",
        "target_version": "1.2.3",
        "eligible": eligible,
        "migration_policy": policy,
        "checks": [
            {"key": "backup", "status": "pass", "label": "Backup", "guidance": "Ready"},
        ],
        "manifest": {
            "commit_sha": "a" * 40,
            "release_url": "https://example.invalid/releases/1.2.3",
            "expected_schema": "crm-42",
            "private_token": "must-not-leak",
        },
    }


def response_signature(status_code, path, timestamp, body):
    digest = hashlib.sha256(body).hexdigest()
    signed = (
        f"{status_code}\n{path}\n{timestamp}\n"
        f"11111111-1111-4111-8111-111111111111\n{digest}"
    ).encode()
    return hmac.new(
        b"test-shared-secret-at-least-32-bytes",
        signed,
        hashlib.sha256,
    ).hexdigest()


@override_settings(**AGENT_SETTINGS)
class InstallationUpdateCenterAPITests(APITestCase):
    def setUp(self):
        self.admin = get_user_model().objects.create_superuser(
            username="installation-admin",
            email="admin@example.com",
            password="password",
        )
        self.member = get_user_model().objects.create_user(username="member", password="password")

    def authenticate_admin(self):
        self.client.force_authenticate(self.admin)

    def test_only_installation_admin_can_access_update_center(self):
        self.client.force_authenticate(self.member)

        self.assertEqual(
            self.client.get(reverse("installation-update-center-status")).status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(
            self.client.post(
                reverse("installation-update-preflight"),
                {"target_version": "1.2.3"},
                format="json",
            ).status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(
            self.client.post(
                reverse("installation-update-start"),
                {"target_version": "1.2.3", "current_password": "password"},
                format="json",
                HTTP_IDEMPOTENCY_KEY="request-12345678",
            ).status_code,
            status.HTTP_403_FORBIDDEN,
        )

    @patch("onboarding.services.update_orchestration.get_agent_status", return_value={"status": "ready"})
    @patch("onboarding.services.update_orchestration.get_update_status")
    def test_status_reports_connection_and_active_run(self, update_status, _agent_status):
        update_status.return_value = {
            "status": "ok",
            "enabled": True,
            "current_version": "1.2.2",
            "latest_version": "1.2.3",
            "update_available": True,
            "release_name": "1.2.3",
            "release_url": "https://example.invalid/release",
            "published_at": None,
        }
        self.authenticate_admin()

        response = self.client.get(reverse("installation-update-center-status"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["enabled"])
        self.assertTrue(response.data["connected"])
        self.assertIsNone(response.data["active_run"])
        self.assertIsNone(response.data["latest_run"])
        self.assertEqual(response["Cache-Control"], "private, no-store")

    @patch("onboarding.services.update_orchestration.request_preflight", side_effect=lambda version: preflight())
    def test_preflight_returns_only_sanitized_verified_metadata(self, _request):
        self.authenticate_admin()

        response = self.client.post(
            reverse("installation-update-preflight"),
            {"target_version": "1.2.3"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["eligible"])
        self.assertEqual(response.data["migration_policy"], "online_safe")
        self.assertNotIn("private_token", response.data["manifest"])
        self.assertEqual(response["Cache-Control"], "private, no-store")

    @patch(
        "onboarding.services.update_orchestration.request_preflight",
        return_value={
            "target_version": "1.2.3",
            "commit_sha": "b" * 40,
            "migration_policy": "online_safe",
            "expected_schema": "crm-42",
            "rollback_compatible": True,
            "eligible": False,
            "blockers": [{"code": "backup_missing", "message": "Create a backup."}],
        },
    )
    def test_preflight_maps_agent_blockers_to_safe_checks(self, _request):
        self.authenticate_admin()

        response = self.client.post(
            reverse("installation-update-preflight"),
            {"target_version": "1.2.3"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["eligible"])
        self.assertEqual(response.data["checks"][0]["key"], "backup_missing")
        self.assertEqual(response.data["manifest"]["commit_sha"], "b" * 40)

    def test_prerelease_or_noncanonical_target_is_rejected(self):
        self.authenticate_admin()

        for target in ("v1.2.3", "1.2.3-rc1", "01.2.3", "latest"):
            response = self.client.post(
                reverse("installation-update-preflight"),
                {"target_version": target},
                format="json",
            )
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, target)

    @patch("onboarding.services.update_orchestration.current_version", return_value="1.2.3")
    def test_downgrade_and_reinstall_are_rejected(self, _current):
        self.authenticate_admin()

        for target in ("1.2.3", "1.2.2"):
            response = self.client.post(
                reverse("installation-update-preflight"),
                {"target_version": target},
                format="json",
            )
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, target)

    def test_start_requires_idempotency_key(self):
        self.authenticate_admin()

        response = self.client.post(
            reverse("installation-update-start"),
            {"target_version": "1.2.3", "current_password": "password"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(InstallationUpdateRun.objects.count(), 0)

    @patch("onboarding.api.update_center.create_update_run")
    def test_start_requires_current_password_step_up(self, create_run):
        self.authenticate_admin()

        response = self.client.post(
            reverse("installation-update-start"),
            {"target_version": "1.2.3", "current_password": "wrong-password"},
            format="json",
            HTTP_IDEMPOTENCY_KEY="request-12345678",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data, {"detail": "Password confirmation failed."})
        create_run.assert_not_called()

    @patch(
        "onboarding.services.update_orchestration.get_agent_update",
        return_value={
            "id": "agent-job-1",
            "target_version": "1.2.3",
            "state": "DEPLOYING",
            "progress": 45,
            "phase": "Restarting services",
        },
    )
    @patch(
        "onboarding.services.update_orchestration.start_agent_update",
        return_value={"id": "agent-job-1", "status": "requested"},
    )
    @patch("onboarding.services.update_orchestration.request_preflight", side_effect=lambda version: preflight())
    def test_start_is_persistent_audited_and_idempotent(self, _preflight, start, _detail):
        self.authenticate_admin()
        url = reverse("installation-update-start")
        headers = {"HTTP_IDEMPOTENCY_KEY": "request-12345678"}

        body = {"target_version": "1.2.3", "current_password": "password"}
        first = self.client.post(url, body, format="json", **headers)
        replay = self.client.post(url, body, format="json", **headers)

        self.assertEqual(first.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(replay.status_code, status.HTTP_200_OK)
        self.assertEqual(first.data["id"], replay.data["id"])
        self.assertEqual(first.data["status"], "deploying")
        self.assertEqual(first.data["progress"], 45)
        self.assertEqual(start.call_count, 1)
        run = InstallationUpdateRun.objects.get()
        self.assertEqual(run.requested_by, self.admin)
        self.assertGreaterEqual(InstallationUpdateEvent.objects.filter(run=run).count(), 3)

    @patch(
        "onboarding.services.update_orchestration.get_agent_update",
        side_effect=UpdateAgentUnavailable,
    )
    @patch("onboarding.services.update_orchestration.start_agent_update", return_value={"id": "agent-job-1"})
    @patch("onboarding.services.update_orchestration.request_preflight", side_effect=lambda version: preflight())
    def test_failed_first_poll_does_not_retry_an_accepted_update(self, _preflight, start, _detail):
        self.authenticate_admin()
        headers = {"HTTP_IDEMPOTENCY_KEY": "request-12345678"}

        first = self.client.post(
            reverse("installation-update-start"),
            {"target_version": "1.2.3", "current_password": "password"},
            format="json",
            **headers,
        )
        replay = self.client.post(
            reverse("installation-update-start"),
            {"target_version": "1.2.3", "current_password": "password"},
            format="json",
            **headers,
        )

        self.assertEqual(first.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(first.data["status"], "preflight")
        self.assertEqual(replay.status_code, status.HTTP_200_OK)
        self.assertEqual(start.call_count, 1)

    @patch(
        "onboarding.services.update_orchestration.get_agent_update",
        return_value={"state": "DEPLOYING", "target_version": "1.2.3", "progress": 20},
    )
    @patch("onboarding.services.update_orchestration.start_agent_update", return_value={"id": "agent-job-1"})
    def test_idempotent_replay_recovers_run_if_crash_preceded_agent_id_save(self, start, _detail):
        self.authenticate_admin()
        run = InstallationUpdateRun.objects.create(
            target_version="1.2.3",
            idempotency_key="request-12345678",
            requested_by=self.admin,
            status=InstallationUpdateRun.Status.PREFLIGHT,
        )

        response = self.client.post(
            reverse("installation-update-start"),
            {"target_version": "1.2.3", "current_password": "password"},
            format="json",
            HTTP_IDEMPOTENCY_KEY="request-12345678",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "deploying")
        run.refresh_from_db()
        self.assertEqual(run.agent_job_id, "agent-job-1")
        start.assert_called_once_with("1.2.3", "request-12345678")

    @patch(
        "onboarding.services.update_orchestration.get_agent_update",
        return_value={"state": "DEPLOYING", "target_version": "1.2.3", "progress": 10},
    )
    @patch("onboarding.services.update_orchestration.start_agent_update", return_value={"id": "agent-job-1"})
    @patch("onboarding.services.update_orchestration.request_preflight", side_effect=lambda version: preflight())
    def test_only_one_update_can_be_active(self, _preflight, _start, _detail):
        self.authenticate_admin()
        first = self.client.post(
            reverse("installation-update-start"),
            {"target_version": "1.2.3", "current_password": "password"},
            format="json",
            HTTP_IDEMPOTENCY_KEY="request-12345678",
        )
        second = self.client.post(
            reverse("installation-update-start"),
            {"target_version": "1.2.4", "current_password": "password"},
            format="json",
            HTTP_IDEMPOTENCY_KEY="request-87654321",
        )

        self.assertEqual(first.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(second.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(InstallationUpdateRun.objects.count(), 1)

    @patch(
        "onboarding.services.update_orchestration.request_preflight",
        side_effect=lambda version: preflight(policy="maintenance"),
    )
    def test_maintenance_release_requires_manual_intervention(self, _request):
        self.authenticate_admin()

        response = self.client.post(
            reverse("installation-update-start"),
            {"target_version": "1.2.3", "current_password": "password"},
            format="json",
            HTTP_IDEMPOTENCY_KEY="request-12345678",
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data["status"], "manual_intervention")
        self.assertEqual(response.data["failure_code"], "maintenance_required")

    @patch(
        "onboarding.services.update_orchestration.get_agent_update",
        return_value={
            "state": "FAILED",
            "target_version": "1.2.3",
            "progress": 70,
            "error": {
                "code": "secret=https://token.example",
                "message": "database password is hunter2",
            },
        },
    )
    def test_detail_never_exposes_raw_agent_failure(self, _detail):
        self.authenticate_admin()
        run = InstallationUpdateRun.objects.create(
            target_version="1.2.3",
            idempotency_key="request-12345678",
            requested_by=self.admin,
            status=InstallationUpdateRun.Status.DEPLOYING,
            agent_job_id="agent-job-1",
        )

        response = self.client.get(reverse("installation-update-detail", args=(run.pk,)))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["failure_code"], "update_failed")
        self.assertTrue(response.data["agent_connected"])
        self.assertTrue(response.data["state_fresh"])
        serialized = json.dumps(response.data)
        self.assertNotIn("hunter2", serialized)
        self.assertNotIn("token.example", serialized)

    @patch(
        "onboarding.api.update_center.sync_update_run",
        side_effect=UpdateAgentUnavailable,
    )
    def test_detail_marks_stored_state_as_stale_when_agent_is_unavailable(self, _sync):
        self.authenticate_admin()
        run = InstallationUpdateRun.objects.create(
            target_version="1.2.3",
            idempotency_key="request-12345678",
            requested_by=self.admin,
            status=InstallationUpdateRun.Status.DEPLOYING,
            agent_job_id="agent-job-1",
        )

        response = self.client.get(reverse("installation-update-detail", args=(run.pk,)))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["agent_connected"])
        self.assertFalse(response.data["state_fresh"])
        self.assertEqual(response.data["status"], "deploying")


@override_settings(**AGENT_SETTINGS)
class UpdateAgentAuthenticationTests(TestCase):
    @patch("onboarding.services.update_agent.time.time", return_value=1_700_000_000)
    @patch("onboarding.services.update_agent.build_opener")
    def test_request_is_hmac_authenticated_over_canonical_body(self, build, _clock):
        response_body = json.dumps(preflight()).encode()
        response = BytesIO(response_body)
        response.status = 200
        response.headers = {
            "X-Bubllio-Response-Signature": response_signature(
                200,
                "/v1/preflight",
                "1700000000",
                response_body,
            )
        }
        build.return_value.open.return_value = response

        request_preflight("1.2.3")

        request = build.return_value.open.call_args.args[0]
        body = b'{"target_version":"1.2.3"}'
        digest = hashlib.sha256(body).hexdigest()
        signed = (
            "POST\n/v1/preflight\n1700000000\n"
            f"11111111-1111-4111-8111-111111111111\n{digest}"
        ).encode()
        expected = hmac.new(b"test-shared-secret-at-least-32-bytes", signed, hashlib.sha256).hexdigest()
        self.assertEqual(request.data, body)
        self.assertEqual(request.get_header("X-bubllio-signature"), expected)
        self.assertEqual(
            request.get_header("X-bubllio-installation-id"),
            "11111111-1111-4111-8111-111111111111",
        )
        self.assertNotIn("test-shared-secret", request.full_url)

    @override_settings(BUBLLIO_UPDATE_AGENT_ALLOW_INSECURE_HTTP=False)
    @patch("onboarding.services.update_agent.build_opener")
    def test_remote_plaintext_agent_transport_is_rejected(self, build):
        with self.assertRaises(UpdateAgentUnavailable):
            request_preflight("1.2.3")

        build.assert_not_called()

    @override_settings(BUBLLIO_UPDATE_AGENT_URL="https://updates.example.invalid")
    @patch("onboarding.services.update_agent.build_opener")
    def test_remote_redirect_is_not_followed(self, build):
        redirect_body = json.dumps(
            {"installation_id": "11111111-1111-4111-8111-111111111111"}
        ).encode()
        build.return_value.open.side_effect = HTTPError(
            "https://updates.example.invalid/v1/preflight",
            302,
            "Found",
            {},
            BytesIO(redirect_body),
        )

        with self.assertRaises(UpdateAgentUnavailable):
            request_preflight("1.2.3")

        self.assertEqual(build.return_value.open.call_count, 1)
        self.assertIsInstance(build.call_args.args[0], RejectRedirectHandler)

    @override_settings(
        BUBLLIO_UPDATE_AGENT_URL="http://remote.example.invalid",
        BUBLLIO_UPDATE_AGENT_SOCKET="/run/bubllio-update-agent/agent.sock",
        BUBLLIO_UPDATE_AGENT_ALLOW_INSECURE_HTTP=False,
    )
    @patch("onboarding.services.update_agent.time.time", return_value=1_700_000_000)
    @patch("onboarding.services.update_agent.UnixHTTPConnection")
    def test_unix_socket_takes_precedence_over_url(self, connection_class, _clock):
        response = Mock(status=200)
        response_body = json.dumps(preflight()).encode()
        response.read.return_value = response_body
        response.getheader.return_value = response_signature(
            200,
            "/v1/preflight",
            "1700000000",
            response_body,
        )
        connection = connection_class.return_value
        connection.getresponse.return_value = response

        result = request_preflight("1.2.3")

        self.assertEqual(result["target_version"], "1.2.3")
        connection_class.assert_called_once_with(
            "/run/bubllio-update-agent/agent.sock",
            timeout=5,
        )
        request_args = connection.request.call_args
        self.assertEqual(request_args.args[:2], ("POST", "/v1/preflight"))
        self.assertEqual(request_args.kwargs["body"], b'{"target_version":"1.2.3"}')
        self.assertIn("X-Bubllio-Signature", request_args.kwargs["headers"])
        connection.close.assert_called_once_with()

    @override_settings(
        BUBLLIO_UPDATE_AGENT_URL="",
        BUBLLIO_UPDATE_AGENT_SOCKET="relative/update-agent.sock",
    )
    @patch("onboarding.services.update_agent.UnixHTTPConnection")
    def test_unix_socket_path_must_be_absolute(self, connection_class):
        with self.assertRaises(UpdateAgentUnavailable):
            request_preflight("1.2.3")

        connection_class.assert_not_called()

    @override_settings(BUBLLIO_UPDATE_AGENT_SOCKET="/run/bubllio-update-agent/agent.sock")
    @patch("onboarding.services.update_agent.time.time", return_value=1_700_000_000)
    @patch("onboarding.services.update_agent.UnixHTTPConnection")
    def test_response_installation_identity_must_match(self, connection_class, _clock):
        response = Mock(status=200)
        payload = preflight()
        payload["installation_id"] = "22222222-2222-4222-8222-222222222222"
        response_body = json.dumps(payload).encode()
        response.read.return_value = response_body
        response.getheader.return_value = response_signature(
            200,
            "/v1/preflight",
            "1700000000",
            response_body,
        )
        connection_class.return_value.getresponse.return_value = response

        with self.assertRaises(UpdateAgentRejected):
            request_preflight("1.2.3")

    @override_settings(BUBLLIO_UPDATE_AGENT_SOCKET="/run/bubllio-update-agent/agent.sock")
    @patch("onboarding.services.update_agent.UnixHTTPConnection")
    def test_response_mac_is_required_before_json_is_trusted(self, connection_class):
        response = Mock(status=200)
        response.read.return_value = json.dumps(preflight()).encode()
        response.getheader.return_value = None
        connection_class.return_value.getresponse.return_value = response

        with self.assertRaises(UpdateAgentRejected):
            request_preflight("1.2.3")
