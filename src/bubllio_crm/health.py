from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.http import JsonResponse
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_GET

from bubllio_crm.release import current_commit_sha, current_version


@require_GET
@never_cache
def health_check(request):
    """Return readiness only when Django can reach its configured database."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        migration_executor = MigrationExecutor(connection)
        if migration_executor.migration_plan(migration_executor.loader.graph.leaf_nodes()):
            return JsonResponse({"status": "unavailable"}, status=503)
    except Exception:
        return JsonResponse({"status": "unavailable"}, status=503)

    version = current_version()
    return JsonResponse(
        {
            "status": "ok",
            "version": version,
            "commit_sha": current_commit_sha(),
            "schema": f"bubllio-crm-{version}",
        }
    )
