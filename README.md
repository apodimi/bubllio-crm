# Bubllio CRM

Open-source CRM built with Django and Django REST Framework.

This README is also our learning guide. The goal is to remember:

- what we are building
- which file each change belongs in
- which command to run
- why each step exists

## Current Stack

- Python 3.13
- Django
- Django REST Framework
- uv for dependency and virtualenv management
- SQLite for local development

## Environment Variables

Production secrets must not be committed to git.

The Django secret key is read from:

```text
DJANGO_SECRET_KEY
```

For local development, the project uses a non-production fallback:

```python
SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY",
    "django-insecure-local-development-key",
)
```

In production, always set:

```bash
export DJANGO_SECRET_KEY="your-real-secret-key"
```

## Project Structure

```text
bubllio-crm/
  .gitignore
  .python-version
  README.md
  pyproject.toml
  uv.lock
  src/
    manage.py
    bubllio_crm/
      __init__.py
      settings.py
      urls.py
      asgi.py
      wsgi.py
    organizations/
      __init__.py
      admin.py
      apps.py
      migrations/
      models.py
      serializers.py
      urls.py
      views.py
```

## What Each Important File Does

### `pyproject.toml`

Defines the Python project.

It contains:

- project name
- Python version requirement
- dependencies
- build backend

Example:

```toml
dependencies = [
    "django>=6.0.7",
    "djangorestframework>=3.17.1",
]
```

When we need a new package, we use:

```bash
uv add package-name
```

### `uv.lock`

Locks the exact dependency versions.

`pyproject.toml` says what we want. `uv.lock` says exactly what was installed.

We commit `uv.lock` to git.

### `.python-version`

Defines the Python version for this project.

### `.gitignore`

Tells git what not to track.

Important ignored files:

```text
.venv/
__pycache__/
*.pyc
src/db.sqlite3
.env
```

### `src/manage.py`

The Django command-line entrypoint.

We use it for:

```bash
uv run python src/manage.py check
uv run python src/manage.py runserver
uv run python src/manage.py migrate
uv run python src/manage.py makemigrations
uv run python src/manage.py createsuperuser
```

### `src/bubllio_crm/settings.py`

Project settings.

This file controls:

- installed apps
- database
- middleware
- timezone
- static files
- Django REST Framework activation

When we create a new app, we add it to:

```python
INSTALLED_APPS = [
    ...
    "rest_framework",
    "organizations",
]
```

### `src/bubllio_crm/urls.py`

Global project URLs.

This is where we define top-level routes such as:

```python
urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include([
        path("organizations/", include("organizations.urls")),
    ])),
]
```

The global API prefix is:

```text
/api/v1/
```

Each app adds its own paths under that prefix.

### `src/bubllio_crm/asgi.py` and `src/bubllio_crm/wsgi.py`

Server entrypoints.

At this stage we usually do not edit them.

## Django App Structure

Each business domain should usually be a separate Django app.

For CRM examples:

```text
organizations/
contacts/
companies/
deals/
activities/
```

An app usually has:

```text
models.py       -> database models
serializers.py  -> model <-> JSON conversion
views.py        -> API behavior
urls.py         -> app routes
admin.py        -> Django admin registration
migrations/     -> database schema changes
```

## How To Create A New Django App

Run from the project root:

```bash
cd src
uv run python manage.py startapp app_name
cd ..
```

Example:

```bash
cd src
uv run python manage.py startapp organizations
cd ..
```

Then register the app in:

```text
src/bubllio_crm/settings.py
```

Example:

```python
INSTALLED_APPS = [
    ...
    "rest_framework",
    "organizations",
]
```

## Model Flow

Django does not change the database immediately when we edit a model.

The flow is:

```text
models.py
  -> makemigrations
  -> migration file
  -> migrate
  -> database table
```

### 1. Write The Model

File:

```text
src/organizations/models.py
```

Example:

```python
import uuid

from django.db import models


class Organization(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
```

Why:

- `id` is a UUID, so the public API does not expose integer IDs like `1`, `2`, `3`.
- `name` is the visible organization name.
- `slug` is a URL-friendly unique identifier.
- `created_at` is set once when the row is created.
- `updated_at` changes every time the row is saved.
- `__str__` controls how the object appears in Django admin and shell.

### 2. Create Migration

```bash
uv run python src/manage.py makemigrations organizations
```

This creates a file like:

```text
src/organizations/migrations/0001_initial.py
```

Important: `makemigrations` does not change the database. It creates a migration file.

### 3. Apply Migration

```bash
uv run python src/manage.py migrate
```

This changes the database.

For `Organization`, it creates a table like:

```text
organizations_organization
```

### 4. Check Migration Status

```bash
uv run python src/manage.py showmigrations
```

Checked migrations look like:

```text
[X] 0001_initial
```

Unchecked migrations look like:

```text
[ ] 0001_initial
```

## Important Migration Notes

Migration files are source code. Commit them to git.

The local SQLite database is not source code. Do not commit it:

```text
src/db.sqlite3
```

If you change a model, run:

```bash
uv run python src/manage.py makemigrations
uv run python src/manage.py migrate
```

Changing primary key type is sensitive. Example:

```text
integer id -> UUID id
```

If rows already exist, this can break local data unless handled carefully.

For local learning data, it is sometimes okay to reset the local database. For production data, never delete the database; write a careful migration plan.

## Admin Flow

Django admin is useful for internal data inspection and manual editing.

### 1. Register The Model

File:

```text
src/organizations/admin.py
```

Example:

```python
from django.contrib import admin

from .models import Organization


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "slug", "created_at", "updated_at")
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}
```

Why:

- `@admin.register(Organization)` makes the model visible in admin.
- `list_display` controls columns in the list page.
- `search_fields` enables search.
- `prepopulated_fields` fills `slug` automatically from `name`.

### 2. Create Admin User

```bash
uv run python src/manage.py createsuperuser
```

### 3. Run Server

```bash
uv run python src/manage.py runserver
```

Open:

```text
http://127.0.0.1:8000/admin/
```

## REST API Flow

The API flow is:

```text
URL
  -> View
  -> Serializer
  -> Model
  -> Database
```

And on the way back:

```text
Database
  -> Model
  -> Serializer
  -> JSON Response
```

## Serializer

Serializers convert between Django models and JSON.

File:

```text
src/organizations/serializers.py
```

Example:

```python
from rest_framework import serializers

from .models import Organization


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ["id", "name", "slug", "created_at", "updated_at"]
```

Why:

- `ModelSerializer` reads field definitions from the model.
- `fields` controls what the API exposes.
- The serializer validates input for `POST`, `PATCH`, etc.

## Views

Views define API behavior.

File:

```text
src/organizations/views.py
```

Example list/create view:

```python
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Organization
from .serializers import OrganizationSerializer


class OrganizationListCreateAPIView(APIView):
    def get(self, request):
        organizations = Organization.objects.all()
        serializer = OrganizationSerializer(organizations, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = OrganizationSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)

        return Response(serializer.errors, status=400)
```

Why:

- `get` handles `GET /api/v1/organizations/`.
- `post` handles `POST /api/v1/organizations/`.
- `Organization.objects.all()` reads rows from the database.
- `many=True` means the serializer receives many objects, not one.
- `serializer.is_valid()` validates request data.
- `serializer.save()` creates the database row.
- `Response(...)` returns JSON.

## App URLs

App URLs connect app routes to views.

File:

```text
src/organizations/urls.py
```

Example:

```python
from django.urls import path

from .views import OrganizationListCreateAPIView

urlpatterns = [
    path("", OrganizationListCreateAPIView.as_view(), name="organization-list"),
]
```

Why:

- `""` means the root of the app route.
- The global project URL decides the prefix.
- `.as_view()` turns the class into a Django-compatible view.

## Project URLs

Project URLs connect global API prefixes to app URLs.

File:

```text
src/bubllio_crm/urls.py
```

Example:

```python
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include([
        path("organizations/", include("organizations.urls")),
    ])),
]
```

This creates:

```text
/api/v1/organizations/
```

The logic:

```text
project: api/v1/
app mount: organizations/
app url: ""
final: /api/v1/organizations/
```

## REST Class Splitting Logic

Split view classes by resource and responsibility.

Collection endpoint:

```text
GET  /api/v1/organizations/
POST /api/v1/organizations/
DELETE /api/v1/organizations/<id>/
GET  /api/v1/companies/
GET  /api/v1/companies/?search=<term>
POST /api/v1/companies/
GET  /api/v1/contacts/
GET  /api/v1/contacts/?search=<term>
POST /api/v1/contacts/
GET  /api/v1/automations/
POST /api/v1/automations/
GET  /api/v1/automations/runs/
POST /api/v1/automations/<id>/test/
```

Use one class:

```python
class OrganizationListCreateAPIView(APIView):
    ...
```

Detail endpoint:

```text
GET    /api/v1/organizations/<id>/
PATCH  /api/v1/organizations/<id>/
DELETE /api/v1/organizations/<id>/
```

Use another class:

```python
class OrganizationDetailAPIView(APIView):
    ...
```

Custom action endpoint:

```text
POST /api/v1/organizations/<id>/archive/
```

Use another class:

```python
class OrganizationArchiveAPIView(APIView):
    ...
```

Rule of thumb:

```text
same path + same resource level -> same class, different methods
different path or custom action -> different class
```

## Testing The Current API

### 1. Run Checks

```bash
uv run python src/manage.py check
```

Expected:

```text
System check identified no issues (0 silenced).
```

### 2. Run Server

```bash
uv run python src/manage.py runserver
```

### 3. List Organizations

Open in browser:

```text
http://127.0.0.1:8000/api/v1/organizations/
```

Or use curl:

```bash
curl http://127.0.0.1:8000/api/v1/organizations/
```

If there are no organizations:

```json
[]
```

### 4. Create Organization

```bash
curl -X POST http://127.0.0.1:8000/api/v1/organizations/ \
  -H "Content-Type: application/json" \
  -d '{"name": "Nerds Lab", "slug": "nerds-lab"}'
```

Expected response:

```json
{
  "id": "uuid-value-here",
  "name": "Nerds Lab",
  "slug": "nerds-lab",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

## Common Commands

Install dependencies from lockfile:

```bash
uv sync
```

Add dependency:

```bash
uv add package-name
```

Run Django check:

```bash
uv run python src/manage.py check
```

Create migrations:

```bash
uv run python src/manage.py makemigrations
```

Create migrations for one app:

```bash
uv run python src/manage.py makemigrations organizations
```

Apply migrations:

```bash
uv run python src/manage.py migrate
```

Show migrations:

```bash
uv run python src/manage.py showmigrations
```

Run server:

```bash
uv run python src/manage.py runserver
```

Create superuser:

```bash
uv run python src/manage.py createsuperuser
```

## Automations

Automations are the first step toward user-defined CRM workflows.

The basic idea is:

```text
When something happens,
run an action.
```

Example:

```text
When a company is created,
send an email to accounting.
```

In code terms:

```text
event/trigger -> automation lookup -> action execution -> run log
```

## Automation Business Logic

The current business rule we support is:

```text
company.created -> send_email
```

That means:

1. A user creates a company through the API.
2. The company is saved in the database.
3. The system dispatches the `company.created` event.
4. The `automations` app looks for active automations in the same organization.
5. Matching automations run their configured action.
6. Every execution is stored as an `AutomationRun`.

This gives us two important things:

- behavior: the action actually runs
- observability: we can inspect what ran and whether it succeeded

## Automation App Structure

The app lives here:

```text
src/automations/
  __init__.py
  admin.py
  apps.py
  events.py
  migrations/
  models.py
  serializers.py
  services.py
  tests.py
  urls.py
  views.py
```

Each file has a specific role.

### `src/automations/events.py`

Defines event names.

Example:

```python
class AutomationTrigger:
    COMPANY_CREATED = "company.created"
    CONTACT_CREATED = "contact.created"
```

Why:

- We avoid random strings spread across the codebase.
- All supported triggers are documented in one place.
- Models, services, and views can reuse the same constants.

Current trigger names:

```text
organization.created
organization.updated
company.created
company.updated
company.lifecycle_stage_changed
contact.created
contact.updated
```

Important: not all triggers are wired yet.

Currently wired:

```text
company.created
```

### `src/automations/models.py`

Defines the database models for automations.

Current models:

```text
Automation
AutomationRun
```

### `Automation`

`Automation` is the rule configured by the user.

Important fields:

```text
organization
name
trigger
action_type
action_config
is_active
created_at
updated_at
```

Example:

```json
{
  "organization": "organization-uuid",
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

Field meanings:

- `organization`: the workspace that owns the automation.
- `name`: human-readable name.
- `trigger`: the event that starts the automation.
- `action_type`: what kind of action to run.
- `action_config`: JSON settings for the action.
- `is_active`: turns the automation on or off.

### `action_config`

`action_config` is a `JSONField`.

For `send_email`, it currently expects:

```json
{
  "to": ["accounting@example.com"],
  "subject": "New company created",
  "body": "A new company was added to Bubllio CRM."
}
```

Optional field:

```json
{
  "from_email": "noreply@example.com"
}
```

Why JSON:

- Different action types need different settings.
- Email needs `to`, `subject`, `body`.
- A future Slack action may need `webhook_url`, `channel`, `message`.
- A future task action may need `title`, `due_at`, `assignee`.

### `AutomationRun`

`AutomationRun` is the execution history.

Every time an automation runs, we create a run record.

Important fields:

```text
automation
trigger
status
payload
error_message
created_at
```

Statuses:

```text
success
failed
skipped
```

Why this matters:

- If an email fails, we need to know.
- If an automation runs, we need history.
- Later we can add retries.
- Later we can show run logs in the UI.

Example run payload:

```json
{
  "company_id": "company-uuid",
  "company_name": "Acme Inc",
  "lifecycle_stage": "lead"
}
```

## Automation Services

File:

```text
src/automations/services.py
```

This file contains business logic that should not live directly in views.

Main function:

```python
dispatch_automation_event(...)
```

Conceptually:

```python
dispatch_automation_event(
    organization=company.organization,
    trigger="company.created",
    payload={...},
)
```

What it does:

1. Finds active automations for the same organization.
2. Filters by the trigger.
3. Runs each matching automation.
4. Creates an `AutomationRun` for success, failure, or skipped action.

Why use a service:

- Views stay focused on HTTP request/response.
- Automation logic can be reused by any app.
- Later we can move execution to background jobs without changing every view.

## Where The First Event Is Dispatched

The first event is dispatched from:

```text
src/companies/views.py
```

Inside:

```python
CompanyListCreateAPIView.post
```

Flow:

```text
POST /api/v1/companies/
  -> validate company payload
  -> save Company
  -> dispatch company.created
  -> run matching automations
  -> return API response
```

Simplified code:

```python
company = serializer.save()
dispatch_automation_event(
    organization=company.organization,
    trigger=AutomationTrigger.COMPANY_CREATED,
    payload={
        "company_id": str(company.id),
        "company_name": company.name,
        "lifecycle_stage": company.lifecycle_stage,
    },
)
```

Important design decision:

```text
The event is dispatched after the company is saved.
```

Why:

- We need a real `company.id`.
- The automation should only run if the company was actually created.
- The payload can include saved database values.

## Local Email Behavior

In local development, emails are not sent to real inboxes.

We use:

```python
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
```

This is configured in:

```text
src/bubllio_crm/settings.py
```

What this means:

```text
Emails are printed in the terminal where runserver is running.
```

Why this is good for now:

- No SMTP setup needed.
- No real emails are sent by accident.
- We can verify email content while learning.

When an automation sends email, look at the terminal running:

```bash
uv run python src/manage.py runserver
```

## Automation API Endpoints

Current endpoints:

```text
GET  /api/v1/automations/
POST /api/v1/automations/
GET  /api/v1/automations/runs/
```

### List Automations

```bash
curl http://127.0.0.1:8000/api/v1/automations/
```

Returns all automations.

### Create Automation

```bash
curl -X POST http://127.0.0.1:8000/api/v1/automations/ \
  -H "Content-Type: application/json" \
  -d '{"organization": "<organization_id>", "name": "Notify accounting when a company is created", "trigger": "company.created", "action_type": "send_email", "action_config": {"to": ["accounting@example.com"], "subject": "New company created", "body": "A new company was added to Bubllio CRM."}, "is_active": true}'
```

Creates an automation.

Required fields:

```text
organization
name
trigger
action_type
action_config
```

For `send_email`, `action_config` must include:

```text
to
subject
body
```

### List Automation Runs

```bash
curl http://127.0.0.1:8000/api/v1/automations/runs/
```

Returns automation execution history.

### Test Automation

```bash
curl -X POST http://127.0.0.1:8000/api/v1/automations/<automation_id>/test/ \
  -H "Content-Type: application/json" \
  -d '{"payload": {"test": true, "source": "manual curl test"}}'
```

Runs one automation immediately without needing to create a company.

Why this endpoint exists:

- It improves DX.
- You can verify an automation is configured correctly.
- You get a direct API response with the `AutomationRun`.
- For local email, the response reminds you that the email is printed to the runserver terminal.

## How To Test Automations Manually

### 1. Run migrations

```bash
uv run python src/manage.py migrate
```

### 2. Run server

```bash
uv run python src/manage.py runserver
```

### 3. Create an organization

```bash
curl -X POST http://127.0.0.1:8000/api/v1/organizations/ \
  -H "Content-Type: application/json" \
  -d '{"name": "Nerds Lab", "slug": "nerds-lab"}'
```

Copy the returned `id`.

### 4. Create an automation

Use the organization id from the previous step:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/automations/ \
  -H "Content-Type: application/json" \
  -d '{"organization": "<organization_id>", "name": "Notify accounting when a company is created", "trigger": "company.created", "action_type": "send_email", "action_config": {"to": ["accounting@example.com"], "subject": "New company created", "body": "A new company was added to Bubllio CRM."}, "is_active": true}'
```

### 5. Create a company

```bash
curl -X POST http://127.0.0.1:8000/api/v1/companies/ \
  -H "Content-Type: application/json" \
  -d '{"name": "Acme Inc", "email": "hello@acme.test", "phone_number": "+306900000000", "website": "https://acme.test", "lifecycle_stage": "lead", "organization": "<organization_id>"}'
```

Expected behavior:

- Company is created.
- `company.created` event is dispatched.
- Email action runs.
- Email appears in the runserver terminal.
- `AutomationRun` is created.

### 6. Check automation runs

```bash
curl http://127.0.0.1:8000/api/v1/automations/runs/
```

Expected run status:

```text
success
```

If something fails, inspect:

```text
error_message
```

Alternative faster test:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/automations/<automation_id>/test/ \
  -H "Content-Type: application/json" \
  -d '{"payload": {"test": true}}'
```

This tests the automation action directly without creating a new company.

## Automation Flow Diagram

```text
POST /api/v1/companies/
  |
  v
CompanyListCreateAPIView.post
  |
  v
CompanySerializer validates request data
  |
  v
serializer.save() creates Company
  |
  v
dispatch_automation_event(company.created)
  |
  v
Find active automations for organization + trigger
  |
  v
Run action: send_email
  |
  v
Create AutomationRun(success or failed)
  |
  v
Return company JSON response
```

## Automation Design Notes

This is intentionally not a full workflow engine yet.

Current scope:

```text
single trigger
single action
no conditions yet
synchronous execution
console email backend
run history
```

Why keep it small:

- We can understand the full flow.
- We avoid building too much too early.
- We get the first useful automation working.
- Later changes can build on a clear foundation.

Future improvements:

```text
conditions
multiple actions per automation
background jobs
retries
templated email body
more action types
more triggers wired from models/views
per-organization email settings
```

## Automation Conditions

Conditions are not implemented yet.

Future example:

```text
trigger: company.created
condition: lifecycle_stage == customer
action: send_email
```

Possible condition config later:

```json
{
  "field": "lifecycle_stage",
  "operator": "equals",
  "value": "customer"
}
```

We should add conditions only after the basic trigger/action/run flow is stable.

## Current Endpoints

```text
GET  /api/v1/organizations/
POST /api/v1/organizations/
DELETE /api/v1/organizations/<id>/
GET  /api/v1/companies/
GET  /api/v1/companies/?search=<term>
POST /api/v1/companies/
GET  /api/v1/contacts/
GET  /api/v1/contacts/?search=<term>
POST /api/v1/contacts/
GET  /api/v1/automations/
POST /api/v1/automations/
GET  /api/v1/automations/runs/
POST /api/v1/automations/<id>/test/
```

## Current Learning Status

Done:

- uv project setup
- Django project setup
- Django REST Framework installed and enabled
- first app: `organizations`
- first model: `Organization`
- UUID primary key for public API IDs
- migrations for `Organization`
- admin registration
- serializer
- list/create API view
- app URLs
- global `/api/v1/` prefix
- second app: `companies`
- first account model: `Company`
- company lifecycle stages: `lead`, `prospect`, `customer`, `inactive`
- company list/create/search API
- third app: `contacts`
- first people model: `Contact`
- contact list/create/search API
- fourth app: `automations`
- first automation trigger: `company.created`
- first automation action: `send_email`
- automation run history
- Postman collection and API docs

Next likely steps:

- add detail endpoint: `GET /api/v1/companies/<id>/`
- add update endpoint: `PATCH /api/v1/companies/<id>/`
- add delete endpoint: `DELETE /api/v1/companies/<id>/`
- add detail endpoint: `GET /api/v1/contacts/<id>/`
- add update endpoint: `PATCH /api/v1/contacts/<id>/`
- add delete endpoint: `DELETE /api/v1/contacts/<id>/`
- add more automation triggers for contact and organization events
- add conditions to automations
- add tests
- clean up settings structure
