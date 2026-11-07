"""Close legacy credential and setup routes in Core-required installations."""

from django.conf import settings
from django.http import HttpResponseNotFound

from .suite_auth import SUITE_GLOBAL_PATHS, TENANT_PATH


class CoreRequiredMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if settings.CORE_REQUIRED and request.path != "/health/":
            allowed = request.path in SUITE_GLOBAL_PATHS or TENANT_PATH.match(request.path)
            if not allowed:
                return HttpResponseNotFound()
        return self.get_response(request)
