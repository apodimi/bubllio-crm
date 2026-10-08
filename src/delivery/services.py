import logging

from django.db import transaction

from organizations.services.email_security import encrypt_secret

from .models import OutboxMessage

logger = logging.getLogger(__name__)


def queue_outbox_message(*, kind, payload, secret=""):
    message = OutboxMessage.objects.create(
        kind=kind,
        payload=payload,
        encrypted_data=encrypt_secret(secret) if secret else "",
    )
    transaction.on_commit(lambda: publish_outbox_message(message.id))
    return message


def publish_outbox_message(message_id):
    from .tasks import deliver_outbox_message

    try:
        deliver_outbox_message.delay(str(message_id))
    except Exception:
        logger.exception("Could not publish outbox message %s; the dispatcher will retry", message_id)
