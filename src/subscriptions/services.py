import calendar
from datetime import date, timedelta

from django.db import transaction

from .models import Charge, CustomerSubscription, Payment, ServiceCatalogItem


INTERVAL_MONTHS = {
    ServiceCatalogItem.BillingInterval.MONTHLY: 1,
    ServiceCatalogItem.BillingInterval.QUARTERLY: 3,
    ServiceCatalogItem.BillingInterval.SEMIANNUAL: 6,
    ServiceCatalogItem.BillingInterval.ANNUAL: 12,
}


def add_months(value, months):
    month_index = value.month - 1 + months
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    day = min(value.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def period_end(subscription, start):
    months = INTERVAL_MONTHS.get(subscription.billing_interval)
    return add_months(start, months) - timedelta(days=1) if months else start


@transaction.atomic
def ensure_charge(subscription, due_date=None):
    due_date = due_date or subscription.next_billing_date
    tax_amount = subscription.tax_amount
    charge, _ = Charge.objects.get_or_create(
        subscription=subscription,
        due_date=due_date,
        defaults={
            "organization": subscription.organization,
            "coverage_start": due_date,
            "coverage_end": period_end(subscription, due_date),
            "net_amount": subscription.net_price,
            "tax_rate": subscription.tax_rate,
            "tax_amount": tax_amount,
            "gross_amount": subscription.net_price + tax_amount,
            "currency": subscription.currency,
        },
    )
    return charge


@transaction.atomic
def record_payment(*, charge, amount, paid_date, payment_method, external_reference, note, recorded_by):
    charge = Charge.objects.select_for_update().get(id=charge.id)
    if charge.state != Charge.State.OPEN:
        raise ValueError("Payments can only be recorded against an open charge.")
    if amount <= 0:
        raise ValueError("Payment amount must be greater than zero.")
    if amount > charge.outstanding_amount:
        raise ValueError("Payment amount cannot exceed the outstanding balance.")
    payment = Payment.objects.create(
        organization=charge.organization,
        charge=charge,
        amount=amount,
        paid_date=paid_date,
        payment_method=payment_method,
        external_reference=external_reference,
        note=note,
        recorded_by=recorded_by,
    )
    charge.refresh_from_db()
    subscription = charge.subscription
    months = INTERVAL_MONTHS.get(subscription.billing_interval)
    if charge.outstanding_amount == 0 and months and subscription.status == CustomerSubscription.Status.ACTIVE and subscription.auto_renew:
        next_date = add_months(charge.due_date, months)
        if not subscription.end_date or next_date <= subscription.end_date:
            subscription.next_billing_date = next_date
            subscription.save(update_fields=("next_billing_date", "updated_at"))
            ensure_charge(subscription, next_date)
    return payment
