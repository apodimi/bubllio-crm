from django.db import transaction

from organizations.models import Organization

from .models import Company, CompanyActivity


def record_company_activity(*, company, actor, action, details=None):
    return CompanyActivity.objects.create(
        organization=company.organization,
        company=company,
        actor=actor,
        action=action,
        details=details or {},
    )


def _next_customer_code(organization):
    codes = Company.objects.filter(
        organization=organization,
        customer_code__startswith="CUS-",
    ).values_list("customer_code", flat=True)
    numbers = [
        int(code.removeprefix("CUS-"))
        for code in codes
        if code.removeprefix("CUS-").isdigit()
    ]
    return f"CUS-{max(numbers, default=0) + 1:05d}"


@transaction.atomic
def create_company(*, serializer, organization, actor):
    Organization.objects.select_for_update().get(pk=organization.pk)
    company = serializer.save(
        organization=organization,
        customer_code=_next_customer_code(organization),
    )
    record_company_activity(
        company=company,
        actor=actor,
        action=CompanyActivity.Action.CREATED,
    )
    return company
