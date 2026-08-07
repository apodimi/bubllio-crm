from django.core.mail import send_mail

from .events import AutomationTrigger
from .models import Automation, AutomationRun


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
        runs.append(run_automation(automation=automation, trigger=trigger, payload=payload))

    return runs


def run_automation(*, automation, trigger, payload):
    try:
        if automation.action_type == Automation.ActionType.SEND_EMAIL:
            _send_email(action_config=automation.action_config)
        else:
            return AutomationRun.objects.create(
                automation=automation,
                trigger=trigger,
                status=AutomationRun.Status.SKIPPED,
                payload=payload,
                error_message=f"Unsupported action type: {automation.action_type}",
            )

        return AutomationRun.objects.create(
            automation=automation,
            trigger=trigger,
            status=AutomationRun.Status.SUCCESS,
            payload=payload,
        )
    except Exception as exc:
        return AutomationRun.objects.create(
            automation=automation,
            trigger=trigger,
            status=AutomationRun.Status.FAILED,
            payload=payload,
            error_message=str(exc),
        )


def _send_email(*, action_config):
    send_mail(
        subject=action_config["subject"],
        message=action_config["body"],
        from_email=action_config.get("from_email"),
        recipient_list=action_config["to"],
        fail_silently=False,
    )
