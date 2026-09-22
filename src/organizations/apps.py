from django.apps import AppConfig


class OrganizationsConfig(AppConfig):
    name = 'organizations'

    def ready(self):
        from . import signals  # noqa: F401
