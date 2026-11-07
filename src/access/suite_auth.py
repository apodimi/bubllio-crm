"""Validate Keycloak sessions and enforce each tenant's live Core access grant."""

import re
import json
from dataclasses import dataclass
from time import monotonic
from uuid import UUID
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, Request, build_opener

import jwt
from django.conf import settings
from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.exceptions import APIException, AuthenticationFailed, NotFound, PermissionDenied

from .models import SuiteOrganizationLink, SuiteUserLink


TENANT_PATH = re.compile(r"^/api/v1/organizations/([0-9a-fA-F-]{36})/")
SUITE_GLOBAL_PATHS = {
    "/api/v1/auth/suite/config/",
    "/api/v1/auth/me/",
    "/api/v1/auth/suite/resolve/",
    "/api/v1/organizations/",
    "/api/v1/search/",
}


class CoreUnavailable(APIException):
    status_code = 503
    default_detail = "Core access could not be checked."


@dataclass(frozen=True)
class SuitePrincipal:
    token: str
    issuer: str
    subject: str


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, file_pointer, code, message, headers, new_url):
        return None


def suite_enabled():
    values = (
        settings.SUITE_OIDC_ISSUER,
        settings.SUITE_OIDC_JWKS_URL,
        settings.SUITE_OIDC_AUDIENCE,
        settings.SUITE_CORE_API_URL,
    )
    return all(values)


def check_core_access(principal: SuitePrincipal, core_organization_id, *, timeout=3):
    url = (
        f"{settings.SUITE_CORE_API_URL}/api/v1/organizations/"
        f"{core_organization_id}/applications/crm/access"
    )
    request = Request(url, headers={"Authorization": f"Bearer {principal.token}", "Accept": "application/json"})
    try:
        with build_opener(NoRedirect).open(request, timeout=timeout) as response:
            if response.status != 200:
                raise CoreUnavailable()
            body = response.read(4097)
            if len(body) > 4096:
                raise CoreUnavailable()
            payload = json.loads(body)
    except HTTPError as error:
        if error.code in (401, 403, 404):
            raise PermissionDenied("CRM access is unavailable for this organization.") from error
        raise CoreUnavailable() from error
    except (URLError, TimeoutError, ValueError, UnicodeDecodeError, OSError) as error:
        raise CoreUnavailable() from error
    if not isinstance(payload, dict) or type(payload.get("allowed")) is not bool:
        raise CoreUnavailable()
    if not payload["allowed"]:
        raise PermissionDenied("CRM access is unavailable for this organization.")


def suite_organizations(request, queryset):
    """Filter local memberships by live Core grants for suite sessions."""
    if not isinstance(request.auth, SuitePrincipal):
        return queryset
    permitted = []
    deadline = monotonic() + 3
    for organization in queryset:
        link = SuiteOrganizationLink.objects.filter(organization=organization).first()
        if not link:
            continue
        remaining = deadline - monotonic()
        if remaining <= 0:
            raise CoreUnavailable()
        try:
            check_core_access(request.auth, link.core_organization_id, timeout=remaining)
        except PermissionDenied:
            continue
        permitted.append(organization.id)
    return queryset.filter(id__in=permitted)


class SuiteAuthentication(BaseAuthentication):
    def authenticate_header(self, request):
        return "Bearer"

    def authenticate(self, request):
        if not suite_enabled():
            return None
        parts = get_authorization_header(request).split()
        if len(parts) != 2 or parts[0].lower() != b"bearer":
            if parts and settings.CORE_REQUIRED:
                raise AuthenticationFailed("A suite Bearer token is required.")
            return None
        try:
            token = parts[1].decode("ascii")
            unverified = jwt.decode(token, options={"verify_signature": False})
        except (UnicodeDecodeError, jwt.PyJWTError):
            if settings.CORE_REQUIRED:
                raise AuthenticationFailed("Invalid suite access token.")
            return None  # Let SimpleJWT handle its own tokens and errors.
        if unverified.get("iss") != settings.SUITE_OIDC_ISSUER:
            if settings.CORE_REQUIRED:
                raise AuthenticationFailed("Invalid suite token issuer.")
            return None
        try:
            key = jwt.PyJWKClient(settings.SUITE_OIDC_JWKS_URL, timeout=3).get_signing_key_from_jwt(token)
            claims = jwt.decode(
                token,
                key.key,
                algorithms=["RS256"],
                audience=settings.SUITE_OIDC_AUDIENCE,
                issuer=settings.SUITE_OIDC_ISSUER,
                options={"require": ["exp", "iat", "iss", "aud", "sub"]},
            )
        except (jwt.PyJWTError, URLError, TimeoutError, ValueError) as error:
            raise AuthenticationFailed("Invalid suite access token.") from error
        link = SuiteUserLink.objects.select_related("user").filter(
            issuer=claims["iss"], subject=claims["sub"]
        ).first()
        if not link or not link.user.is_active:
            raise PermissionDenied("This suite identity is not linked to a CRM user.")
        principal = SuitePrincipal(token, claims["iss"], claims["sub"])
        match = TENANT_PATH.match(request.path)
        if match:
            suffix = request.path[match.end():]
            if suffix.startswith(("members/", "invitations/")) or (
                not suffix and request.method == "DELETE"
            ):
                raise PermissionDenied("Suite membership is managed in Core.")
            try:
                organization_id = UUID(match.group(1))
            except ValueError as error:
                raise NotFound() from error
            org_link = SuiteOrganizationLink.objects.filter(organization_id=organization_id).first()
            if not org_link:
                raise NotFound()
            if not org_link.organization.memberships.filter(user=link.user).exists():
                raise NotFound()
            check_core_access(principal, org_link.core_organization_id)
        elif request.path not in SUITE_GLOBAL_PATHS:
            raise PermissionDenied("This CRM route is not available to suite sessions.")
        elif request.path == "/api/v1/organizations/" and request.method != "GET":
            raise PermissionDenied("Suite workspaces are managed in Core.")
        return link.user, principal
