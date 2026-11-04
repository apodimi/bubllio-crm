"""Allowlisted persistent business models for the v1 transfer contract."""

from activities.models import Task
from companies.models import Company, CompanyActivity, CompanyTimelineEvent, CustomerCodeCounter
from contacts.models import Contact, ContactActivity
from costing.models import CollaboratorService, DealCostLine, ExternalCollaborator
from deals.models import Deal
from organizations.models import Organization, OrganizationMembership, OrganizationSettings
from subscriptions.models import Charge, CustomerSubscription, Payment, ServiceCatalogItem


BUSINESS_DATASETS = (
    ("organizations", Organization),
    ("organization_settings", OrganizationSettings),
    ("memberships", OrganizationMembership),
    ("customer_code_counters", CustomerCodeCounter),
    ("companies", Company),
    ("contacts", Contact),
    ("deals", Deal),
    ("tasks", Task),
    ("external_collaborators", ExternalCollaborator),
    ("collaborator_services", CollaboratorService),
    ("deal_cost_lines", DealCostLine),
    ("service_catalog_items", ServiceCatalogItem),
    ("customer_subscriptions", CustomerSubscription),
    ("charges", Charge),
    ("payments", Payment),
    ("company_activities", CompanyActivity),
    ("contact_activities", ContactActivity),
    ("company_timeline_events", CompanyTimelineEvent),
)
