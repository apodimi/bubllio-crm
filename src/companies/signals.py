from django.db.models.signals import post_save
from django.dispatch import receiver

from automations.services import dispatch_company_created

from .models import Company


@receiver(post_save, sender=Company)
def dispatch_company_created_automations(sender, instance, created, **kwargs):
    if not created:
        return

    dispatch_company_created(instance)
