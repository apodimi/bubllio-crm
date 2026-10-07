from django.core import mail
from django.test import SimpleTestCase, override_settings

from organizations.services.email_service import (
    render_transactional_email,
    send_password_reset_email,
)


class TransactionalEmailTemplateTests(SimpleTestCase):
    def test_renderer_builds_branded_html_and_plain_text_fallback(self):
        text_body, html_body = render_transactional_email(
            subject="Join Sales & Support",
            preheader="A secure invitation",
            eyebrow="Workspace invitation",
            heading="Welcome <Owner>",
            message="Join Sales & Support to continue.",
            notice="This link expires in 7 days.",
            action_url="https://crm.example.com/invitations/token?source=email&safe=1",
            action_label="Accept invitation",
        )

        self.assertIn("Bubllio", html_body)
        self.assertIn("#005bef", html_body)
        self.assertIn("Welcome &lt;Owner&gt;", html_body)
        self.assertIn("Sales &amp; Support", html_body)
        self.assertIn("Accept invitation", html_body)
        self.assertIn(
            "https://crm.example.com/invitations/token?source=email&amp;safe=1",
            html_body,
        )
        self.assertIn("Accept invitation:", text_body)
        self.assertIn("https://crm.example.com/invitations/token?source=email&safe=1", text_body)

    def test_renderer_omits_action_when_url_is_empty(self):
        text_body, html_body = render_transactional_email(
            subject="Connection test",
            preheader="Connection test",
            eyebrow="Email setup",
            heading="Your email connection works",
            message="The SMTP server accepted this message.",
            notice="Inbox delivery still depends on your provider.",
        )

        self.assertNotIn("copy and paste this address", html_body)
        self.assertNotIn("href=\"\"", html_body)
        self.assertNotIn("Open:", text_body)

    @override_settings(
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
        DEFAULT_FROM_EMAIL="Bubllio CRM <no-reply@example.com>",
    )
    def test_password_reset_uses_multipart_email_without_saved_account(self):
        send_password_reset_email(
            account=None,
            recipient="person@example.com",
            reset_url="https://crm.example.com/reset-password/uid/token",
        )

        self.assertEqual(len(mail.outbox), 1)
        message = mail.outbox[0]
        self.assertEqual(message.subject, "Reset your Bubllio CRM password")
        self.assertEqual(message.from_email, "Bubllio CRM <no-reply@example.com>")
        self.assertEqual(message.to, ["person@example.com"])
        self.assertIn("Reset password:", message.body)
        self.assertEqual(len(message.alternatives), 1)
        self.assertEqual(message.alternatives[0].mimetype, "text/html")
        self.assertIn("Reset password", message.alternatives[0].content)
