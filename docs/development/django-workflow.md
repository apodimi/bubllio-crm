# Django Workflow

This guide explains the normal flow when adding something to the Django project.

## Create A New App

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

## Standard API Feature Flow

For a normal REST resource, the flow is:

```text
model
  -> migration
  -> admin
  -> serializer
  -> view
  -> app urls
  -> project urls
  -> check
  -> test manually or with automated tests
```

## Files To Touch

### `models.py`

Defines database structure.

Example:

```python
class Organization(models.Model):
    name = models.CharField(max_length=255)
```

### `admin.py`

Registers the model in Django admin.

Example:

```python
@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "slug", "created_at", "updated_at")
```

### `serializers.py`

Defines how the model becomes JSON and how incoming JSON is validated.

Example:

```python
class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ["id", "name", "slug", "created_at", "updated_at"]
```

### `views.py`

Defines API behavior.

Example:

```python
class OrganizationListCreateAPIView(APIView):
    def get(self, request):
        ...

    def post(self, request):
        ...
```

### `urls.py`

Connects a URL path to a view.

Example:

```python
urlpatterns = [
    path("", OrganizationListCreateAPIView.as_view(), name="organization-list"),
]
```

## Contributing to Automations

Read [current automation behavior](../architecture/automations.md) before making
changes. The [workflow roadmap](../architecture/automation-roadmap.md) records
future direction; its blocks and API concepts are not implemented yet.

Use the existing Django services and tenant permissions for the next iteration.
Wire a trigger from a real event before presenting it as supported. Tests should
exercise the actual signal path, same-tenant selection, inactive rules, action
failure, and the recorded result, not just a successful manual test request.
Existing automation tests primarily cover API authorization and tenant isolation.

Update architecture docs, the walkthrough, and Postman examples together when
behavior changes. Separate working behavior from planned improvements, including
email transport and test endpoint side effects.

## Verification

Run:

```bash
uv run python src/manage.py check
uv run python src/manage.py makemigrations --check --dry-run
uv run python src/manage.py test bubllio_crm organizations companies contacts automations
```

Use `makemigrations --check --dry-run` when you want to verify there are no model changes missing migrations.

The explicit app labels are important with this repository's `src/` layout. A
bare `manage.py test` currently discovers zero tests.
