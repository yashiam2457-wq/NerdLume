import os
import sys
import unittest
import json
from pathlib import Path

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import server


class ApiContractTestCase(unittest.TestCase):
    def setUp(self):
        server.DB_FILE = Path(backend_dir / "data" / "test_contract.sqlite3")
        if server.DB_FILE.exists():
            try:
                server.DB_FILE.unlink()
            except Exception:
                pass
        server.init_db()
        self.state = server.empty_state()

    def tearDown(self):
        server.DB_FILE = Path(backend_dir / "data" / "test_contract.sqlite3")
        if server.DB_FILE.exists():
            try:
                server.DB_FILE.unlink()
            except Exception:
                pass

    def test_public_user_sanitization(self):
        """Verify public_user removes password records and sensitive fields."""
        raw_user = {
            "id": "123",
            "email": "test@example.com",
            "username": "testuser",
            "password": {"hash": "secret", "salt": "123"},
            "plan": "free",
            "firstName": "Test",
            "lastName": "User",
        }
        pub = server.public_user(raw_user)
        self.assertNotIn("password", pub)
        self.assertEqual(pub["id"], "123")
        self.assertEqual(pub["email"], "test@example.com")
        self.assertEqual(pub["plan"], "free")

    def test_plan_config_structure(self):
        """Verify PLAN_CONFIG schema and completeness."""
        self.assertIn("free", server.PLAN_CONFIG)
        self.assertIn("free-premium", server.PLAN_CONFIG)
        self.assertIn("diamond", server.PLAN_CONFIG)
        self.assertIn("weekly_limits", server.PLAN_CONFIG["free"])
    def test_session_from_request_query_param(self):
        """Verify session_from_request extracts token from URL query parameters."""
        token = "test_token_12345"
        self.state["sessions"].append({
            "token": token,
            "userId": "u123",
            "createdAt": server.utc_now(),
            "expiresAt": "2099-01-01T00:00:00Z"
        })
        self.state["users"].append({
            "id": "u123",
            "email": "user@example.com",
            "username": "user123",
            "plan": "free"
        })

        class MockHandler:
            headers = {}
            path = f"/api/history/h123/download?token={token}"

        session, user = server.session_from_request(MockHandler(), self.state)
        self.assertIsNotNone(session)
        self.assertIsNotNone(user)
        self.assertEqual(user["id"], "u123")


if __name__ == "__main__":
    unittest.main()
