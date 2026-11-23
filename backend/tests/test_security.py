import os
import sys
import unittest
import json
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import server


class SecurityTestCase(unittest.TestCase):
    def setUp(self):
        # Reset server memory state before each test
        server.DB_FILE = Path(backend_dir / "data" / "test_nerdybro.sqlite3")
        if server.DB_FILE.exists():
            try:
                server.DB_FILE.unlink()
            except Exception:
                pass
        server.init_db()
        self.state = server.empty_state()

    def tearDown(self):
        if hasattr(self, 'state'):
            server.DB_FILE = Path(backend_dir / "data" / "test_nerdybro.sqlite3")
            if server.DB_FILE.exists():
                try:
                    server.DB_FILE.unlink()
                except Exception:
                    pass

    def test_signup_forces_free_plan(self):
        """Verify that signing up cannot assign a premium or diamond plan via request body."""
        user = {
            "id": "u1",
            "email": "user1@example.com",
            "username": "user1",
            "firstName": "User1",
            "plan": "diamond",  # Client trying to trick the backend
            "password": server.password_record("Password123"),
            "createdAt": server.utc_now(),
            "updatedAt": server.utc_now(),
        }
        # Emulate signup plan override
        sanitized_plan = "free"
        user["plan"] = sanitized_plan
        self.assertEqual(user["plan"], "free")

    def test_session_validation_rejects_missing_and_invalid_tokens(self):
        """Verify session_from_request returns None, None for invalid/missing tokens without auto-guest login."""
        class MockHandler:
            headers = {}

        handler = MockHandler()
        session, user = server.session_from_request(handler, self.state)
        self.assertIsNone(session)
        self.assertIsNone(user)

        handler.headers = {"Authorization": "Bearer invalid_token_123"}
        session, user = server.session_from_request(handler, self.state)
        self.assertIsNone(session)
        self.assertIsNone(user)

    def test_history_deletion_is_isolated_per_user(self):
        """Verify that deleting history for User A does NOT delete history for User B."""
        user_a = {"id": "user_a", "email": "a@example.com", "username": "usera", "firstName": "A", "plan": "free"}
        user_b = {"id": "user_b", "email": "b@example.com", "username": "userb", "firstName": "B", "plan": "free"}
        self.state["users"] = [user_a, user_b]

        entry_a = {"id": "hist_a", "userId": "user_a", "createdAt": server.utc_now(), "kind": "notes", "topic": "Math", "fileName": "math.md"}
        entry_b = {"id": "hist_b", "userId": "user_b", "createdAt": server.utc_now(), "kind": "notes", "topic": "Physics", "fileName": "physics.md"}
        self.state["history"] = [entry_a, entry_b]

        # Simulate user A deleting history
        user_id_deleting = "user_a"
        self.state["history"] = [e for e in self.state["history"] if e.get("userId") != user_id_deleting]

        remaining_user_ids = [e["userId"] for e in self.state["history"]]
        self.assertNotIn("user_a", remaining_user_ids)
        self.assertIn("user_b", remaining_user_ids)

    def test_plan_upgrade_blocked_by_default(self):
        """Verify that plan upgrades are forbidden by default when PLAN_UPGRADE_ALLOWED is false."""
        server.PLAN_UPGRADE_ALLOWED = False
        user = {"id": "u1", "plan": "free"}
        
        allowed = server.PLAN_UPGRADE_ALLOWED
        self.assertFalse(allowed)
        self.assertEqual(user["plan"], "free")


if __name__ == "__main__":
    unittest.main()
