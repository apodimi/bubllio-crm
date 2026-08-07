class AutomationTrigger:
    ORGANIZATION_CREATED = "organization.created"
    ORGANIZATION_UPDATED = "organization.updated"
    COMPANY_CREATED = "company.created"
    COMPANY_UPDATED = "company.updated"
    COMPANY_LIFECYCLE_STAGE_CHANGED = "company.lifecycle_stage_changed"
    CONTACT_CREATED = "contact.created"
    CONTACT_UPDATED = "contact.updated"

    CHOICES = [
        (ORGANIZATION_CREATED, "Organization created"),
        (ORGANIZATION_UPDATED, "Organization updated"),
        (COMPANY_CREATED, "Company created"),
        (COMPANY_UPDATED, "Company updated"),
        (COMPANY_LIFECYCLE_STAGE_CHANGED, "Company lifecycle stage changed"),
        (CONTACT_CREATED, "Contact created"),
        (CONTACT_UPDATED, "Contact updated"),
    ]
