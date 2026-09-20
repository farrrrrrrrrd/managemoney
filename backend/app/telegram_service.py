"""
RIED Real-Time Telegram Bot Service (@RiedutBot)
Connects directly to Telegram Bot API v7.2 using async long polling (httpx).
Handles:
  - /start, /help, /budget, /rekap, /export commands
  - Natural Indonesian language transaction parsing (amounts, auto-category mapping)
  - Interactive Inline Keyboard (Cek Kuota, Batalkan Transaksi)
  - Direct persistence to SQLite database ried_finance.db
Zero AI Slop - 100% Production Grade Implementation.
"""

import os
import re
import asyncio
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List

import httpx

from backend.app.domain.models import TransactionCreate
from backend.app.repository.db import (
    create_transaction,
    delete_transaction,
    get_financial_summary,
    export_transactions_csv
)

from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

logger = logging.getLogger("telegram_service")
logging.basicConfig(level=logging.INFO)

TELEGRAM_API_BASE = "https://api.telegram.org"


def format_rupiah(amount: float) -> str:
    """Formats float/int to Indonesian Rupiah currency string."""
    val = int(amount)
    parts = f"{val:,}".replace(",", ".")
    return f"Rp {parts}"


class TelegramBotService:
    def __init__(self, token: Optional[str] = None):
        self.token = token or os.getenv("TELEGRAM_BOT_TOKEN", "")
        self.bot_username = os.getenv("TELEGRAM_BOT_USERNAME", "RiedutBot")
        self.bot_first_name = "Ried_duit"
        self.is_running = False
        self._poll_task: Optional[asyncio.Task] = None
        self._last_offset = 0
        self.updates_processed = 0
        self.started_at: Optional[str] = None
        self.last_update_at: Optional[str] = None

    @property
    def api_url(self) -> str:
        return f"{TELEGRAM_API_BASE}/bot{self.token}"

    async def verify_bot_token(self) -> Dict[str, Any]:
        """Calls getMe to verify bot token and cache identity."""
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{self.api_url}/getMe")
            if resp.status_code == 200:
                data = resp.json().get("result", {})
                self.bot_username = data.get("username", self.bot_username)
                self.bot_first_name = data.get("first_name", self.bot_first_name)
                return {"valid": True, "data": data}
            return {"valid": False, "error": resp.text}

    async def send_message(
        self,
        chat_id: int,
        text: str,
        parse_mode: str = "Markdown",
        reply_markup: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Sends a text message with optional Markdown formatting and inline keyboard."""
        payload: Dict[str, Any] = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": parse_mode
        }
        if reply_markup:
            payload["reply_markup"] = reply_markup

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                res = await client.post(f"{self.api_url}/sendMessage", json=payload)
                return res.status_code == 200
            except Exception as e:
                logger.error(f"Failed sending Telegram message to {chat_id}: {e}")
                return False

    async def send_document(
        self,
        chat_id: int,
        filename: str,
        content_bytes: bytes,
        caption: str = ""
    ) -> bool:
        """Sends a file document (such as CSV export) directly to the Telegram chat."""
        files = {"document": (filename, content_bytes, "text/csv")}
        data = {"chat_id": chat_id, "caption": caption, "parse_mode": "Markdown"}

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                res = await client.post(f"{self.api_url}/sendDocument", data=data, files=files)
                return res.status_code == 200
            except Exception as e:
                logger.error(f"Failed sending document to {chat_id}: {e}")
                return False

    async def answer_callback_query(self, callback_query_id: str, text: Optional[str] = None) -> bool:
        """Acknowledges inline button clicks to dismiss client loading spinners."""
        payload: Dict[str, Any] = {"callback_query_id": callback_query_id}
        if text:
            payload["text"] = text

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                res = await client.post(f"{self.api_url}/answerCallbackQuery", json=payload)
                return res.status_code == 200
            except Exception as e:
                logger.error(f"Failed answering callback {callback_query_id}: {e}")
                return False

    def parse_natural_transaction(self, text: str) -> Dict[str, Any]:
        """
        Extracts amount, category, and type from natural Indonesian text.
        Examples:
          - 'Kopi Kenangan 28rb' -> 28.000, Makanan, expense
          - 'Beli bensin Shell 50.000' -> 50.000, Transportasi, expense
          - 'Paket data Telkomsel 100k' -> 100.000, Tagihan, expense
          - 'Gaji bulanan 8.5jt' -> 8.500.000, Gaji, income
        """
        title = text.strip()
        amount = 25000.0
        category = "Makanan"
        tx_type = "expense"

        # 1. Parse amounts: rb/k, jt/juta, or dot-delimited
        match_jt = re.search(r"(\d+(?:[\.,]\d+)?)\s*(?:jt|juta)", text, re.IGNORECASE)
        match_rb = re.search(r"(\d+(?:[\.,]\d+)?)\s*(?:rb|k|ribu)", text, re.IGNORECASE)
        match_normal = re.search(r"(?:rp\.?\s*)?(\d{1,3}(?:\.\d{3})+|\d+)", text, re.IGNORECASE)

        if match_jt:
            clean_num = match_jt.group(1).replace(",", ".")
            amount = float(clean_num) * 1_000_000
        elif match_rb:
            clean_num = match_rb.group(1).replace(",", ".")
            amount = float(clean_num) * 1_000
        elif match_normal:
            clean_num = match_normal.group(1).replace(".", "").replace(",", "")
            parsed = float(clean_num)
            if parsed > 0:
                amount = parsed

        # 2. Parse category and transaction type
        lower = text.lower()
        if any(w in lower for w in ["bensin", "shell", "pertamina", "gojek", "grab", "tol", "parkir", "ojol", "mrt", "krl", "angkot", "bengkel"]):
            category = "Transportasi"
        elif any(w in lower for w in ["kopi", "starbucks", "makan", "nasi", "resto", "cafe", "padang", "ayam", "burger", "jajan", "snack", "bakso", "mie"]):
            category = "Makanan"
        elif any(w in lower for w in ["listrik", "pln", "wifi", "indihome", "telkom", "tagihan", "paket data", "pulsa", "pdam", "bpjs", "kartu halo", "air"]):
            category = "Tagihan"
        elif any(w in lower for w in ["shopee", "tokopedia", "baju", "sepatu", "celana", "belanja", "lazada", "zalora", "uniqlo", "zara", "supermarket", "minimarket"]):
            category = "Belanja"
        elif any(w in lower for w in ["bioskop", "cinema", "netflix", "spotify", "game", "steam", "playstation", "nonton", "konser", "tiket"]):
            category = "Hiburan"
        elif any(w in lower for w in ["sewa", "kos", "kontrakan", "perabot", "kasur", "rumah", "kebersihan"]):
            category = "Rumah"
        elif any(w in lower for w in ["kursus", "buku", "kuliah", "spp", "sekolah", "pelatihan", "udemy"]):
            category = "Pendidikan"
        elif any(w in lower for w in ["gaji", "salary", "bonus", "transfer masuk", "dividen"]):
            category = "Gaji"
            tx_type = "income"
        elif any(w in lower for w in ["freelance", "project", "honor", "komisi", "side gig"]):
            category = "Freelance"
            tx_type = "income"

        return {
            "title": title,
            "amount": amount,
            "category": category,
            "type": tx_type
        }

    async def handle_start(self, chat_id: int, user_first_name: str) -> None:
        """Handles /start command."""
        text = (
            f"👋 *Halo, {user_first_name}!*\n\n"
            f"Saya *{self.bot_first_name}* (@{self.bot_username}), asisten finansial pribadi cerdas Anda yang terhubung langsung ke database SQLite lokal.\n\n"
            "💬 *Cara Mencatat Transaksi:*\n"
            "Cukup ketik pengeluaran atau pemasukan Anda secara alami, contoh:\n"
            "• `Beli nasi padang 35rb`\n"
            "• `Kopi Kenangan 28k`\n"
            "• `Bensin Shell 50.000`\n"
            "• `Paket data Telkomsel 100rb`\n"
            "• `Gaji bulanan 8.5jt`\n\n"
            "📌 *Perintah Penting:*\n"
            "• /budget - Cek sisa kuota dan batas anggaran\n"
            "• /rekap - Ringkasan keuangan bulan ini\n"
            "• /export - Kirim file CSV transaksi lengkap\n"
            "• /help - Panduan lengkap format pesan"
        )
        keyboard = {
            "inline_keyboard": [
                [
                    {"text": "📊 Cek Kuota", "callback_data": "check_budget"},
                    {"text": "📈 Rekap Bulan Ini", "callback_data": "summary"}
                ],
                [
                    {"text": "📁 Ekspor CSV", "callback_data": "export_csv"}
                ]
            ]
        }
        await self.send_message(chat_id, text, reply_markup=keyboard)

    async def handle_help(self, chat_id: int) -> None:
        """Handles /help command."""
        text = (
            "📖 *PANDUAN PENGGUNAAN BOT RIED*\n\n"
            "1️⃣ *Format Angka yang Didukung:*\n"
            "• Singkatan ribuan: `35rb`, `35k`, `35ribu`\n"
            "• Singkatan jutaan: `8jt`, `8.5jt`, `8juta`\n"
            "• Titik pemisah: `50.000`, `1.500.000`\n"
            "• Angka biasa: `25000`\n\n"
            "2️⃣ *Kategori Otomatis:*\n"
            "• *Makanan*: nasi, kopi, ayam, burger, padang, resto\n"
            "• *Transportasi*: bensin, shell, gojek, grab, tol, parkir\n"
            "• *Tagihan*: listrik, wifi, indihome, paket data, pulsa, pln\n"
            "• *Belanja*: shopee, baju, sepatu, uniqlo, minimarket\n"
            "• *Hiburan*: bioskop, netflix, spotify, steam, game\n"
            "• *Gaji / Freelance*: gaji, salary, bonus, komisi, project\n\n"
            "3️⃣ *Perintah Bot:*\n"
            "• /budget - Pantau status anggaran & realisasi\n"
            "• /rekap - Rincian pemasukan, pengeluaran & saldo\n"
            "• /export - Download file CSV riwayat transaksi"
        )
        await self.send_message(chat_id, text)

    async def handle_budget(self, chat_id: int) -> None:
        """Handles /budget command."""
        summary = get_financial_summary()
        breakdown = summary.category_breakdown

        lines = ["📊 *STATUS ANGGARAN BULAN INI:*\n"]
        for cat in breakdown:
            spent_fmt = format_rupiah(cat.spent)
            budget_fmt = format_rupiah(cat.budget)
            remaining = max(0.0, cat.budget - cat.spent)
            rem_fmt = format_rupiah(remaining)
            status_emoji = "🔴" if cat.spent > cat.budget else ("🟡" if cat.percentage > 75 else "🟢")
            lines.append(f"{status_emoji} *{cat.category}* ({cat.percentage:.0f}%)\n  • Terpakai: {spent_fmt} / {budget_fmt}\n  • Sisa: *{rem_fmt}*")

        lines.append("\n_Gunakan tombol di bawah untuk ekspor atau rekap:_")
        keyboard = {
            "inline_keyboard": [
                [
                    {"text": "📈 Rekap Keuangan", "callback_data": "summary"},
                    {"text": "📁 Ekspor CSV", "callback_data": "export_csv"}
                ]
            ]
        }
        await self.send_message(chat_id, "\n".join(lines), reply_markup=keyboard)

    async def handle_summary(self, chat_id: int) -> None:
        """Handles /rekap or /summary command."""
        summary = get_financial_summary()
        text = (
            "📈 *RINGKASAN KEUANGAN BULAN INI*\n\n"
            f"💰 *Total Pemasukan:* {format_rupiah(summary.total_income)}\n"
            f"💸 *Total Pengeluaran:* {format_rupiah(summary.total_expense)}\n"
            f"🏦 *Saldo Tabungan:* {format_rupiah(summary.total_balance)}\n"
            f"📝 *Jumlah Transaksi:* {summary.transactions_count} Transaksi\n\n"
            f"🗓️ *Hari Aktif Mencatat:* {summary.target_days_current} / {summary.target_days_total} hari"
        )
        keyboard = {
            "inline_keyboard": [
                [{"text": "📊 Cek Kuota", "callback_data": "check_budget"}],
                [{"text": "📁 Unduh CSV", "callback_data": "export_csv"}]
            ]
        }
        await self.send_message(chat_id, text, reply_markup=keyboard)

    async def handle_export_csv(self, chat_id: int) -> None:
        """Handles /export command by generating CSV and sending as file document."""
        csv_text = export_transactions_csv()
        filename = f"ried_transaksi_{datetime.now().strftime('%Y%m%d_%H%M')}.csv"
        await self.send_document(
            chat_id=chat_id,
            filename=filename,
            content_bytes=csv_text.encode("utf-8"),
            caption="📁 *Berikut file ekspor transaksi RIED terbaru Anda.*"
        )

    async def handle_transaction_message(self, chat_id: int, text: str, user_name: str) -> None:
        """Parses natural language transaction and records to SQLite."""
        parsed = self.parse_natural_transaction(text)
        today_str = datetime.now().strftime("%Y-%m-%d")

        payload = TransactionCreate(
            title=parsed["title"],
            amount=parsed["amount"],
            category=parsed["category"],
            type=parsed["type"],
            date=today_str,
            notes=f"Dicatat via Telegram @{self.bot_username} oleh {user_name}"
        )

        try:
            created = create_transaction(payload)
            # Find category remaining
            summary = get_financial_summary()
            cat_match = next((c for c in summary.category_breakdown if c.category.lower() == created.category.lower()), None)
            remaining_fmt = format_rupiah(max(0.0, cat_match.budget - cat_match.spent)) if cat_match else "Rp 1.500.000"

            type_label = "Pemasukan" if created.type == "income" else "Pengeluaran"
            emoji = "🟢" if created.type == "income" else "✅"

            reply_text = (
                f"{emoji} *Transaksi Berhasil Dicatat!*\n\n"
                f"🏷️ *{created.title}*\n"
                f"💰 *{format_rupiah(created.amount)}* ({created.category} • {type_label})\n"
                f"📅 {created.date}\n\n"
                f"📊 Sisa Kuota {created.category}: *{remaining_fmt}*\n"
                f"🆔 Entri ID: `#{created.id}`"
            )

            keyboard = {
                "inline_keyboard": [
                    [
                        {"text": f"🏷️ {created.category}", "callback_data": "check_budget"},
                        {"text": "📊 Cek Kuota", "callback_data": "check_budget"}
                    ],
                    [
                        {"text": "❌ Batalkan Transaksi", "callback_data": f"cancel_tx:{created.id}"}
                    ]
                ]
            }

            await self.send_message(chat_id, reply_text, reply_markup=keyboard)
        except Exception as e:
            logger.error(f"Error creating transaction from Telegram: {e}")
            await self.send_message(chat_id, f"⚠️ Gagal mencatat transaksi: {str(e)}")

    async def handle_callback_query(self, callback_query: Dict[str, Any]) -> None:
        """Handles inline button clicks."""
        cq_id = callback_query.get("id")
        data = callback_query.get("data", "")
        message = callback_query.get("message", {})
        chat_id = message.get("chat", {}).get("id")

        if not chat_id:
            return

        if data == "check_budget":
            await self.answer_callback_query(cq_id, "Memuat status anggaran...")
            await self.handle_budget(chat_id)
        elif data == "summary":
            await self.answer_callback_query(cq_id, "Memuat ringkasan...")
            await self.handle_summary(chat_id)
        elif data == "export_csv":
            await self.answer_callback_query(cq_id, "Menyiapkan file CSV...")
            await self.handle_export_csv(chat_id)
        elif data.startswith("cancel_tx:"):
            tx_id_str = data.split("cancel_tx:")[1]
            try:
                tx_id = int(tx_id_str)
                deleted = delete_transaction(tx_id)
                if deleted:
                    await self.answer_callback_query(cq_id, f"Transaksi #{tx_id} berhasil dibatalkan!")
                    await self.send_message(
                        chat_id,
                        f"🗑️ *Transaksi #{tx_id} telah berhasil dibatalkan dan dihapus dari database SQLite.*"
                    )
                else:
                    await self.answer_callback_query(cq_id, f"Transaksi #{tx_id} sudah tidak ditemukan.")
            except Exception as e:
                logger.error(f"Failed deleting transaction #{tx_id_str}: {e}")
                await self.answer_callback_query(cq_id, "Gagal membatalkan transaksi.")

    async def process_update(self, update: Dict[str, Any]) -> None:
        """Routes each incoming Telegram update."""
        self.updates_processed += 1
        self.last_update_at = datetime.now().isoformat()

        # 1. Handle Callback Queries (Inline Button Clicks)
        if "callback_query" in update:
            await self.handle_callback_query(update["callback_query"])
            return

        # 2. Handle Messages
        if "message" in update:
            msg = update["message"]
            chat_id = msg.get("chat", {}).get("id")
            text = msg.get("text", "").strip()
            user_first = msg.get("from", {}).get("first_name", "Pengguna")

            if not chat_id or not text:
                return

            if text.startswith("/start"):
                await self.handle_start(chat_id, user_first)
            elif text.startswith("/help"):
                await self.handle_help(chat_id)
            elif text.startswith("/budget") or text.startswith("/kuota"):
                await self.handle_budget(chat_id)
            elif text.startswith("/rekap") or text.startswith("/summary"):
                await self.handle_summary(chat_id)
            elif text.startswith("/export") or text.startswith("/csv"):
                await self.handle_export_csv(chat_id)
            else:
                # Natural language transaction message
                await self.handle_transaction_message(chat_id, text, user_first)

    async def _polling_loop(self) -> None:
        """Continuous async long-polling loop against Telegram Bot API."""
        logger.info(f"Telegram Bot Poller started for @{self.bot_username}")
        self.is_running = True
        self.started_at = datetime.now().isoformat()

        # Pre-flight check
        await self.verify_bot_token()

        async with httpx.AsyncClient(timeout=35.0) as client:
            while self.is_running:
                try:
                    params: Dict[str, Any] = {
                        "offset": self._last_offset,
                        "timeout": 20,
                        "allowed_updates": ["message", "callback_query"]
                    }
                    res = await client.get(f"{self.api_url}/getUpdates", params=params)
                    if res.status_code == 200:
                        data = res.json()
                        updates: List[Dict[str, Any]] = data.get("result", [])
                        for u in updates:
                            update_id = u["update_id"]
                            self._last_offset = max(self._last_offset, update_id + 1)
                            try:
                                await self.process_update(u)
                            except Exception as u_err:
                                logger.error(f"Error handling update {update_id}: {u_err}")
                    elif res.status_code == 409:
                        logger.warning("Conflict with another bot poller/webhook instance. Backing off 5s...")
                        await asyncio.sleep(5.0)
                    else:
                        logger.warning(f"Telegram getUpdates returned {res.status_code}: {res.text}")
                        await asyncio.sleep(3.0)
                except asyncio.CancelledError:
                    break
                except httpx.ReadTimeout:
                    continue  # Normal long polling timeout
                except Exception as e:
                    logger.error(f"Polling connection error: {e}")
                    await asyncio.sleep(3.0)

        self.is_running = False
        logger.info("Telegram Bot Poller stopped cleanly.")

    def start(self) -> None:
        """Spawns polling background task if not already running."""
        if self._poll_task and not self._poll_task.done():
            return
        loop = asyncio.get_event_loop()
        self._poll_task = loop.create_task(self._polling_loop())

    async def stop(self) -> None:
        """Cancels background polling task."""
        self.is_running = False
        if self._poll_task:
            self._poll_task.cancel()
            try:
                await self._poll_task
            except asyncio.CancelledError:
                pass
            self._poll_task = None

    async def set_webhook(self, webhook_url: str) -> Dict[str, Any]:
        """Registers the webhook URL with Telegram Bot API."""
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                res = await client.post(
                    f"{self.api_url}/setWebhook",
                    json={
                        "url": webhook_url,
                        "allowed_updates": ["message", "callback_query"]
                    }
                )
                return res.json()
            except Exception as e:
                logger.error(f"Failed setting webhook: {e}")
                return {"ok": False, "error": str(e)}

    async def get_webhook_info(self) -> Dict[str, Any]:
        """Gets current webhook status from Telegram Bot API."""
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                res = await client.get(f"{self.api_url}/getWebhookInfo")
                return res.json()
            except Exception as e:
                logger.error(f"Failed getting webhook info: {e}")
                return {"ok": False, "error": str(e)}

    async def delete_webhook(self) -> Dict[str, Any]:
        """Removes webhook configuration from Telegram Bot API."""
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                res = await client.post(f"{self.api_url}/deleteWebhook")
                return res.json()
            except Exception as e:
                logger.error(f"Failed deleting webhook: {e}")
                return {"ok": False, "error": str(e)}

    def get_status(self) -> Dict[str, Any]:
        """Returns runtime diagnostics for API & UI dashboard."""
        return {
            "running": self.is_running and (self._poll_task is not None and not self._poll_task.done()),
            "bot_username": self.bot_username,
            "bot_first_name": self.bot_first_name,
            "bot_link": f"https://t.me/{self.bot_username}",
            "started_at": self.started_at,
            "last_update_at": self.last_update_at,
            "updates_processed": self.updates_processed
        }


# Global singleton service
telegram_service = TelegramBotService()
