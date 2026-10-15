from django.db import migrations


def backfill_company_timeline(apps, schema_editor):
    CompanyActivity = apps.get_model("companies", "CompanyActivity")
    CompanyTimelineEvent = apps.get_model("companies", "CompanyTimelineEvent")
    ContactActivity = apps.get_model("contacts", "ContactActivity")
    Deal = apps.get_model("deals", "Deal")
    Task = apps.get_model("activities", "Task")
    CustomerSubscription = apps.get_model("subscriptions", "CustomerSubscription")
    Payment = apps.get_model("subscriptions", "Payment")

    events = []

    def flush():
        nonlocal events
        if events:
            CompanyTimelineEvent.objects.bulk_create(events, batch_size=500)
            events = []

    company_event_types = {
        "created": ("company", "company.created"),
        "updated": ("company", "company.updated"),
        "assigned": ("company", "company.assigned"),
        "contact_added": ("contact", "contact.created"),
        "archived": ("company", "company.archived"),
        "restored": ("company", "company.restored"),
    }
    for activity in CompanyActivity.objects.all().iterator(chunk_size=500):
        category, event_type = company_event_types[activity.action]
        source_id = activity.company_id
        source_type = "company"
        if activity.action == "contact_added":
            source_type = "contact"
            source_id = activity.details.get("contact_id")
        events.append(
            CompanyTimelineEvent(
                organization_id=activity.organization_id,
                company_id=activity.company_id,
                actor_id=activity.actor_id,
                category=category,
                event_type=event_type,
                source_type=source_type,
                source_id=source_id,
                details=activity.details,
                occurred_at=activity.created_at,
            )
        )
        if len(events) >= 500:
            flush()

    contact_event_types = {
        "updated": "contact.updated",
        "assigned": "contact.assigned",
        "archived": "contact.archived",
        "restored": "contact.restored",
    }
    contact_activities = ContactActivity.objects.exclude(action="created").select_related(
        "contact"
    )
    for activity in contact_activities.iterator(chunk_size=500):
        contact = activity.contact
        contact_name = " ".join(
            value for value in (contact.first_name, contact.last_name) if value
        )
        events.append(
            CompanyTimelineEvent(
                organization_id=activity.organization_id,
                company_id=contact.company_id,
                actor_id=activity.actor_id,
                category="contact",
                event_type=contact_event_types[activity.action],
                source_type="contact",
                source_id=contact.id,
                details={"contact_name": contact_name, **activity.details},
                occurred_at=activity.created_at,
            )
        )
        if len(events) >= 500:
            flush()

    for deal in Deal.objects.all().iterator(chunk_size=500):
        events.append(
            CompanyTimelineEvent(
                organization_id=deal.organization_id,
                company_id=deal.company_id,
                category="deal",
                event_type="deal.created",
                source_type="deal",
                source_id=deal.id,
                details={"deal_title": deal.title, "stage": deal.stage},
                occurred_at=deal.created_at,
            )
        )
        if len(events) >= 500:
            flush()

    for task in Task.objects.all().iterator(chunk_size=500):
        events.append(
            CompanyTimelineEvent(
                organization_id=task.organization_id,
                company_id=task.company_id,
                actor_id=task.created_by_id,
                category="task",
                event_type="task.created",
                source_type="task",
                source_id=task.id,
                details={"task_title": task.title, "kind": task.kind},
                occurred_at=task.created_at,
            )
        )
        if task.completed_at:
            events.append(
                CompanyTimelineEvent(
                    organization_id=task.organization_id,
                    company_id=task.company_id,
                    actor_id=task.completed_by_id,
                    category="task",
                    event_type="task.completed",
                    source_type="task",
                    source_id=task.id,
                    details={
                        "task_title": task.title,
                        "from_status": "todo",
                        "to_status": "completed",
                    },
                    occurred_at=task.completed_at,
                )
            )
        if len(events) >= 500:
            flush()

    for subscription in CustomerSubscription.objects.all().iterator(chunk_size=500):
        events.append(
            CompanyTimelineEvent(
                organization_id=subscription.organization_id,
                company_id=subscription.company_id,
                category="service",
                event_type="service.created",
                source_type="subscription",
                source_id=subscription.id,
                details={"subscription_name": subscription.name},
                occurred_at=subscription.created_at,
            )
        )
        if len(events) >= 500:
            flush()

    payments = Payment.objects.select_related("charge__subscription")
    for payment in payments.iterator(chunk_size=500):
        subscription = payment.charge.subscription
        events.append(
            CompanyTimelineEvent(
                organization_id=payment.organization_id,
                company_id=subscription.company_id,
                actor_id=payment.recorded_by_id,
                category="payment",
                event_type="payment.recorded",
                source_type="payment",
                source_id=payment.id,
                details={
                    "subscription_name": subscription.name,
                    "amount": str(payment.amount),
                    "currency": payment.charge.currency,
                },
                occurred_at=payment.created_at,
            )
        )
        if len(events) >= 500:
            flush()

    flush()


def clear_company_timeline(apps, schema_editor):
    CompanyTimelineEvent = apps.get_model("companies", "CompanyTimelineEvent")
    CompanyTimelineEvent.objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [
        ("activities", "0002_task_workflow_status"),
        ("companies", "0004_companytimelineevent"),
        ("contacts", "0002_contactactivity_alter_contact_options_and_more"),
        ("deals", "0002_alter_deal_options_deal_amount_includes_tax_and_more"),
        (
            "subscriptions",
            "0003_customersubscription_cancellation_effective_date_and_more",
        ),
    ]

    operations = [
        migrations.RunPython(backfill_company_timeline, clear_company_timeline),
    ]
