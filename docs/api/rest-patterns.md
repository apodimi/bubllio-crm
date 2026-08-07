# REST API Patterns

This document explains how we structure API endpoints, serializers, views, and URLs.

## Request Flow

The API request flow is:

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

Example file:

```text
src/organizations/views.py
```

Example list/create view:

```python
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
    path("api/v1/", include([
        path("organizations/", include("organizations.urls")),
        path("companies/", include("companies.urls")),
        path("contacts/", include("contacts.urls")),
        path("automations/", include("automations.urls")),
    ])),
]
```

This creates:

```text
/api/v1/organizations/
/api/v1/companies/
/api/v1/contacts/
/api/v1/automations/
```

## Class Splitting Logic

Split view classes by resource and responsibility.

Collection endpoint:

```text
GET  /api/v1/organizations/
POST /api/v1/organizations/
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
POST /api/v1/automations/<id>/test/
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

## Search Pattern

For simple search, filter the queryset before creating the serializer.

Example:

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
