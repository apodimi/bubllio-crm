from rest_framework import serializers

from .models import CollaboratorService, DealCostLine, ExternalCollaborator


def normalize_currency(value):
    currency = value.upper()
    if len(currency) != 3 or not currency.isascii() or not currency.isalpha():
        raise serializers.ValidationError("Enter a three-letter currency code.")
    return currency


class ExternalCollaboratorSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExternalCollaborator
        fields = (
            "id", "organization", "name", "specialty", "email", "phone_number",
            "notes", "is_active", "created_at", "updated_at",
        )
        read_only_fields = ("id", "organization", "created_at", "updated_at")


class CollaboratorServiceSerializer(serializers.ModelSerializer):
    collaborator_name = serializers.CharField(source="collaborator.name", read_only=True)

    class Meta:
        model = CollaboratorService
        fields = (
            "id", "organization", "collaborator", "collaborator_name", "name",
            "description", "default_cost", "currency", "is_active", "created_at", "updated_at",
        )
        read_only_fields = ("id", "organization", "collaborator_name", "created_at", "updated_at")

    def validate_currency(self, value):
        return normalize_currency(value)

    def validate_default_cost(self, value):
        if value < 0:
            raise serializers.ValidationError("Enter an amount of zero or greater.")
        return value

    def validate(self, attrs):
        organization = self.context.get("organization") or self.instance.organization
        collaborator = attrs.get("collaborator", getattr(self.instance, "collaborator", None))
        if collaborator and collaborator.organization_id != organization.id:
            raise serializers.ValidationError(
                {"collaborator": "Choose a collaborator from this workspace."}
            )
        if self.instance is None and collaborator and not collaborator.is_active:
            raise serializers.ValidationError(
                {"collaborator": "Choose an active collaborator."}
            )
        if "currency" in attrs:
            attrs["currency"] = normalize_currency(attrs["currency"])
        return attrs


class DealCostLineSerializer(serializers.ModelSerializer):
    total_cost = serializers.DecimalField(max_digits=26, decimal_places=2, read_only=True)

    class Meta:
        model = DealCostLine
        fields = (
            "id", "organization", "deal", "collaborator", "collaborator_service",
            "collaborator_name", "service_name", "description", "quantity", "unit_cost",
            "total_cost", "currency", "status", "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "organization", "deal", "collaborator_name", "total_cost",
            "created_at", "updated_at",
        )
        extra_kwargs = {
            "service_name": {"required": False},
            "description": {"required": False},
            "unit_cost": {"required": False},
            "currency": {"required": False},
        }

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Enter an amount greater than zero.")
        return value

    def validate_unit_cost(self, value):
        if value < 0:
            raise serializers.ValidationError("Enter an amount of zero or greater.")
        return value

    def validate(self, attrs):
        organization = self.context["organization"]
        deal = self.context["deal"]
        creating = self.instance is None
        collaborator_changed = creating or (
            "collaborator" in attrs
            and attrs["collaborator"].id != self.instance.collaborator_id
        )
        service_changed = creating or (
            "collaborator_service" in attrs
            and getattr(attrs["collaborator_service"], "id", None)
            != self.instance.collaborator_service_id
        )
        collaborator = attrs.get("collaborator", getattr(self.instance, "collaborator", None))
        service = attrs.get(
            "collaborator_service", getattr(self.instance, "collaborator_service", None)
        )
        if collaborator and collaborator.organization_id != organization.id:
            raise serializers.ValidationError(
                {"collaborator": "Choose a collaborator from this workspace."}
            )
        if service and service.organization_id != organization.id:
            raise serializers.ValidationError(
                {"collaborator_service": "Choose a service from this workspace."}
            )
        if service and collaborator and service.collaborator_id != collaborator.id:
            raise serializers.ValidationError(
                {"collaborator_service": "Choose a service from the selected collaborator."}
            )
        if collaborator_changed and collaborator and not collaborator.is_active:
            raise serializers.ValidationError(
                {"collaborator": "Choose an active collaborator."}
            )
        if service_changed and service and not service.is_active:
            raise serializers.ValidationError(
                {"collaborator_service": "Choose an active collaborator service."}
            )

        # Catalog values are copied only when a line is created or its catalog
        # service changes. Unrelated updates must preserve the historical
        # snapshot even when the catalog has since been edited.
        if service and service_changed:
            attrs.setdefault("service_name", service.name)
            attrs.setdefault("description", service.description)
            attrs.setdefault("unit_cost", service.default_cost)
            attrs.setdefault("currency", service.currency)

        values = {
            field: attrs.get(field, getattr(self.instance, field, None))
            for field in ("service_name", "unit_cost", "currency")
        }
        missing = {
            field: "This field is required when no catalog service provides a default."
            for field, value in values.items()
            if value in (None, "")
        }
        if missing:
            raise serializers.ValidationError(missing)
        try:
            currency = normalize_currency(values["currency"])
        except serializers.ValidationError as error:
            raise serializers.ValidationError({"currency": error.detail}) from error
        if currency != deal.currency.upper():
            raise serializers.ValidationError(
                {"currency": "Cost currency must match the deal currency."}
            )
        attrs["currency"] = currency
        if collaborator_changed:
            attrs["collaborator_name"] = collaborator.name
        return attrs


class DealProfitabilitySerializer(serializers.Serializer):
    deal = serializers.UUIDField()
    currency = serializers.CharField()
    net_revenue = serializers.DecimalField(max_digits=14, decimal_places=2)
    estimated_cost_total = serializers.DecimalField(max_digits=26, decimal_places=2)
    committed_cost_total = serializers.DecimalField(max_digits=26, decimal_places=2)
    estimated_gross_profit = serializers.DecimalField(max_digits=26, decimal_places=2)
    estimated_margin_percent = serializers.DecimalField(
        max_digits=12, decimal_places=2, allow_null=True
    )

