from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from organizations.models import InstallationBackupEvent


class Command(BaseCommand):
    help = "Record the result of an externally managed installation backup or restore test."

    def add_arguments(self, parser):
        parser.add_argument("--kind", required=True, choices=InstallationBackupEvent.Kind.values)
        parser.add_argument("--status", required=True, choices=InstallationBackupEvent.Status.values)

    def handle(self, *args, **options):
        try:
            event = InstallationBackupEvent.objects.create(
                kind=options["kind"],
                status=options["status"],
                completed_at=timezone.now(),
            )
        except Exception as error:
            raise CommandError("Could not record the backup event.") from error
        self.stdout.write(
            self.style.SUCCESS(
                f"Recorded {event.get_kind_display().lower()} {event.status} at "
                f"{event.completed_at.isoformat()}"
            )
        )
