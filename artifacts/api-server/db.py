import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "streetclaim.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS encounters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_name TEXT,
            dos TEXT,
            lat REAL,
            lng REAL,
            note TEXT,
            pos_code TEXT,
            diagnoses TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS hpe_records (
            id TEXT PRIMARY KEY,
            patient_name TEXT NOT NULL,
            dob TEXT NOT NULL,
            gender TEXT NOT NULL,
            issued_at TEXT NOT NULL,
            expires_at TEXT NOT NULL
        )
    """)

    conn.commit()
    conn.close()
