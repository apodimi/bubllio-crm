from django.db import migrations


def backfill_fallback(apps, schema_editor):
    InstallationState = apps.get_model("organizations", "InstallationState")
    EmailAccount = apps.get_model("organizations", "EmailAccount")
    state, _ = InstallationState.objects.get_or_create(pk=1)
    if state.fallback_email_account_id is None:
        account = EmailAccount.objects.filter(is_default=True, is_active=True).order_by("created_at").first()
        if account:
            state.fallback_email_account_id = account.pk
            state.save(update_fields=("fallback_email_account",))


class Migration(migrations.Migration):
    dependencies = [("organizations", "0008_installationstate_fallback_email_account")]
    operations = [migrations.RunPython(backfill_fallback, migrations.RunPython.noop)]
