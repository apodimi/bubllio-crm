import json
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import override_settings
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from access.models import SuiteOrganizationLink, SuiteUserLink
from organizations.models import Organization, OrganizationMembership


ISSUER = "https://identity.example.test/realms/bubllio"
CORE_URL = "https://core.example.test"


class CoreResponse(BytesIO):
    status = 200


@override_settings(
    SUITE_OIDC_ISSUER=ISSUER,
    SUITE_OIDC_JWKS_URL=f"{ISSUER}/protocol/openid-connect/certs",
    SUITE_OIDC_AUDIENCE="bubllio-crm-api",
    SUITE_CORE_API_URL=CORE_URL,
)
class SuiteAuthenticationTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="suite-user", password="legacy-password")
        self.first = Organization.objects.create(name="First", slug="first")
        self.second = Organization.objects.create(name="Second", slug="second")
        for organization in (self.first, self.second):
            OrganizationMembership.objects.create(
                user=self.user, organization=organization, role=OrganizationMembership.Role.OWNER
            )
        self.core_first = uuid4()
        self.core_second = uuid4()
        SuiteUserLink.objects.create(user=self.user, issuer=ISSUER, subject="immutable-subject")
        SuiteOrganizationLink.objects.create(organization=self.first, core_organization_id=self.core_first)
        SuiteOrganizationLink.objects.create(organization=self.second, core_organization_id=self.core_second)
        self.private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

    def authorize(self, **claims):
        payload = {
            "iss": ISSUER, "sub": "immutable-subject", "aud": ["bubllio-crm-api", "bubllio-core-api"],
            "iat": 1780000000, "exp": 2000000000,
        }
        payload.update(claims)
        token = jwt.encode(payload, self.private_key, algorithm="RS256", headers={"kid": "test-key"})
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def core_decision(self, request, timeout):
        self.assertGreater(timeout, 0)
        self.assertLessEqual(timeout, 3)
        self.assertTrue(request.full_url.startswith(f"{CORE_URL}/api/v1/organizations/"))
        allowed = str(self.core_first) in request.full_url
        return CoreResponse(json.dumps({"allowed": allowed}).encode())

    def test_suite_token_requires_core_grant_for_direct_tenant_api(self):
        self.authorize()
        with patch("access.suite_auth.jwt.PyJWKClient") as jwks, patch(
            "access.suite_auth.build_opener", return_value=SimpleNamespace(open=self.core_decision)
        ):
            jwks.return_value.get_signing_key_from_jwt.return_value.key = self.private_key.public_key()
            allowed = self.client.get(f"/api/v1/organizations/{self.first.id}/companies/")
            denied = self.client.get(f"/api/v1/organizations/{self.second.id}/companies/")
            organizations = self.client.get("/api/v1/organizations/")
            resolved = self.client.get(f"/api/v1/auth/suite/resolve/?organization_id={self.core_first}")
        self.assertEqual(allowed.status_code, 200)
        self.assertEqual(denied.status_code, 403)
        self.assertEqual([entry["id"] for entry in organizations.data], [str(self.first.id)])
        self.assertEqual(resolved.data, {"organization_id": self.first.id})

    def test_unmapped_and_wrong_audience_fail_closed(self):
        self.authorize()
        SuiteOrganizationLink.objects.filter(organization=self.first).delete()
        with patch("access.suite_auth.jwt.PyJWKClient") as jwks:
            jwks.return_value.get_signing_key_from_jwt.return_value.key = self.private_key.public_key()
            unmapped = self.client.get(f"/api/v1/organizations/{self.first.id}/companies/")
            self.authorize(aud="another-api")
            wrong_audience = self.client.get(f"/api/v1/organizations/{self.second.id}/companies/")
        self.assertEqual(unmapped.status_code, 404)
        self.assertEqual(wrong_audience.status_code, 401)

    def test_core_outage_denies_tenant_data(self):
        self.authorize()

        def unavailable(*args, **kwargs):
            raise TimeoutError()

        with patch("access.suite_auth.jwt.PyJWKClient") as jwks, patch(
            "access.suite_auth.build_opener", return_value=SimpleNamespace(open=unavailable)
        ):
            jwks.return_value.get_signing_key_from_jwt.return_value.key = self.private_key.public_key()
            response = self.client.get(f"/api/v1/organizations/{self.first.id}/companies/")
        self.assertEqual(response.status_code, 503)

    def test_legacy_jwt_still_works_without_core(self):
        token = RefreshToken.for_user(self.user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        response = self.client.get(f"/api/v1/organizations/{self.second.id}/companies/")
        self.assertEqual(response.status_code, 200)

    def test_suite_session_cannot_manage_parallel_memberships_or_workspaces(self):
        self.authorize()
        with patch("access.suite_auth.jwt.PyJWKClient") as jwks, patch(
            "access.suite_auth.build_opener", return_value=SimpleNamespace(open=self.core_decision)
        ):
            jwks.return_value.get_signing_key_from_jwt.return_value.key = self.private_key.public_key()
            members = self.client.get(f"/api/v1/organizations/{self.first.id}/members/")
            created = self.client.post("/api/v1/organizations/", {"name": "Other", "slug": "other"})
            deleted = self.client.delete(f"/api/v1/organizations/{self.first.id}/")
        self.assertEqual((members.status_code, created.status_code, deleted.status_code), (403, 403, 403))
        self.assertTrue(Organization.objects.filter(pk=self.first.id).exists())

    def test_suite_profile_is_hidden_without_any_core_grant(self):
        self.authorize()

        def denied(*args, **kwargs):
            return CoreResponse(b'{"allowed": false}')

        with patch("access.suite_auth.jwt.PyJWKClient") as jwks, patch(
            "access.suite_auth.build_opener", return_value=SimpleNamespace(open=denied)
        ):
            jwks.return_value.get_signing_key_from_jwt.return_value.key = self.private_key.public_key()
            profile = self.client.get("/api/v1/auth/me/")
        self.assertEqual(profile.status_code, 403)

    def test_operator_link_command_is_idempotent_and_rejects_conflicts(self):
        options = {
            "user_id": self.user.pk,
            "subject": "immutable-subject",
            "crm_organization_id": self.first.id,
            "core_organization_id": self.core_first,
        }
        call_command("link_suite_identity", **options)
        self.assertEqual(SuiteUserLink.objects.count(), 1)
        self.assertEqual(SuiteOrganizationLink.objects.count(), 2)
        with self.assertRaises(CommandError):
            call_command("link_suite_identity", **{**options, "subject": "different-subject"})
