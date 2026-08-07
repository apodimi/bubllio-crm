# Bubllio CRM API and Postman Guide

This document explains how to test the Bubllio CRM API with Postman.

It is intentionally detailed so we can come back later and remember:

- which endpoint does what
- which HTTP method to use
- what JSON body to send
- what response to expect
- how Postman variables work
- how the endpoint maps back to Django files

## Files

Postman files live here:

```text
docs/postman/
  bubllio-crm.postman_collection.json
  bubllio-crm.local.postman_environment.json
```

Use them like this:

1. Open Postman.
2. Click `Import`.
3. Import `docs/postman/bubllio-crm.postman_collection.json`.
4. Import `docs/postman/bubllio-crm.local.postman_environment.json`.
5. Select the environment named `Bubllio CRM Local`.

## Local Server

Before sending requests, run the Django development server:

```bash
uv run python src/manage.py runserver
```

The local API base URL is:

```text
http://127.0.0.1:8000
```

The API version prefix is:

```text
/api/v1/
```

So the full API prefix is:

```text
http://127.0.0.1:8000/api/v1/
```

## Postman Environment Variables

The local Postman environment defines:

```text
base_url       = http://127.0.0.1:8000
api_version    = v1
organization_id = empty initially
company_id     = empty initially
company_search = acme
contact_id     = empty initially
contact_search = maria
automation_id  = empty initially
```

The collection uses those variables like this:

```text
{{base_url}}/api/{{api_version}}/organizations/
```

At runtime Postman turns that into:

```text
http://127.0.0.1:8000/api/v1/organizations/
```

## Recommended Testing Order

Run requests in this order:

```text
1. Organizations / List Organizations
2. Organizations / Create Organization
3. Organizations / List Organizations
4. Companies / List Companies
5. Companies / Create Company
6. Companies / List Companies
7. Companies / Search Companies
8. Contacts / List Contacts
9. Contacts / Create Contact
10. Contacts / List Contacts
11. Contacts / Search Contacts
12. Automations / Create Company Created Email Automation
13. Automations / Test Automation
14. Automations / List Automations
15. Companies / Create Company
16. Automations / List Automation Runs
17. Organizations / Delete Organization
```

Why this order:

- You first verify the list endpoint works.
- You create an organization.
- Postman saves the created organization id into `organization_id`.
- You create a company that belongs to that organization.
- You search companies using the `search` query parameter.
- You create a contact that belongs to that company.
- You search contacts using the `search` query parameter.
- You create an automation for the `company.created` trigger.
- You create another company to trigger the automation.
- You inspect automation run history.
- You can delete the organization afterwards if you want to clean up.

## Current API Endpoints

### Organizations

```text
GET    /api/v1/organizations/
POST   /api/v1/organizations/
DELETE /api/v1/organizations/<organization_id>/
```

### Companies

```text
GET  /api/v1/companies/
GET  /api/v1/companies/?search=<term>
POST /api/v1/companies/
```

### Contacts

```text
GET  /api/v1/contacts/
GET  /api/v1/contacts/?search=<term>
POST /api/v1/contacts/
```

### Automations

```text
GET  /api/v1/automations/
POST /api/v1/automations/
GET  /api/v1/automations/runs/
```

## How The URLs Map To Django

Global API prefix:

```text
src/bubllio_crm/urls.py
```

```python
path("api/v1/", include([
    path("organizations/", include("organizations.urls")),
    path("companies/", include("companies.urls")),
    path("contacts/", include("contacts.urls")),
    path("automations/", include("automations.urls")),
]))
```

Organization app routes:

```text
src/organizations/urls.py
```

```python
urlpatterns = [
    path("", OrganizationListCreateAPIView.as_view(), name="organization-list"),
    path("<uuid:organization_id>/", OrganizationDetailAPIView.as_view(), name="organization-detail"),
]
```

Company app routes:

```text
src/companies/urls.py
```

```python
urlpatterns = [
    path("", CompanyListCreateAPIView.as_view(), name="company-list"),
]
```

Contact app routes:

```text
src/contacts/urls.py
```

```python
urlpatterns = [
    path("", ContactListCreateAPIView.as_view(), name="contact-list"),
]
```

Automation app routes:

```text
src/automations/urls.py
```

```python
urlpatterns = [
    path("", AutomationListCreateAPIView.as_view(), name="automation-list"),
    path("runs/", AutomationRunListAPIView.as_view(), name="automation-run-list"),
]
```

## Organizations API

### List Organizations

Method:

```text
GET
```

URL:

```text
{{base_url}}/api/{{api_version}}/organizations/
```

Full local URL:

```text
http://127.0.0.1:8000/api/v1/organizations/
```

Request body:

```text
No body
```

Expected success status:

```text
200 OK
```

Expected response when empty:

```json
[]
```

Expected response with data:

```json
[
  {
    "id": "d4fb03ab-82e0-414a-91b3-820f1cccb3f9",
    "name": "Nerds Lab",
    "slug": "nerds-lab",
    "created_at": "2026-07-29T12:00:00Z",
    "updated_at": "2026-07-29T12:00:00Z"
  }
]
```

Django files involved:

```text
src/bubllio_crm/urls.py
src/organizations/urls.py
src/organizations/views.py
src/organizations/serializers.py
src/organizations/models.py
```

View method:

```python
OrganizationListCreateAPIView.get
```

### Create Organization

Method:

```text
POST
```

URL:

```text
{{base_url}}/api/{{api_version}}/organizations/
```

Headers:

```text
Content-Type: application/json
```

Request body:

```json
{
  "name": "Nerds Lab",
  "slug": "nerds-lab"
}
```

Expected success status:

```text
201 Created
```

Expected response:

```json
{
  "id": "d4fb03ab-82e0-414a-91b3-820f1cccb3f9",
  "name": "Nerds Lab",
  "slug": "nerds-lab",
  "created_at": "2026-07-29T12:00:00Z",
  "updated_at": "2026-07-29T12:00:00Z"
}
```

Postman behavior:

- The collection test script reads `id` from the response.
- It saves it into the environment variable `organization_id`.
- Later requests can use `{{organization_id}}`.

Django files involved:

```text
src/organizations/views.py
src/organizations/serializers.py
src/organizations/models.py
```

View method:

```python
OrganizationListCreateAPIView.post
```

Common validation error:

```json
{
  "slug": [
    "organization with this slug already exists."
  ]
}
```

This happens because `Organization.slug` is unique.

### Delete Organization

Method:

```text
DELETE
```

URL:

```text
{{base_url}}/api/{{api_version}}/organizations/{{organization_id}}/
```

Full local URL example:

```text
http://127.0.0.1:8000/api/v1/organizations/d4fb03ab-82e0-414a-91b3-820f1cccb3f9/
```

Request body:

```text
No body
```

Expected success status:

```text
204 No Content
```

Expected response body:

```text
Empty
```

Expected not found status:

```text
404 Not Found
```

Django files involved:

```text
src/organizations/urls.py
src/organizations/views.py
src/organizations/models.py
```

View method:

```python
OrganizationDetailAPIView.delete
```

## Companies API

### List Companies

Method:

```text
GET
```

URL:

```text
{{base_url}}/api/{{api_version}}/companies/
```

Full local URL:

```text
http://127.0.0.1:8000/api/v1/companies/
```

Request body:

```text
No body
```

Expected success status:

```text
200 OK
```

Expected response when empty:

```json
[]
```

Expected response with data:

```json
[
  {
    "id": "af4bd559-156f-44e1-aa55-6f7d12f68a98",
    "name": "Acme Inc",
    "email": "hello@acme.test",
    "phone_number": "+306900000000",
    "website": "https://acme.test",
    "lifecycle_stage": "lead",
    "organization": "d4fb03ab-82e0-414a-91b3-820f1cccb3f9",
    "created_at": "2026-07-29T12:00:00Z",
    "updated_at": "2026-07-29T12:00:00Z"
  }
]
```

Django files involved:

```text
src/bubllio_crm/urls.py
src/companies/urls.py
src/companies/views.py
src/companies/serializers.py
src/companies/models.py
```

View method:

```python
CompanyListCreateAPIView.get
```

### Search Companies

Method:

```text
GET
```

URL:

```text
{{base_url}}/api/{{api_version}}/companies/?search={{company_search}}
```

Full local URL example:

```text
http://127.0.0.1:8000/api/v1/companies/?search=acme
```

Request body:

```text
No body
```

Expected success status:

```text
200 OK
```

Expected response:

```json
[
  {
    "id": "af4bd559-156f-44e1-aa55-6f7d12f68a98",
    "name": "Acme Inc",
    "email": "hello@acme.test",
    "phone_number": "+306900000000",
    "website": "https://acme.test",
    "lifecycle_stage": "lead",
    "organization": "d4fb03ab-82e0-414a-91b3-820f1cccb3f9",
    "created_at": "2026-07-29T12:00:00Z",
    "updated_at": "2026-07-29T12:00:00Z"
  }
]
```

Recommended Django implementation:

```python
from django.db.models import Q


def get(self, request):
    companies = Company.objects.all()
    search = request.query_params.get("search")

    if search:
        companies = companies.filter(
            Q(name__icontains=search)
            | Q(email__icontains=search)
            | Q(phone_number__icontains=search)
            | Q(website__icontains=search)
        )

    serializer = CompanySerializer(companies, many=True)
    return Response(serializer.data)
```

Important details:

- Filter the queryset before creating the serializer.
- Use `Q(...) | Q(...)` for OR search.
- Without `Q`, multiple filters in the same `.filter(...)` call behave like AND.

Django files involved:

```text
src/companies/views.py
src/companies/serializers.py
src/companies/models.py
```

View method:

```python
CompanyListCreateAPIView.get
```

### Create Company

Method:

```text
POST
```

URL:

```text
{{base_url}}/api/{{api_version}}/companies/
```

Headers:

```text
Content-Type: application/json
```

Request body:

```json
{
  "name": "Acme Inc",
  "email": "hello@acme.test",
  "phone_number": "+306900000000",
  "website": "https://acme.test",
  "lifecycle_stage": "lead",
  "organization": "{{organization_id}}"
}
```

Expected success status:

```text
201 Created
```

Expected response:

```json
{
  "id": "af4bd559-156f-44e1-aa55-6f7d12f68a98",
  "name": "Acme Inc",
  "email": "hello@acme.test",
  "phone_number": "+306900000000",
  "website": "https://acme.test",
  "lifecycle_stage": "lead",
  "organization": "d4fb03ab-82e0-414a-91b3-820f1cccb3f9",
  "created_at": "2026-07-29T12:00:00Z",
  "updated_at": "2026-07-29T12:00:00Z"
}
```

Postman behavior:

- The collection test script reads `id` from the response.
- It saves it into the environment variable `company_id`.

Django files involved:

```text
src/companies/views.py
src/companies/serializers.py
src/companies/models.py
```

View method:

```python
CompanyListCreateAPIView.post
```

Common validation errors:

```json
{
  "organization": [
    "Invalid pk \"...\" - object does not exist."
  ]
}
```

This means the organization UUID does not exist in the database.

## Contacts API

### List Contacts

Method:

```text
GET
```

URL:

```text
{{base_url}}/api/{{api_version}}/contacts/
```

Full local URL:

```text
http://127.0.0.1:8000/api/v1/contacts/
```

Request body:

```text
No body
```

Expected success status:

```text
200 OK
```

Expected response when empty:

```json
[]
```

Expected response with data:

```json
[
  {
    "id": "5fdac9f8-02cd-4d5a-9250-bb46b45ccbc2",
    "organization": "d4fb03ab-82e0-414a-91b3-820f1cccb3f9",
    "company": "af4bd559-156f-44e1-aa55-6f7d12f68a98",
    "first_name": "Maria",
    "last_name": "Papadopoulou",
    "email": "maria@acme.test",
    "phone_number": "+306911111111",
    "department": "Accounting",
    "job_title": "Accounting Manager",
    "created_at": "2026-07-29T12:00:00Z",
    "updated_at": "2026-07-29T12:00:00Z"
  }
]
```

Django files involved:

```text
src/bubllio_crm/urls.py
src/contacts/urls.py
src/contacts/views.py
src/contacts/serializers.py
src/contacts/models.py
```

View method:

```python
ContactListCreateAPIView.get
```

### Search Contacts

Method:

```text
GET
```

URL:

```text
{{base_url}}/api/{{api_version}}/contacts/?search={{contact_search}}
```

Full local URL example:

```text
http://127.0.0.1:8000/api/v1/contacts/?search=maria
```

Request body:

```text
No body
```

Expected success status:

```text
200 OK
```

Recommended Django implementation:

```python
from django.db.models import Q


def get(self, request):
    contacts = Contact.objects.all()
    search = request.query_params.get("search")

    if search:
        contacts = contacts.filter(
            Q(first_name__icontains=search)
            | Q(last_name__icontains=search)
            | Q(email__icontains=search)
            | Q(phone_number__icontains=search)
            | Q(department__icontains=search)
            | Q(job_title__icontains=search)
        )

    serializer = ContactSerializer(contacts, many=True)
    return Response(serializer.data)
```

Important details:

- Filter the queryset before creating the serializer.
- Use `Q(...) | Q(...)` for OR search across multiple fields.

### Create Contact

Method:

```text
POST
```

URL:

```text
{{base_url}}/api/{{api_version}}/contacts/
```

Headers:

```text
Content-Type: application/json
```

Request body:

```json
{
  "organization": "{{organization_id}}",
  "company": "{{company_id}}",
  "first_name": "Maria",
  "last_name": "Papadopoulou",
  "email": "maria@acme.test",
  "phone_number": "+306911111111",
  "department": "Accounting",
  "job_title": "Accounting Manager"
}
```

Expected success status:

```text
201 Created
```

Expected response:

```json
{
  "id": "5fdac9f8-02cd-4d5a-9250-bb46b45ccbc2",
  "organization": "d4fb03ab-82e0-414a-91b3-820f1cccb3f9",
  "company": "af4bd559-156f-44e1-aa55-6f7d12f68a98",
  "first_name": "Maria",
  "last_name": "Papadopoulou",
  "email": "maria@acme.test",
  "phone_number": "+306911111111",
  "department": "Accounting",
  "job_title": "Accounting Manager",
  "created_at": "2026-07-29T12:00:00Z",
  "updated_at": "2026-07-29T12:00:00Z"
}
```

Validation rule:

```text
The selected company must belong to the selected organization.
```

This prevents creating a contact under an organization while pointing it to a company from another organization.

## Automations API

Automations follow this idea:

```text
when an event happens,
run an action.
```

Current implemented event:

```text
company.created
```

Current implemented action:

```text
send_email
```

For local development, emails use Django's console email backend. That means emails are printed in the terminal where `runserver` is running instead of being sent to a real inbox.

### List Automations

Method:

```text
GET
```

URL:

```text
{{base_url}}/api/{{api_version}}/automations/
```

Full local URL:

```text
http://127.0.0.1:8000/api/v1/automations/
```

Expected success status:

```text
200 OK
```

### Create Company Created Email Automation

Method:

```text
POST
```

URL:

```text
{{base_url}}/api/{{api_version}}/automations/
```

Headers:

```text
Content-Type: application/json
```

Request body:

```json
{
  "organization": "{{organization_id}}",
  "name": "Notify accounting when a company is created",
  "trigger": "company.created",
  "action_type": "send_email",
  "action_config": {
    "to": ["accounting@example.com"],
    "subject": "New company created",
    "body": "A new company was added to Bubllio CRM."
  },
  "is_active": true
}
```

Expected success status:

```text
201 Created
```

What happens next:

1. Create this automation.
2. Create a company with `POST /api/v1/companies/`.
3. The company create endpoint dispatches the `company.created` event.
4. Matching active automations run.
5. The email is printed in the Django runserver terminal.
6. A row is created in `AutomationRun`.

### List Automation Runs

Method:

```text
GET
```

URL:

```text
{{base_url}}/api/{{api_version}}/automations/runs/
```

Full local URL:

```text
http://127.0.0.1:8000/api/v1/automations/runs/
```

Expected success status:

```text
200 OK
```

Expected response:

```json
[
  {
    "id": "9bdc70cf-0757-4ef3-8072-eafaa711d03b",
    "automation": "f5ed0a9a-ec0d-4057-a4df-a1850d741404",
    "trigger": "company.created",
    "status": "success",
    "payload": {
      "company_id": "af4bd559-156f-44e1-aa55-6f7d12f68a98",
      "company_name": "Acme Inc",
      "lifecycle_stage": "lead"
    },
    "error_message": "",
    "created_at": "2026-08-04T12:00:00Z"
  }
]
```

### Test Automation

Method:

```text
POST
```

URL:

```text
{{base_url}}/api/{{api_version}}/automations/{{automation_id}}/test/
```

Request body:

```json
{
  "payload": {
    "test": true,
    "source": "postman"
  }
}
```

Expected success status:

```text
201 Created
```

Expected response:

```json
{
  "status": "success",
  "run": {
    "id": "9bdc70cf-0757-4ef3-8072-eafaa711d03b",
    "automation": "f5ed0a9a-ec0d-4057-a4df-a1850d741404",
    "trigger": "company.created",
    "status": "success",
    "payload": {
      "test": true,
      "source": "postman"
    },
    "error_message": "",
    "created_at": "2026-08-04T12:00:00Z"
  },
  "dev_note": "In local development, send_email uses Django's console email backend, so the email is printed in the runserver terminal."
}
```

Why this endpoint exists:

- It improves DX.
- It verifies the action configuration without creating a new company.
- It returns the run immediately.
- It makes local console email behavior explicit.

## Manual Curl Examples

List organizations:

```bash
curl http://127.0.0.1:8000/api/v1/organizations/
```

Create organization:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/organizations/ \
  -H "Content-Type: application/json" \
  -d '{"name": "Nerds Lab", "slug": "nerds-lab"}'
```

Delete organization:

```bash
curl -X DELETE http://127.0.0.1:8000/api/v1/organizations/<organization_id>/
```

List companies:

```bash
curl http://127.0.0.1:8000/api/v1/companies/
```

Search companies:

```bash
curl "http://127.0.0.1:8000/api/v1/companies/?search=acme"
```

Create company:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/companies/ \
  -H "Content-Type: application/json" \
  -d '{"name": "Acme Inc", "email": "hello@acme.test", "phone_number": "+306900000000", "website": "https://acme.test", "lifecycle_stage": "lead", "organization": "<organization_id>"}'
```

List contacts:

```bash
curl http://127.0.0.1:8000/api/v1/contacts/
```

Search contacts:

```bash
curl "http://127.0.0.1:8000/api/v1/contacts/?search=maria"
```

Create contact:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/contacts/ \
  -H "Content-Type: application/json" \
  -d '{"organization": "<organization_id>", "company": "<company_id>", "first_name": "Maria", "last_name": "Papadopoulou", "email": "maria@acme.test", "phone_number": "+306911111111", "department": "Accounting", "job_title": "Accounting Manager"}'
```

Create company-created email automation:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/automations/ \
  -H "Content-Type: application/json" \
  -d '{"organization": "<organization_id>", "name": "Notify accounting when a company is created", "trigger": "company.created", "action_type": "send_email", "action_config": {"to": ["accounting@example.com"], "subject": "New company created", "body": "A new company was added to Bubllio CRM."}, "is_active": true}'
```

List automation runs:

```bash
curl http://127.0.0.1:8000/api/v1/automations/runs/
```

## Debugging Checklist

If Postman cannot connect:

1. Make sure the server is running:

```bash
uv run python src/manage.py runserver
```

2. Make sure the Postman environment is selected:

```text
Bubllio CRM Local
```

3. Make sure `base_url` is:

```text
http://127.0.0.1:8000
```

4. Make sure migrations have been applied:

```bash
uv run python src/manage.py migrate
```

5. Make sure the project passes checks:

```bash
uv run python src/manage.py check
```

If a company cannot be created:

- Create an organization first.
- Confirm `organization_id` is set in Postman.
- Confirm the organization still exists.

If a contact cannot be created:

- Create an organization first.
- Create a company first.
- Confirm `organization_id` and `company_id` are set in Postman.
- Confirm the company belongs to the selected organization.

If an organization cannot be created:

- Use a unique `slug`.
- Example: `nerds-lab-2` instead of `nerds-lab`.

## Naming Notes

Current class names:

```python
OrganizationListCreateAPIView
OrganizationDetailAPIView
CompanyListCreateAPIView
ContactListCreateAPIView
```

Recommended naming convention:

```python
OrganizationListCreateAPIView
OrganizationDetailAPIView
CompanyListCreateAPIView
CompanyDetailAPIView
ContactListCreateAPIView
ContactDetailAPIView
```

`Detail` is usually singular because the endpoint represents one resource.

`Detail` is usually singular because the endpoint represents one resource.
