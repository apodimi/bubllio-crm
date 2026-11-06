from django.conf import settings
from django.db import models


class SuiteUserLink(models.Model):
    """Operator-approved immutable identity link; email is never used for access."""

    issuer = models.URLField(max_length=512)
    subject = models.CharField(max_length=255)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    class Meta:
        constraints = [models.UniqueConstraint(fields=("issuer", "subject"), name="unique_suite_subject")]


class SuiteOrganizationLink(models.Model):
    """Operator-approved Core organization to CRM tenant mapping."""

    core_organization_id = models.UUIDField(unique=True)
    organization = models.OneToOneField("organizations.Organization", on_delete=models.CASCADE)
