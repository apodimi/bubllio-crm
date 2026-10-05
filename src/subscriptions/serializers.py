from django.utils import timezone
from rest_framework import serializers

from organizations.models import OrganizationMembership

from .models import Charge, CustomerSubscription, Payment, ServiceCatalogItem
from .services import (
    ensure_charge,
    expire_subscription,
    pause_subscription,
    record_payment,
    resume_subscription,
)


class ServiceCatalogItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceCatalogItem
        fields = (
            "id",
            "organization",
            "name",
            "description",
            "internal_code",
            "default_net_price",
            "currency",
            "default_tax_rate",
            "billing_interval",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "organization", "created_at", "updated_at")

    def validate_default_net_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Enter an amount of zero or greater.")
        return value

    def validate_currency(self, value):
        return value.upper()


class CustomerSubscriptionSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.name", read_only=True)
    catalog_item_name = serializers.CharField(source="catalog_item.name", read_only=True)
    assigned_to_name = serializers.SerializerMethodField()
    tax_amount = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    gross_price = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    effective_status = serializers.CharField(read_only=True)

    class Meta:
        model = CustomerSubscription
        fields = (
            "id",
            "organization",
            "company",
            "company_name",
            "catalog_item",
            "catalog_item_name",
            "originating_deal",
            "assigned_to",
            "assigned_to_name",
            "name",
            "net_price",
            "currency",
            "tax_rate",
            "tax_amount",
            "gross_price",
            "billing_interval",
            "start_date",
            "next_billing_date",
            "renewal_date",
            "end_date",
            "cancellation_effective_date",
            "cancelled_at",
            "auto_renew",
            "status",
            "effective_status",
            "operational_reference",
            "notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "organization",
            "company_name",
            "catalog_item_name",
            "assigned_to_name",
            "tax_amount",
            "gross_price",
            "cancellation_effective_date",
            "cancelled_at",
            "effective_status",
            "created_at",
            "updated_at",
        )
        extra_kwargs = {
            "name": {"required": False},
            "net_price": {"required": False},
            "currency": {"required": False},
            "tax_rate": {"required": False},
            "billing_interval": {"required": False},
            "start_date": {"required": False},
            "next_billing_date": {"required": False},
        }

    def get_assigned_to_name(self, subscription):
        if not subscription.assigned_to:
            return ""
        return subscription.assigned_to.get_full_name() or subscription.assigned_to.username

    def validate(self, attrs):
        organization = self.context.get("organization") or getattr(self.instance, "organization", None)
        company = attrs.get("company", getattr(self.instance, "company", None))
        catalog_item = attrs.get("catalog_item", getattr(self.instance, "catalog_item", None))
        deal = attrs.get("originating_deal", getattr(self.instance, "originating_deal", None))
        assigned_to = attrs.get("assigned_to", getattr(self.instance, "assigned_to", None))

        if company and company.organization_id != organization.id:
            raise serializers.ValidationError({"company": "Choose a company from this workspace."})
        if catalog_item and catalog_item.organization_id != organization.id:
            raise serializers.ValidationError({"catalog_item": "Choose a service from this workspace."})
        if deal and (deal.organization_id != organization.id or deal.company_id != company.id):
            raise serializers.ValidationError({"originating_deal": "Choose a deal from the selected company."})
        if assigned_to and not OrganizationMembership.objects.filter(
            organization=organization, user=assigned_to
        ).exists():
            raise serializers.ValidationError({"assigned_to": "Choose a member of this workspace."})
        requested_status = attrs.get("status")
        if requested_status in {
            CustomerSubscription.Status.CANCELLING,
            CustomerSubscription.Status.CANCELLED,
        }:
            raise serializers.ValidationError(
                {"status": "Use the cancellation action to end a subscription safely."}
            )

        for field in ("start_date", "next_billing_date"):
            if not self.instance and not attrs.get(field):
                attrs[field] = timezone.localdate()

        if not self.instance and catalog_item:
            defaults = {
                "name": catalog_item.name,
                "net_price": catalog_item.default_net_price,
                "currency": catalog_item.currency,
                "tax_rate": catalog_item.default_tax_rate,
                "billing_interval": catalog_item.billing_interval,
            }
            for field, value in defaults.items():
                attrs.setdefault(field, value)

        required = ("name", "net_price", "currency", "tax_rate", "billing_interval")
        values = {
            field: attrs.get(field, getattr(self.instance, field, None)) for field in required
        }
        missing = {
            field: "This field is required when no service provides a default."
            for field, value in values.items()
            if value in (None, "")
        }
        if missing:
            raise serializers.ValidationError(missing)
        if values["net_price"] < 0:
            raise serializers.ValidationError({"net_price": "Enter an amount of zero or greater."})
        if values["tax_rate"] < 0 or values["tax_rate"] > 100:
            raise serializers.ValidationError({"tax_rate": "Enter a VAT rate between 0 and 100."})
        start_date = attrs.get("start_date", getattr(self.instance, "start_date", None))
        next_billing_date = attrs.get(
            "next_billing_date", getattr(self.instance, "next_billing_date", None)
        )
        end_date = attrs.get("end_date", getattr(self.instance, "end_date", None))
        if end_date and end_date < start_date:
            raise serializers.ValidationError({"end_date": "End date cannot be before the start date."})
        if end_date and end_date < next_billing_date:
            raise serializers.ValidationError(
                {"end_date": "End date cannot be before the next billing date."}
            )
        if "currency" in attrs:
            attrs["currency"] = attrs["currency"].upper()
        return attrs

    def create(self, validated_data):
        subscription = super().create(validated_data)
        ensure_charge(subscription)
        return subscription

    def update(self, instance, validated_data):
        requested_status = validated_data.pop("status", None)
        previous_status = instance.effective_status
        subscription = super().update(instance, validated_data)
        if requested_status == CustomerSubscription.Status.PAUSED:
            return pause_subscription(subscription=subscription)
        if (
            requested_status == CustomerSubscription.Status.ACTIVE
            and previous_status
            in {
                CustomerSubscription.Status.PAUSED,
                CustomerSubscription.Status.CANCELLING,
            }
        ):
            return resume_subscription(subscription=subscription)
        if requested_status == CustomerSubscription.Status.EXPIRED:
            return expire_subscription(subscription=subscription)
        if requested_status:
            subscription.status = requested_status
            subscription.save(update_fields=("status", "updated_at"))
        return subscription


class PaymentSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = (
            "id",
            "amount",
            "paid_date",
            "payment_method",
            "external_reference",
            "note",
            "recorded_by",
            "recorded_by_name",
            "created_at",
        )
        read_only_fields = ("id", "recorded_by", "recorded_by_name", "created_at")
        extra_kwargs = {
            "paid_date": {"required": False, "default": timezone.localdate},
            "payment_method": {"required": False, "default": ""},
            "external_reference": {"required": False, "default": ""},
            "note": {"required": False, "default": ""},
        }

    def get_recorded_by_name(self, payment):
        if not payment.recorded_by:
            return ""
        return payment.recorded_by.get_full_name() or payment.recorded_by.username

    def create(self, validated_data):
        try:
            return record_payment(
                charge=self.context["charge"],
                recorded_by=self.context["request"].user,
                **validated_data,
            )
        except ValueError as error:
            raise serializers.ValidationError({"amount": str(error)}) from error


class ChargeSerializer(serializers.ModelSerializer):
    subscription_name = serializers.CharField(source="subscription.name", read_only=True)
    company = serializers.UUIDField(source="subscription.company_id", read_only=True)
    company_name = serializers.CharField(source="subscription.company.name", read_only=True)
    paid_amount = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    outstanding_amount = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    payment_status = serializers.CharField(read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)

    class Meta:
        model = Charge
        fields = (
            "id",
            "subscription",
            "subscription_name",
            "company",
            "company_name",
            "coverage_start",
            "coverage_end",
            "due_date",
            "net_amount",
            "tax_rate",
            "tax_amount",
            "gross_amount",
            "paid_amount",
            "outstanding_amount",
            "currency",
            "state",
            "payment_status",
            "payments",
            "created_at",
            "updated_at",
        )
