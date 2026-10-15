from unittest.mock import patch

from django.test import TestCase, override_settings

from .models import OutboxMessage
from .services import queue_outbox_message
from .tasks import deliver_outbox_message, dispatch_pending_outbox


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class OutboxTests(TestCase):
    @patch("delivery.tasks.deliver_outbox_message.delay")
    def test_dispatcher_skips_legacy_automation_without_starving_live_messages(self, delay):
        OutboxMessage.objects.create(
            kind=OutboxMessage.Kind.AUTOMATION_RUN,
            payload={"run_id": "legacy"},
        )
        live = OutboxMessage.objects.create(
            kind=OutboxMessage.Kind.PASSWORD_RESET,
            payload={"user_id": 123},
        )

        dispatch_pending_outbox()

        delay.assert_called_once_with(str(live.id))

    @patch("delivery.tasks._send")
    def test_legacy_automation_message_is_preserved_and_not_dispatched(self, send):
        message = OutboxMessage.objects.create(
            kind=OutboxMessage.Kind.AUTOMATION_RUN,
            payload={"run_id": "legacy"},
        )

        deliver_outbox_message.apply(args=(str(message.id),)).get()

        message.refresh_from_db()
        self.assertEqual(message.status, OutboxMessage.Status.QUEUED)
        self.assertEqual(message.attempts, 0)
        send.assert_not_called()

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
