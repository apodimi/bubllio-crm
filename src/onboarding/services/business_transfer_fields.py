"""Frozen field-level contract for CRM business transfer format v1."""

BUSINESS_FIELDS = {
    "organizations": (
        "id name slug is_personal personal_owner_id created_at updated_at"
    ).split(),
    "organization_settings": (
        "id organization_id timezone locale default_from_name legal_name trading_name tax_id "
        "tax_office registration_number business_email phone website address_line_1 "
        "address_line_2 city postal_code country currency fiscal_year_start_month "
        "default_tax_rate default_payment_terms_days document_prefix next_document_number "
        "created_at updated_at"
    ).split(),
    "memberships": "id organization_id user_id role created_at updated_at".split(),
    "customer_code_counters": "id organization_id last_number".split(),
    "companies": (
        "id organization_id customer_code assigned_to_id name tax_id industry email "
        "phone_number website address_line_1 address_line_2 city postal_code country "
        "notes lifecycle_stage created_at updated_at archived_at"
    ).split(),
    "contacts": (
        "id organization_id company_id assigned_to_id first_name last_name email "
        "phone_number department job_title status is_primary created_at updated_at archived_at"
    ).split(),
    "deals": (
        "id organization_id company_id contact_id assigned_to_id title value currency "
        "tax_rate amount_includes_tax probability stage sort_order expected_close_date "
        "lost_reason notes archived_at created_at updated_at"
    ).split(),
    "tasks": (
        "id organization_id company_id contact_id deal_id assigned_to_id created_by_id "
        "completed_by_id title kind priority workflow_status due_at reminder_at notes "
        "completed_at created_at updated_at"
    ).split(),
    "external_collaborators": (
        "id organization_id name specialty email phone_number notes is_active "
        "created_at updated_at"
    ).split(),
    "collaborator_services": (
        "id organization_id collaborator_id name description default_cost currency "
        "is_active created_at updated_at"
    ).split(),
    "deal_cost_lines": (
        "id organization_id deal_id collaborator_id collaborator_service_id collaborator_name "
        "service_name description quantity unit_cost currency status created_at updated_at"
    ).split(),
    "service_catalog_items": (
        "id organization_id name description internal_code default_net_price currency "
        "default_tax_rate billing_interval is_active created_at updated_at"
    ).split(),
    "customer_subscriptions": (
        "id organization_id company_id catalog_item_id originating_deal_id assigned_to_id "
        "name net_price currency tax_rate billing_interval start_date next_billing_date "
        "renewal_date end_date cancellation_effective_date cancelled_at auto_renew status "
        "operational_reference notes created_at updated_at"
    ).split(),
    "charges": (
        "id organization_id subscription_id coverage_start coverage_end due_date net_amount "
        "tax_rate tax_amount gross_amount currency state created_at updated_at"
    ).split(),
    "payments": (
        "id organization_id charge_id amount paid_date payment_method external_reference "
        "note recorded_by_id created_at"
    ).split(),
    "company_activities": (
        "id organization_id company_id actor_id action details created_at"
    ).split(),
    "contact_activities": (
        "id organization_id contact_id actor_id action details created_at"
    ).split(),
    "company_timeline_events": (
        "id organization_id company_id actor_id category event_type source_type source_id "
        "body details occurred_at"
    ).split(),
}
