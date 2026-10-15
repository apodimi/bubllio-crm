from django.db import IntegrityError, transaction
from django.db.models import Value
from django.db.models.functions import Lower
from rest_framework import serializers


class TenantIdentitySaveMixin:
    """Translate a late uniqueness race to the same field error as validation."""

    identity_fields = ()

    def save(self, **kwargs):
        try:
            # A savepoint lets us safely query after a failed constraint, even
            # when the caller already owns a surrounding atomic transaction.
            with transaction.atomic():
                return super().save(**kwargs)
        except IntegrityError:
            organization = kwargs.get('organization') or self.context.get('organization')
            if organization is None and self.instance is not None:
                organization = self.instance.organization
            if organization is not None:
                rows = self.Meta.model.objects.filter(organization=organization)
                if self.instance is not None:
                    rows = rows.exclude(pk=self.instance.pk)
                for field in self.identity_fields:
                    value = self.validated_data.get(field, getattr(self.instance, field, ''))
                    if value and rows.annotate(identity=Lower(field)).filter(identity=Lower(Value(value))).exists():
                        raise serializers.ValidationError({field: 'A record with this value already exists in this workspace.'}) from None
            raise
