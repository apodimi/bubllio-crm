import calendar
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.db.models import Q, Sum
from django.utils import timezone

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
    subscription = CustomerSubscription.objects.select_for_update().get(
        id=charge.subscription_id
    )
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
    months = INTERVAL_MONTHS.get(subscription.billing_interval)
    if charge.outstanding_amount == 0 and months and subscription.status == CustomerSubscription.Status.ACTIVE and subscription.auto_renew:
        next_date = add_months(charge.due_date, months)
        if not subscription.end_date or next_date <= subscription.end_date:
            subscription.next_billing_date = next_date
            subscription.save(update_fields=("next_billing_date", "updated_at"))
            ensure_charge(subscription, next_date)
    return payment


@transaction.atomic
def cancel_subscription(*, subscription, immediate=False):
    subscription = CustomerSubscription.objects.select_for_update().get(id=subscription.id)
    today = timezone.localdate()
    current_charge = (
        subscription.charges.exclude(state=Charge.State.CANCELLED)
        .filter(coverage_start__lte=today)
        .order_by("-coverage_start")
        .first()
        or subscription.charges.exclude(state=Charge.State.CANCELLED)
        .order_by("coverage_start")
        .first()
    )
    effective_date = today if immediate or not current_charge else current_charge.coverage_end
    subscription.status = (
        CustomerSubscription.Status.CANCELLED
        if immediate
        else CustomerSubscription.Status.CANCELLING
    )
    subscription.cancellation_effective_date = effective_date
    subscription.cancelled_at = timezone.now()
    subscription.save(
        update_fields=(
            "status",
            "cancellation_effective_date",
            "cancelled_at",
            "updated_at",
        )
    )
    subscription.charges.filter(
        state=Charge.State.OPEN,
        coverage_start__gt=effective_date,
    ).update(state=Charge.State.CANCELLED, updated_at=timezone.now())
    return subscription


@transaction.atomic
def pause_subscription(*, subscription):
    subscription = CustomerSubscription.objects.select_for_update().get(id=subscription.id)
    subscription.status = CustomerSubscription.Status.PAUSED
    subscription.save(update_fields=("status", "updated_at"))
    subscription.charges.filter(
        state=Charge.State.OPEN,
        coverage_start__gt=timezone.localdate(),
    ).update(state=Charge.State.CANCELLED, updated_at=timezone.now())
    return subscription


@transaction.atomic
def expire_subscription(*, subscription):
    subscription = CustomerSubscription.objects.select_for_update().get(id=subscription.id)
    subscription.status = CustomerSubscription.Status.EXPIRED
    subscription.save(update_fields=("status", "updated_at"))
    subscription.charges.filter(
        state=Charge.State.OPEN,
        coverage_start__gt=timezone.localdate(),
    ).update(state=Charge.State.CANCELLED, updated_at=timezone.now())
    return subscription


@transaction.atomic
def resume_subscription(*, subscription):
    subscription = CustomerSubscription.objects.select_for_update().get(id=subscription.id)
    if subscription.effective_status not in {
        CustomerSubscription.Status.CANCELLING,
        CustomerSubscription.Status.PAUSED,
    }:
        raise ValueError("Only a paused subscription or pending cancellation can be resumed.")
    subscription.status = CustomerSubscription.Status.ACTIVE
    subscription.cancellation_effective_date = None
    subscription.cancelled_at = None
    subscription.save(
        update_fields=(
            "status",
            "cancellation_effective_date",
            "cancelled_at",
            "updated_at",
        )
    )
    latest_charge = (
        subscription.charges.exclude(state=Charge.State.CANCELLED)
        .order_by("-due_date")
        .first()
    )
    if latest_charge and latest_charge.outstanding_amount == 0:
        months = INTERVAL_MONTHS.get(subscription.billing_interval)
        if months:
            next_date = add_months(latest_charge.due_date, months)
            subscription.next_billing_date = next_date
            subscription.save(update_fields=("next_billing_date", "updated_at"))
            reopened = subscription.charges.filter(
                due_date=next_date, state=Charge.State.CANCELLED
            ).update(state=Charge.State.OPEN, updated_at=timezone.now())
            if not reopened:
                ensure_charge(subscription, next_date)
    return subscription


def subscription_overview(organization):
    today = timezone.localdate()
    month_start = today.replace(day=1)
    active = CustomerSubscription.objects.filter(organization=organization).filter(
        Q(status=CustomerSubscription.Status.ACTIVE)
        | Q(
            status=CustomerSubscription.Status.CANCELLING,
            cancellation_effective_date__gte=today,
        )
    ).filter(Q(end_date__isnull=True) | Q(end_date__gte=today))
    charges = Charge.objects.filter(organization=organization, state=Charge.State.OPEN)
    payments = Payment.objects.filter(
        organization=organization,
        paid_date__gte=month_start,
        paid_date__lte=today,
    )

    open_balances = {}
    overdue_balances = {}
    overdue_count = 0
    for charge in charges.prefetch_related("payments"):
        outstanding = charge.outstanding_amount
        if outstanding <= 0:
            continue
        open_balances[charge.currency] = open_balances.get(charge.currency, 0) + outstanding
        if charge.due_date < today:
            overdue_count += 1
            overdue_balances[charge.currency] = overdue_balances.get(charge.currency, 0) + outstanding

    collected = {
        row["charge__currency"]: row["total"]
        for row in payments.values("charge__currency").annotate(total=Sum("amount"))
    }
    recurring_revenue = {}
    for subscription in active.exclude(
        billing_interval=ServiceCatalogItem.BillingInterval.ONE_OFF
    ):
        months = INTERVAL_MONTHS[subscription.billing_interval]
        monthly = subscription.net_price / months
        recurring_revenue[subscription.currency] = (
            recurring_revenue.get(subscription.currency, 0) + monthly
        )
    recurring_revenue = {
        currency: amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        for currency, amount in recurring_revenue.items()
    }

    return {
        "active_subscriptions": active.count(),
        "scheduled_cancellations": active.filter(
            status=CustomerSubscription.Status.CANCELLING
        ).count(),
        "renewals_next_30_days": active.filter(
            renewal_date__gte=today,
            renewal_date__lte=today + timedelta(days=30),
        ).count(),
        "overdue_charges": overdue_count,
        "open_balances": open_balances,
        "overdue_balances": overdue_balances,
        "collected_this_month": collected,
        "monthly_recurring_revenue": recurring_revenue,
    }
