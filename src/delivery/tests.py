from unittest.mock import patch

from django.test import TestCase, override_settings

from .models import OutboxMessage
from .services import queue_outbox_message
from .tasks import deliver_outbox_message


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class OutboxTests(TestCase):
    def test_message_is_published_only_after_commit(self):
        with patch("delivery.services.publish_outbox_message") as publish:
            with self.captureOnCommitCallbacks(execute=True):
                message = queue_outbox_message(
                    kind=OutboxMessage.Kind.PASSWORD_RESET,
                    payload={"user_id": 123},
                )
            publish.assert_called_once_with(message.id)

    @patch("delivery.tasks._send")
    def test_delivery_is_idempotent_after_success(self, send):
        message = OutboxMessage.objects.create(
            kind=OutboxMessage.Kind.PASSWORD_RESET,
            payload={"user_id": 123},
            encrypted_data="encrypted-secret",
        )
        deliver_outbox_message.apply(args=(str(message.id),)).get()
        deliver_outbox_message.apply(args=(str(message.id),)).get()
        message.refresh_from_db()
        self.assertEqual(message.status, OutboxMessage.Status.SENT)
        self.assertEqual(message.attempts, 1)
        self.assertEqual(message.encrypted_data, "")
        send.assert_called_once()

    @patch("delivery.tasks._send", side_effect=RuntimeError("SMTP unavailable"))
    def test_delivery_stops_after_the_sixth_attempt(self, send):
        message = OutboxMessage.objects.create(
            kind=OutboxMessage.Kind.PASSWORD_RESET,
            payload={"user_id": 123},
            attempts=5,
        )

        with self.assertRaises(RuntimeError):
            deliver_outbox_message.apply(args=(str(message.id),)).get()

        message.refresh_from_db()
        self.assertEqual(message.status, OutboxMessage.Status.FAILED)
        self.assertEqual(message.attempts, 6)
        self.assertEqual(message.last_error, "SMTP unavailable")
        send.assert_called_once()
