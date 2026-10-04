from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from organizations.models import InstallationBackupEvent


def _result(event, *, max_age):
    if event is None:
        return {"status": "unknown", "completed_at": None}
    age = timezone.now() - event.completed_at
    if event.status == InstallationBackupEvent.Status.FAILURE:
        result_status = "failed"
    elif age > max_age:
        result_status = "stale"
    else:
        result_status = "current"
    return {"status": result_status, "completed_at": event.completed_at}


def get_backup_status():
    backup_limit = timedelta(hours=settings.BUBLLIO_BACKUP_MAX_AGE_HOURS)
    restore_limit = timedelta(days=settings.BUBLLIO_RESTORE_TEST_MAX_AGE_DAYS)
    last_backup = InstallationBackupEvent.objects.filter(kind=InstallationBackupEvent.Kind.BACKUP).first()
    last_restore_test = InstallationBackupEvent.objects.filter(
        kind=InstallationBackupEvent.Kind.RESTORE_TEST
    ).first()
    return {
        "backup": _result(last_backup, max_age=backup_limit),
        "restore_test": _result(last_restore_test, max_age=restore_limit),
        "backup_max_age_hours": settings.BUBLLIO_BACKUP_MAX_AGE_HOURS,
        "restore_test_max_age_days": settings.BUBLLIO_RESTORE_TEST_MAX_AGE_DAYS,
    }
