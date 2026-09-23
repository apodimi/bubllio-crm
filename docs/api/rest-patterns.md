# REST API Patterns

This document explains how we structure API endpoints, serializers, views, and URLs.

## Request Flow

The authenticated API request flow is:

```text
URL
  -> Authentication
  -> Organization membership and capability
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

## Serializers

Serializers convert between Django models and JSON.

Example file:

```text
src/organizations/serializers.py
```

Example:

```python
from rest_framework import serializers

from .models import Organization


class OrganizationSerializer(serializers.ModelSerializer):
    current_user_role = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = [
            "id",
            "name",
            "slug",
            "current_user_role",
            "created_at",
            "updated_at",
        ]
```

Why:

- `ModelSerializer` reads field definitions from the model.
- `fields` controls what the API exposes.
- The serializer validates input for `POST`, `PATCH`, etc.

## Views

Views define API behavior.

Example file:

```text
src/organizations/api/workspaces.py
```

Organization-owned collection views first resolve the organization through the
authenticated user's membership. A simplified example is:

```python
class CompanyListCreateAPIView(APIView):
    def get(self, request, organization_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.VIEW_CRM,
        )
        companies = Company.objects.filter(organization=organization)
        serializer = CompanySerializer(companies, many=True)
        return Response(serializer.data)

    def post(self, request, organization_id):
        organization = get_organization_for_user(
            user=request.user,
            organization_id=organization_id,
            capability=Capability.MANAGE_CRM,
        )
        serializer = CompanySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(organization=organization)
        return Response(serializer.data, status=201)
```

Why:

- The URL supplies the tenant identifier.
- The membership lookup both authorizes and resolves the organization.
- The queryset is filtered by that resolved organization.
- The server supplies `organization` during save; clients cannot select a
  different tenant in JSON.
- `many=True` means the serializer receives many objects, not one.
- `serializer.is_valid()` validates request data.
- `serializer.save()` creates the database row.
- `Response(...)` returns JSON.

## App URLs

App URLs connect app routes to views.

Example file:

```text
src/organizations/urls.py
```

Example:

```python
urlpatterns = [
    path("", OrganizationListCreateAPIView.as_view(), name="organization-list"),
    path("<uuid:organization_id>/", OrganizationDetailAPIView.as_view(), name="organization-detail"),
]
```

Why:

- `""` means the root of the app route.
- The global project URL decides the prefix.
- `.as_view()` turns the class into a Django-compatible view.
- `<uuid:organization_id>/` captures one resource id from the URL.

## Project URLs

Project URLs connect global API prefixes to app URLs.

Example file:

```text
src/bubllio_crm/urls.py
```

Example:

```python
urlpatterns = [
    path("admin/", admin.site.urls),
    path("api-auth/", include("rest_framework.urls")),
    path("api/v1/organizations/", include("organizations.urls")),
]
```

This creates:

```text
/api/v1/organizations/
/api/v1/organizations/<organization_id>/companies/
/api/v1/organizations/<organization_id>/contacts/
/api/v1/organizations/<organization_id>/automations/
```

## Class Splitting Logic

Split view classes by resource and responsibility.

Collection endpoint:

```text
GET  /api/v1/organizations/<organization_id>/companies/
POST /api/v1/organizations/<organization_id>/companies/
```

Use one class:

```python
class CompanyListCreateAPIView(APIView):
    ...
```

Detail endpoint:

```text
GET    /api/v1/organizations/<organization_id>/
DELETE /api/v1/organizations/<organization_id>/
```

Use another class:

```python
class OrganizationDetailAPIView(APIView):
    ...
```

Custom action endpoint:

```text
POST /api/v1/organizations/<organization_id>/automations/<id>/test/
```

Use another class:

```python
class AutomationTestAPIView(APIView):
    ...
```

Rule of thumb:

```text
same path + same resource level -> same class, different methods
different path or custom action -> different class
```

## Automation Response Semantics

Creating an automation saves a rule; it does not execute it. The manual test
endpoint executes the action and returns HTTP 201 with a run, including when that
run has `status: failed`. Clients must inspect the body's `status` and
`run.error_message`. This test is not a dry run and bypasses the active-rule
filter used by normal event dispatch.

There is no automation PATCH/DELETE or multi-step definition endpoint yet.
See [current automation behavior](../architecture/automations.md) and the
[walkthrough](../guides/first-automation.md). Future workflow definitions in the
[roadmap](../architecture/automation-roadmap.md) are not a current API contract.

## Collection Search

For simple search, filter the queryset before creating the serializer.

Example:

```python
from django.db.models import Q


def get(self, request, organization_id):
    organization = get_organization_for_user(
        user=request.user,
        organization_id=organization_id,
        capability=Capability.VIEW_CRM,
    )
    companies = Company.objects.filter(organization=organization)
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

- Filter before serializing.
- Use `Q(...) | Q(...)` for OR search.
- Multiple keyword arguments in `.filter(...)` behave like AND.

## Naming Convention

Recommended API class names:

```python
OrganizationListCreateAPIView
OrganizationDetailAPIView
CompanyListCreateAPIView
CompanyDetailAPIView
ContactListCreateAPIView
ContactDetailAPIView
AutomationListCreateAPIView
AutomationRunListAPIView
AutomationTestAPIView
```

`Detail` is singular because the endpoint represents one resource.
