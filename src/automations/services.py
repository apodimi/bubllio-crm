from django.core.mail import send_mail

from .events import AutomationTrigger
from .models import Automation, AutomationRun
from delivery.models import OutboxMessage
from delivery.services import queue_outbox_message


def dispatch_company_created(company):
    return dispatch_automation_event(
        organization=company.organization,
        trigger=AutomationTrigger.COMPANY_CREATED,
        payload={
            "company_id": str(company.id),
            "company_name": company.name,
            "lifecycle_stage": company.lifecycle_stage,
        },
    )


def dispatch_automation_event(*, organization, trigger, payload):
    automations = Automation.objects.filter(
        organization=organization,
        trigger=trigger,
        is_active=True,
    )

    runs = []

    for automation in automations:
        runs.append(queue_automation_run(automation=automation, trigger=trigger, payload=payload))

    return runs


def run_automation(*, automation, trigger, payload):
    return queue_automation_run(automation=automation, trigger=trigger, payload=payload)


def queue_automation_run(*, automation, trigger, payload):
    run = AutomationRun.objects.create(
        automation=automation,
        trigger=trigger,
        status=AutomationRun.Status.QUEUED,
        payload=payload,
    )
    queue_outbox_message(
        kind=OutboxMessage.Kind.AUTOMATION_RUN,
        payload={"run_id": str(run.id)},
    )
    return run


def execute_automation_run(run):
    run.status = AutomationRun.Status.PROCESSING
    run.error_message = ""
    run.save(update_fields=("status", "error_message"))
    try:
        if run.automation.action_type == Automation.ActionType.SEND_EMAIL:
            _send_email(action_config=run.automation.action_config)
        else:
            run.status = AutomationRun.Status.SKIPPED
            run.error_message = f"Unsupported action type: {run.automation.action_type}"
            run.save(update_fields=("status", "error_message"))
            return run
        run.status = AutomationRun.Status.SUCCESS
        run.save(update_fields=("status",))
        return run
    except Exception as exc:
        run.status = AutomationRun.Status.FAILED
        run.error_message = str(exc)[:2000]
        run.save(update_fields=("status", "error_message"))
        raise


def _send_email(*, action_config):
    send_mail(
        subject=action_config["subject"],
        message=action_config["body"],
        from_email=action_config.get("from_email"),
        recipient_list=action_config["to"],
        fail_silently=False,
    )
