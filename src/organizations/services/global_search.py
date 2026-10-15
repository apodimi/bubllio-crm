from dataclasses import dataclass
from decimal import Decimal

from django.db.models import Case, F, IntegerField, Q, Value, When
from django.db.models.functions import Concat, Lower

from companies.models import Company
from contacts.models import Contact
from deals.models import Deal


SEARCH_TYPES = ("company", "contact", "deal")
_TYPE_ORDER = {result_type: index for index, result_type in enumerate(SEARCH_TYPES)}


@dataclass(frozen=True)
class SearchResult:
    type: str
    id: str
    display_name: str
    organization_id: str
    organization_name: str
    rank: int
    fields: dict


def _search_rank(title_field, query, *, identity_fields=()):
    identity_match = Q()
    for field in identity_fields:
        identity_match |= Q(**{f"{field}__iexact": query})

    cases = []
    if identity_fields:
        cases.append(When(identity_match, then=Value(0)))
    cases.extend(
        (
            When(**{f"{title_field}__iexact": query}, then=Value(1)),
            When(**{f"{title_field}__istartswith": query}, then=Value(2)),
            When(**{f"{title_field}__icontains": query}, then=Value(3)),
        )
    )
    return Case(*cases, default=Value(4), output_field=IntegerField())


def _company_results(*, organizations, query, candidate_limit):
    matches = Company.objects.filter(
        organization__in=organizations,
        archived_at__isnull=True,
    ).filter(
        Q(name__icontains=query)
        | Q(customer_code__icontains=query)
        | Q(tax_id__icontains=query)
        | Q(email__icontains=query)
        | Q(phone_number__icontains=query)
    )
    count = matches.count()
    candidates = (
        matches.select_related("organization")
        .annotate(
            search_rank=_search_rank(
                "name",
                query,
                identity_fields=("customer_code", "email", "phone_number"),
            ),
            search_title=Lower("name"),
            search_organization=Lower("organization__name"),
        )
        .order_by(
            "search_rank", "search_title", "search_organization", "organization_id", "id"
        )[:candidate_limit]
    )
    return count, [
        SearchResult(
            type="company",
            id=str(company.id),
            display_name=company.name,
            organization_id=str(company.organization_id),
            organization_name=company.organization.name,
            rank=company.search_rank,
            fields={
                "customer_code": company.customer_code,
                "lifecycle_stage": company.lifecycle_stage,
            },
        )
        for company in candidates
    ]


def _contact_results(*, organizations, query, candidate_limit):
    matches = (
        Contact.objects.filter(
            organization__in=organizations,
            archived_at__isnull=True,
            company__organization=F("organization"),
        )
        .annotate(display_name=Concat("first_name", Value(" "), "last_name"))
        .filter(
            Q(display_name__icontains=query)
            | Q(email__icontains=query)
            | Q(phone_number__icontains=query)
            | Q(department__icontains=query)
            | Q(job_title__icontains=query)
            | Q(company__name__icontains=query)
        )
    )
    count = matches.count()
    candidates = (
        matches.select_related("organization", "company")
        .annotate(
            search_rank=_search_rank(
                "display_name",
                query,
                identity_fields=("email", "phone_number"),
            ),
            search_title=Lower("display_name"),
            search_organization=Lower("organization__name"),
        )
        .order_by(
            "search_rank", "search_title", "search_organization", "organization_id", "id"
        )[:candidate_limit]
    )
    return count, [
        SearchResult(
            type="contact",
            id=str(contact.id),
            display_name=contact.display_name.strip(),
            organization_id=str(contact.organization_id),
            organization_name=contact.organization.name,
            rank=contact.search_rank,
            fields={
                "company": {
                    "id": str(contact.company_id),
                    "name": contact.company.name,
                },
                "job_title": contact.job_title,
            },
        )
        for contact in candidates
    ]


def _deal_results(*, organizations, query, candidate_limit):
    matches = Deal.objects.filter(
        organization__in=organizations,
        archived_at__isnull=True,
        company__organization=F("organization"),
    ).filter(Q(title__icontains=query) | Q(company__name__icontains=query))
    count = matches.count()
    candidates = (
        matches.select_related("organization", "company")
        .annotate(
            search_rank=_search_rank("title", query),
            search_title=Lower("title"),
            search_organization=Lower("organization__name"),
        )
        .order_by(
            "search_rank", "search_title", "search_organization", "organization_id", "id"
        )[:candidate_limit]
    )
    return count, [
        SearchResult(
            type="deal",
            id=str(deal.id),
            display_name=deal.title,
            organization_id=str(deal.organization_id),
            organization_name=deal.organization.name,
            rank=deal.search_rank,
            fields={
                "company": {
                    "id": str(deal.company_id),
                    "name": deal.company.name,
                },
                "stage": deal.stage,
                "value": str(Decimal(deal.value).quantize(Decimal("0.01"))),
                "currency": deal.currency,
            },
        )
        for deal in candidates
    ]


_SEARCHERS = {
    "company": _company_results,
    "contact": _contact_results,
    "deal": _deal_results,
}


def search_crm(*, organizations, query, result_types, page, page_size):
    page_start = (page - 1) * page_size
    page_end = page_start + page_size
    counts = {}
    results = []

    for result_type in result_types:
        count, candidates = _SEARCHERS[result_type](
            organizations=organizations,
            query=query,
            candidate_limit=page_end,
        )
        counts[result_type] = count
        results.extend(candidates)

    results.sort(
        key=lambda result: (
            result.rank,
            _TYPE_ORDER[result.type],
            result.display_name.casefold(),
            result.organization_name.casefold(),
            result.organization_id,
            result.id,
        )
    )

    return {
        "count": sum(counts.values()),
        "results": [
            {
                "type": result.type,
                "id": result.id,
                "display_name": result.display_name,
                "organization": {
                    "id": result.organization_id,
                    "name": result.organization_name,
                },
                **result.fields,
            }
            for result in results[page_start:page_end]
        ],
    }
