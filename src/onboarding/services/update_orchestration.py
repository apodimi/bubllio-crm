import re

from django.db import IntegrityError, transaction
from django.utils import timezone

from bubllio_crm.release import current_version
from onboarding.models import InstallationUpdateEvent, InstallationUpdateRun
from onboarding.services.update_agent import (
    AGENT_JOB_ID_PATTERN,
    UpdateAgentError,
    UpdateAgentRejected,
    UpdateAgentUnavailable,
    agent_is_configured,
    get_agent_status,
    get_agent_update,
    request_preflight,
    start_agent_update,
)
from onboarding.services.update_checker import get_update_status


STABLE_VERSION_PATTERN = re.compile(r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$")
SAFE_KEY_PATTERN = re.compile(r"^[a-z0-9][a-z0-9_.-]{0,63}$")
IDEMPOTENCY_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{7,127}$")
TERMINAL_STATUSES = {
    InstallationUpdateRun.Status.SUCCEEDED,
    InstallationUpdateRun.Status.FAILED,
    InstallationUpdateRun.Status.ROLLED_BACK,
    InstallationUpdateRun.Status.MANUAL_INTERVENTION,
}
FAILURE_MESSAGES = {
    "agent_rejected": "The update agent rejected the request.",
    "agent_unavailable": "The update agent is unavailable. Check its connection and try again.",
    "preflight_failed": "Update preflight checks did not pass.",
    "maintenance_required": "This release requires a supervised maintenance window.",
    "update_failed": "The update did not complete. Review the update agent logs.",
    "verification_failed": "The updated installation did not pass verification.",
    "rollback_failed": "Automatic rollback did not complete. Operator action is required.",
}


def validate_target_version(value):
    if not isinstance(value, str) or STABLE_VERSION_PATTERN.fullmatch(value) is None:
        raise ValueError("Enter an exact stable version such as 1.2.3.")
    return value


def validate_upgrade_target(value):
    target = validate_target_version(value)
    installed = current_version()
    if STABLE_VERSION_PATTERN.fullmatch(installed) and tuple(map(int, target.split("."))) <= tuple(
        map(int, installed.split("."))
    ):
        raise ValueError("The target version must be newer than the installed version.")
    return target


def validate_idempotency_key(value):
    if not isinstance(value, str) or IDEMPOTENCY_PATTERN.fullmatch(value) is None:
        raise ValueError("Provide a valid Idempotency-Key header.")
    return value


def _clean_text(value, maximum):
    if not isinstance(value, str):
        return ""
    return " ".join(value.split())[:maximum]


def _failure_message(code):
    return FAILURE_MESSAGES.get(code, FAILURE_MESSAGES["update_failed"])


def record_event(run, action, *, actor=None, details=None):
    return InstallationUpdateEvent.objects.create(
        run=run,
        actor=actor,
        action=action,
        details=details or {},
    )


def _safe_check(value):
    if not isinstance(value, dict):
        return None
    key = value.get("key")
    status = value.get("status")
    if not isinstance(key, str) or SAFE_KEY_PATTERN.fullmatch(key) is None:
        return None
    if status not in {"pass", "fail", "warning"}:
        return None
    return {
        "key": key,
        "status": status,
        "label": _clean_text(value.get("label"), 120) or key.replace("_", " ").title(),
        "guidance": _clean_text(value.get("guidance"), 240),
    }


def sanitize_preflight(payload, target_version):
    if payload.get("target_version") not in {None, target_version}:
        raise UpdateAgentRejected
    policy = payload.get("migration_policy", "")
    if policy not in InstallationUpdateRun.MigrationPolicy.values:
        policy = ""
    checks = []
    for raw_check in payload.get("checks", [])[:32] if isinstance(payload.get("checks"), list) else []:
        check = _safe_check(raw_check)
        if check:
            checks.append(check)
    blockers = payload.get("blockers") if isinstance(payload.get("blockers"), list) else []
    for blocker in blockers[:32]:
        if not isinstance(blocker, dict):
            continue
        code = blocker.get("code")
        if not isinstance(code, str) or SAFE_KEY_PATTERN.fullmatch(code) is None:
            code = "preflight_blocker"
        checks.append(
            {
                "key": code,
                "status": "fail",
                "label": code.replace("_", " ").title(),
                "guidance": _clean_text(blocker.get("message"), 240),
            }
        )
    manifest = payload.get("manifest") if isinstance(payload.get("manifest"), dict) else payload
    safe_manifest = {
        "version": target_version,
        "commit_sha": _clean_text(manifest.get("commit_sha"), 64) or None,
        "release_url": _clean_text(manifest.get("release_url"), 240) or None,
        "expected_schema": _clean_text(manifest.get("expected_schema"), 120) or None,
    }
    eligible = payload.get("eligible") is True and bool(policy)
    if any(check["status"] == "fail" for check in checks):
        eligible = False
    return {
        "target_version": target_version,
        "eligible": eligible,
        "checks": checks,
        "migration_policy": policy or None,
        "manifest": safe_manifest,
    }


def run_preflight(target_version):
    target_version = validate_upgrade_target(target_version)
    if not agent_is_configured():
        raise UpdateAgentUnavailable
    return sanitize_preflight(request_preflight(target_version), target_version)


def _set_failure(run, code, status=InstallationUpdateRun.Status.FAILED):
    run.status = status
    run.failure_code = code
    run.failure_message = _failure_message(code)
    run.finished_at = timezone.now()
    run.save(update_fields=("status", "failure_code", "failure_message", "finished_at", "updated_at"))
    record_event(run, status, details={"code": code})
    return run


def _resume_unacknowledged_run(run):
    if run.agent_job_id or run.status not in InstallationUpdateRun.ACTIVE_STATUSES:
        return run
    try:
        accepted = start_agent_update(run.target_version, run.idempotency_key)
        agent_job_id = accepted.get("id")
        if not isinstance(agent_job_id, str) or AGENT_JOB_ID_PATTERN.fullmatch(agent_job_id) is None:
            raise UpdateAgentUnavailable
    except UpdateAgentRejected:
        return _set_failure(run, "agent_rejected")
    except UpdateAgentUnavailable:
        return run
    run.agent_job_id = agent_job_id
    run.started_at = run.started_at or timezone.now()
    run.phase_label = "Update accepted"
    run.save(update_fields=("agent_job_id", "started_at", "phase_label", "updated_at"))
    record_event(run, "agent_reconnected", details={"agent_job_id": agent_job_id})
    try:
        return sync_update_run(run)
    except UpdateAgentUnavailable:
        return run


def create_update_run(*, target_version, idempotency_key, actor):
    target_version = validate_upgrade_target(target_version)
    idempotency_key = validate_idempotency_key(idempotency_key)
    existing = InstallationUpdateRun.objects.filter(idempotency_key=idempotency_key).first()
    if existing:
        if existing.target_version != target_version:
            raise ValueError("This Idempotency-Key was already used for another target version.")
        return _resume_unacknowledged_run(existing), False

    try:
        with transaction.atomic():
            run = InstallationUpdateRun.objects.create(
                target_version=target_version,
                idempotency_key=idempotency_key,
                requested_by=actor,
            )
            record_event(run, "requested", actor=actor, details={"target_version": target_version})
    except IntegrityError:
        replay = InstallationUpdateRun.objects.filter(idempotency_key=idempotency_key).first()
        if replay and replay.target_version == target_version:
            return _resume_unacknowledged_run(replay), False
        raise

    try:
        run.status = InstallationUpdateRun.Status.PREFLIGHT
        run.phase_label = "Running preflight checks"
        run.save(update_fields=("status", "phase_label", "updated_at"))
        record_event(run, "preflight_started")
        preflight = run_preflight(target_version)
    except UpdateAgentRejected:
        return _set_failure(run, "agent_rejected"), True
    except UpdateAgentUnavailable:
        return _set_failure(run, "agent_unavailable"), True

    run.migration_policy = preflight["migration_policy"] or ""
    if run.migration_policy != InstallationUpdateRun.MigrationPolicy.ONLINE_SAFE:
        run.save(update_fields=("migration_policy", "updated_at"))
        return _set_failure(
            run,
            "maintenance_required",
            InstallationUpdateRun.Status.MANUAL_INTERVENTION,
        ), True
    if not preflight["eligible"]:
        run.save(update_fields=("migration_policy", "updated_at"))
        return _set_failure(run, "preflight_failed"), True

    try:
        accepted = start_agent_update(target_version, idempotency_key)
        agent_job_id = accepted.get("id")
        if not isinstance(agent_job_id, str) or AGENT_JOB_ID_PATTERN.fullmatch(agent_job_id) is None:
            raise UpdateAgentUnavailable
    except UpdateAgentRejected:
        return _set_failure(run, "agent_rejected"), True
    except UpdateAgentUnavailable:
        return _set_failure(run, "agent_unavailable"), True

    run.agent_job_id = agent_job_id
    run.started_at = timezone.now()
    run.phase_label = "Update accepted"
    run.save(update_fields=("agent_job_id", "started_at", "phase_label", "migration_policy", "updated_at"))
    record_event(run, "agent_accepted", details={"agent_job_id": agent_job_id})
    try:
        run = sync_update_run(run)
    except UpdateAgentUnavailable:
        # Acceptance is durable at both sides. A failed first poll must not turn
        # an idempotent, in-progress update into a retryable start request.
        pass
    return run, True


def sync_update_run(run):
    if not run.agent_job_id or run.status in TERMINAL_STATUSES:
        return run
    payload = get_agent_update(run.agent_job_id)
    status = payload.get("status", payload.get("state"))
    if isinstance(status, str):
        status = status.lower()
    if status not in InstallationUpdateRun.Status.values or status == InstallationUpdateRun.Status.REQUESTED:
        raise UpdateAgentUnavailable
    if payload.get("target_version") not in {None, run.target_version}:
        raise UpdateAgentUnavailable
    progress = payload.get("progress", run.progress)
    if not isinstance(progress, int) or isinstance(progress, bool) or not 0 <= progress <= 100:
        progress = run.progress
    prior_status = run.status
    run.status = status
    run.progress = progress
    run.phase_label = _clean_text(payload.get("phase_label", payload.get("phase")), 120)
    migration_policy = payload.get("migration_policy")
    if migration_policy in InstallationUpdateRun.MigrationPolicy.values:
        run.migration_policy = migration_policy
    if status in TERMINAL_STATUSES:
        run.finished_at = timezone.now()
    if status in {
        InstallationUpdateRun.Status.FAILED,
        InstallationUpdateRun.Status.MANUAL_INTERVENTION,
    }:
        error = payload.get("error") if isinstance(payload.get("error"), dict) else {}
        code = payload.get("failure_code", error.get("code"))
        run.failure_code = code if code in FAILURE_MESSAGES else "update_failed"
        run.failure_message = _failure_message(run.failure_code)
    run.save()
    if prior_status != status:
        record_event(run, status, details={"progress": progress})
    return run


def get_update_center_status():
    release = get_update_status()
    latest = InstallationUpdateRun.objects.first()
    active = InstallationUpdateRun.objects.filter(status__in=InstallationUpdateRun.ACTIVE_STATUSES).first()
    connected = False
    if agent_is_configured():
        try:
            agent_status = get_agent_status()
            connected = agent_status.get("status") in {"ready", "ok"} or isinstance(
                agent_status.get("agent_version"), str
            )
            if active and active.agent_job_id:
                active = sync_update_run(active)
                latest = active
        except UpdateAgentError:
            connected = False
    return {
        **release,
        "enabled": agent_is_configured(),
        "connected": connected,
        "active_run": active,
        "latest_run": latest,
        "preflight": None,
    }
