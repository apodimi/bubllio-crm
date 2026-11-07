from io import BytesIO, StringIO
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import override_settings
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken
import jwt
from cryptography.hazmat.primitives.asymmetric import rsa

from access.models import SuiteOrganizationLink, SuiteUserLink
from organizations.models import InstallationState, Organization, OrganizationMembership


ISSUER = "https://identity.example.test/realms/bubllio"


@override_settings(
    CORE_REQUIRED=True,
    SUITE_OIDC_ISSUER=ISSUER,
    SUITE_OIDC_JWKS_URL=f"{ISSUER}/protocol/openid-connect/certs",
    SUITE_OIDC_AUDIENCE="bubllio-crm-api",
    SUITE_CORE_API_URL="https://core.example.test",
    SUITE_OIDC_CLIENT_ID="bubllio-crm-web",
)
class CoreRequiredTests(APITestCase):
    def test_exact_core_grant_controls_two_tenant_urls(self):
        user = get_user_model().objects.create_user(username="suite", password=None)
        SuiteUserLink.objects.create(user=user, issuer=ISSUER, subject="suite-sub")
        first = Organization.objects.create(name="First", slug="first")
        second = Organization.objects.create(name="Second", slug="second")
        core_first, core_second = uuid4(), uuid4()
        for organization, core_id in ((first, core_first), (second, core_second)):
            OrganizationMembership.objects.create(user=user, organization=organization, role="member")
            SuiteOrganizationLink.objects.create(organization=organization, core_organization_id=core_id)

        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        token = jwt.encode(
            {"iss": ISSUER, "sub": "suite-sub", "aud": ["bubllio-crm-api", "bubllio-core-api"],
             "iat": 1780000000, "exp": 2000000000},
            key, algorithm="RS256", headers={"kid": "test-key"},
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        def decision(request, timeout):
            allowed = str(core_first) in request.full_url
            response = BytesIO(b'{"allowed": true}' if allowed else b'{"allowed": false}')
            response.status = 200
            return response

        with patch("access.suite_auth.jwt.PyJWKClient") as jwks, patch(
            "access.suite_auth.build_opener", return_value=SimpleNamespace(open=decision)
        ):
            jwks.return_value.get_signing_key_from_jwt.return_value.key = key.public_key()
            allowed = self.client.get(f"/api/v1/organizations/{first.id}/companies/")
            denied = self.client.get(f"/api/v1/organizations/{second.id}/companies/")
        self.assertEqual(allowed.status_code, 200)
        self.assertEqual(denied.status_code, 403)

    def test_legacy_credential_and_setup_routes_are_closed(self):
        routes = (
            "/api/v1/auth/token/",
            "/api/v1/auth/token/refresh/",
            "/api/v1/auth/password-reset/",
            "/api/v1/setup/",
            "/api/v1/invitations/example/accept/",
            "/api/v1/installation-admin-invitations/example/accept/",
            "/api-auth/login/",
            "/admin/login/",
        )
        for route in routes:
            with self.subTest(route=route):
                self.assertEqual(self.client.post(route, {}, format="json").status_code, 404)

    def test_legacy_token_cannot_access_core_required_api(self):
        user = get_user_model().objects.create_user(username="legacy", password="old-password")
        token = RefreshToken.for_user(user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertEqual(self.client.get("/api/v1/auth/me/").status_code, 401)

    def test_public_config_exposes_only_oidc_client_metadata(self):
        response = self.client.get("/api/v1/auth/suite/config/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {
            "url": "https://identity.example.test",
            "realm": "bubllio",
            "clientId": "bubllio-crm-web",
        })

    def test_passwordless_bootstrap_and_member_provisioning(self):
        output = StringIO()
        call_command(
            "bootstrap_suite_crm", subject="operator-sub", workspace_slug="migration-staging", stdout=output
        )
        administrator = get_user_model().objects.get()
        staging = Organization.objects.get()
        self.assertFalse(administrator.has_usable_password())
        self.assertFalse(administrator.is_staff)
        self.assertFalse(administrator.is_superuser)
        self.assertTrue(InstallationState.objects.get(pk=1).completed_at)
        self.assertEqual(SuiteUserLink.objects.get(user=administrator).subject, "operator-sub")
        self.assertTrue(OrganizationMembership.objects.filter(
            user=administrator, organization=staging, role="owner"
        ).exists())

        core_id = uuid4()
        call_command(
            "provision_suite_member",
            subject="member-sub",
            crm_organization_id=staging.id,
            core_organization_id=core_id,
            role="viewer",
            stdout=StringIO(),
        )
        member = SuiteUserLink.objects.get(subject="member-sub").user
        self.assertFalse(member.has_usable_password())
        self.assertEqual(OrganizationMembership.objects.get(user=member, organization=staging).role, "viewer")
        self.assertEqual(SuiteOrganizationLink.objects.get(organization=staging).core_organization_id, core_id)
