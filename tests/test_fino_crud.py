import unittest
from backend.app.domain.models import TransactionCreate, TransactionUpdate
from backend.app.repository.db import (
    create_transaction,
    get_transactions,
    get_transaction_by_id,
    update_transaction,
    delete_transaction,
    get_financial_summary
)


class TestFinoFinancialCRUD(unittest.TestCase):
    def test_create_and_read_transaction(self):
        """Verify transaction creation and retrieval."""
        new_tx = TransactionCreate(
            title="Kopi Espresso Double Shot",
            amount=38000.0,
            category="Makanan",
            type="expense",
            date="2026-09-18",
            notes="Testing creation"
        )
        created = create_transaction(new_tx)
        self.assertIsNotNone(created.id)
        self.assertEqual(created.title, "Kopi Espresso Double Shot")
        self.assertEqual(created.amount, 38000.0)

        fetched = get_transaction_by_id(created.id)
        self.assertIsNotNone(fetched)
        self.assertEqual(fetched.id, created.id)

    def test_update_transaction(self):
        """Verify updating existing transaction nominal and notes."""
        new_tx = TransactionCreate(
            title="Bensin Shell V-Power",
            amount=150000.0,
            category="Transportasi",
            type="expense",
            date="2026-09-18",
            notes="Sebelum diedit"
        )
        created = create_transaction(new_tx)

        update_payload = TransactionUpdate(amount=165000.0, notes="Setelah penyesuaian harga")
        updated = update_transaction(created.id, update_payload)

        self.assertIsNotNone(updated)
        self.assertEqual(updated.amount, 165000.0)
        self.assertEqual(updated.notes, "Setelah penyesuaian harga")

    def test_delete_transaction(self):
        """Verify deleting transaction."""
        new_tx = TransactionCreate(
            title="Transaksi Sementara",
            amount=25000.0,
            category="Hiburan",
            type="expense",
            date="2026-09-18"
        )
        created = create_transaction(new_tx)
        self.assertTrue(delete_transaction(created.id))
        self.assertIsNone(get_transaction_by_id(created.id))

    def test_financial_summary_aggregations(self):
        """Verify financial summary aggregates total income, expense, and positive balance."""
        summary = get_financial_summary()
        self.assertGreater(summary.total_income, 0)
        self.assertGreater(summary.total_expense, 0)
        self.assertEqual(summary.total_balance, summary.total_income - summary.total_expense)
        self.assertGreaterEqual(len(summary.category_breakdown), 5)
        self.assertEqual(len(summary.daily_expenses), 10)


if __name__ == "__main__":
    unittest.main()
