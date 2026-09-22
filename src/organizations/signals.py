from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import InstallationState
from .personal_workspace import ensure_personal_workspace


@receiver(post_save, sender=get_user_model())
def create_personal_workspace_for_user(sender, instance, created, **kwargs):
    if not created:
        return
    # During first-run setup the installation workspace is created explicitly;
    # create the personal workspace immediately after setup completes instead.
    state = InstallationState.objects.filter(pk=1).first()
    if state and state.completed_at:
        ensure_personal_workspace(instance)
