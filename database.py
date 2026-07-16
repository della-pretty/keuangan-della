"""
Modul database (SQLite) buat nyimpen data transaksi keuangan & profil user.
"""

import sqlite3
import os
import hashlib
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "keuangan.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def hash_pin(pin: str) -> str:
    return hashlib.sha256(pin.encode("utf-8")).hexdigest()


def init_db():
    conn = get_connection()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS transaksi (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tanggal TEXT NOT NULL,
            deskripsi TEXT NOT NULL,
            kategori TEXT NOT NULL,
            tipe TEXT NOT NULL CHECK(tipe IN ('Pemasukan', 'Pengeluaran')),
            nominal REAL NOT NULL
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS profil (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            nama TEXT NOT NULL,
            email TEXT NOT NULL,
            tanggal_lahir TEXT NOT NULL,
            pin_hash TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()


# ----------------------------- PROFIL & PIN -----------------------------
def is_registered() -> bool:
    conn = get_connection()
    row = conn.execute("SELECT id FROM profil WHERE id = 1").fetchone()
    conn.close()
    return row is not None


def save_profile(nama, email, tanggal_lahir, pin):
    conn = get_connection()
    conn.execute(
        "INSERT OR REPLACE INTO profil (id, nama, email, tanggal_lahir, pin_hash) "
        "VALUES (1, ?, ?, ?, ?)",
        (nama, email, tanggal_lahir, hash_pin(pin)),
    )
    conn.commit()
    conn.close()


def get_profile():
    conn = get_connection()
    row = conn.execute("SELECT * FROM profil WHERE id = 1").fetchone()
    conn.close()
    return dict(row) if row else None


def verify_pin(pin: str) -> bool:
    profile = get_profile()
    if not profile:
        return False
    return profile["pin_hash"] == hash_pin(pin)


def reset_all_data():
    """Hapus semua data (profil + transaksi), buat fitur 'lupa PIN' / reset app."""
    conn = get_connection()
    conn.execute("DELETE FROM profil")
    conn.execute("DELETE FROM transaksi")
    conn.commit()
    conn.close()


def add_transaction(deskripsi, kategori, tipe, nominal, tanggal=None):
    if tanggal is None:
        tanggal = datetime.now().strftime("%Y-%m-%d %H:%M")
    conn = get_connection()
    conn.execute(
        "INSERT INTO transaksi (tanggal, deskripsi, kategori, tipe, nominal) VALUES (?, ?, ?, ?, ?)",
        (tanggal, deskripsi, kategori, tipe, nominal),
    )
    conn.commit()
    conn.close()


def get_all_transactions(limit=100):
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM transaksi ORDER BY id DESC LIMIT ?", (limit,)
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]


def delete_transaction(transaction_id):
    conn = get_connection()
    conn.execute("DELETE FROM transaksi WHERE id = ?", (transaction_id,))
    conn.commit()
    conn.close()


def get_balance():
    conn = get_connection()
    income = conn.execute(
        "SELECT COALESCE(SUM(nominal), 0) as total FROM transaksi WHERE tipe = 'Pemasukan'"
    ).fetchone()["total"]
    expense = conn.execute(
        "SELECT COALESCE(SUM(nominal), 0) as total FROM transaksi WHERE tipe = 'Pengeluaran'"
    ).fetchone()["total"]
    conn.close()
    return income, expense, income - expense


def get_category_summary():
    """Total pengeluaran per kategori, buat laporan/grafik."""
    conn = get_connection()
    rows = conn.execute("""
        SELECT kategori, SUM(nominal) as total
        FROM transaksi
        WHERE tipe = 'Pengeluaran'
        GROUP BY kategori
        ORDER BY total DESC
    """).fetchall()
    conn.close()
    return [(row["kategori"], row["total"]) for row in rows]
