from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from onboarding.services.business_import import (
    BusinessImportError,
    import_business_transfer,
    load_business_transfer,
)


class Command(BaseCommand):
    help = "Validate or restore a CRM business transfer into an empty installation."

    def add_arguments(self, parser):
        parser.add_argument("path", help="Path to the downloaded CRM transfer JSON file")
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Write the validated records; the default only checks the file",
        )
        parser.add_argument(
            "--trial-admin",
            help="Existing setup administrator who will own imported team workspaces",
        )

    def handle(self, *args, **options):
        try:
            with open(options["path"], encoding="utf-8") as input_file:
                transfer = load_business_transfer(input_file)
            if options["apply"]:
                if not options["trial_admin"]:
                    raise BusinessImportError("--trial-admin is required with --apply")
                administrator = get_user_model().objects.filter(
                    username=options["trial_admin"]
                ).first()
                if administrator is None:
                    raise BusinessImportError("The trial administrator does not exist")
                counts = import_business_transfer(transfer, trial_admin=administrator)
                self.stdout.write(self.style.SUCCESS(f"Imported CRM business data: {counts}"))
            else:
                counts = {name: len(rows) for name, rows in transfer["datasets"].items()}
                self.stdout.write(self.style.SUCCESS(f"Transfer validated: {counts}"))
        except (OSError, BusinessImportError) as error:
            raise CommandError(str(error)) from error
