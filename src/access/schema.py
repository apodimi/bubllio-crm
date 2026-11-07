"""Expose the suite bearer token in the generated CRM API contract."""

from drf_spectacular.extensions import OpenApiAuthenticationExtension


class SuiteAuthenticationScheme(OpenApiAuthenticationExtension):
    target_class = "access.suite_auth.SuiteAuthentication"
    name = "suiteBearerAuth"

    def get_security_definition(self, auto_schema):
        return {"type": "http", "scheme": "bearer", "bearerFormat": "JWT"}
