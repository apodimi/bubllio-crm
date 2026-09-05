from zoneinfo import available_timezones

from django.conf import settings


def timezone_choices():
    """Return the IANA timezone identifiers available to the runtime."""
    values = sorted(available_timezones())
    if "UTC" in values:
        values.remove("UTC")
    values.insert(0, "UTC")
    return [(value, value) for value in values]


def locale_choices():
    """Return the locales configured for this Django installation."""
    choices = list(settings.LANGUAGES)
    configured = settings.LANGUAGE_CODE
    if not any(value == configured for value, _ in choices):
        language_name = dict(choices).get(configured.split("-", 1)[0], configured)
        choices.append((configured, language_name))
    return sorted(choices, key=lambda choice: choice[1].casefold())
