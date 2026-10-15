import os
from unittest import TestCase
from unittest.mock import patch

from bubllio_crm.release import current_commit_sha, current_version


class ReleaseIdentityTests(TestCase):
    @patch.dict(os.environ, {"BUBLLIO_RELEASE_VERSION": "1.2.3"}, clear=False)
    def test_version_prefers_valid_build_metadata(self):
        self.assertEqual(current_version(), "1.2.3")

    @patch.dict(os.environ, {"BUBLLIO_RELEASE_VERSION": "latest"}, clear=False)
    def test_invalid_build_version_is_not_trusted(self):
        self.assertEqual(current_version(), "development")

    @patch.dict(
        os.environ,
        {"BUBLLIO_RELEASE_SHA": "A" * 40},
        clear=False,
    )
    def test_commit_sha_is_normalized(self):
        self.assertEqual(current_commit_sha(), "a" * 40)

    @patch.dict(os.environ, {"BUBLLIO_RELEASE_SHA": "main"}, clear=False)
    def test_symbolic_ref_is_not_reported_as_release_identity(self):
        self.assertEqual(current_commit_sha(), "unknown")
