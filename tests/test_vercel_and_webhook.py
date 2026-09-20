import unittest
from fastapi.testclient import TestClient
from api.index import app


class TestVercelAndWebhook(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_vercel_entrypoint_app_instance(self):
        """Verify api.index exports a valid FastAPI application."""
        self.assertIsNotNone(app)
        self.assertEqual(app.title, "RIED Financial Studio // Smart Personal Finance & Telegram Bot API")

    def test_health_check_endpoint(self):
        """Verify /api/health responds with healthy status code 200."""
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data.get("status"), "healthy")

    def test_telegram_status_endpoint(self):
        """Verify /api/telegram/status endpoint returns valid diagnostics."""
        response = self.client.get("/api/telegram/status")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("bot_username", data)
        self.assertIn("updates_processed", data)

    def test_telegram_webhook_receiver(self):
        """Verify POST /api/telegram/webhook receives and processes incoming update."""
        fake_update = {
            "update_id": 999999,
            "message": {
                "message_id": 1,
                "date": 1726700000,
                "chat": {"id": 123456789, "type": "private"},
                "from": {"id": 123456789, "first_name": "Tester", "is_bot": False},
                "text": "/help"
            }
        }
        response = self.client.post("/api/telegram/webhook", json=fake_update)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json().get("status"), "ok")
