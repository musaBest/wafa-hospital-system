"""Rebuild the ready-to-run Wafaa HIS SQLite database from the bundled canonical SQL snapshot.

v4.3.49 keeps the rebuild utility schema-safe by using wafaa_hospital.sql, which is
regenerated from the fully migrated bundled database. This prevents older hard-coded
schemas from silently dropping newer departments or permission tables.
"""
from __future__ import annotations

import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DB = ROOT / "wafaa_hospital.sqlite"
SQL = ROOT / "wafaa_hospital.sql"


def build() -> None:
    if not SQL.exists():
        raise FileNotFoundError(f"Missing canonical SQL snapshot: {SQL}")
    script = SQL.read_text(encoding="utf-8")
    if not script.strip():
        raise RuntimeError("Canonical SQL snapshot is empty")

    if DB.exists():
        DB.unlink()
    con = sqlite3.connect(DB)
    try:
        con.executescript(script)
        con.execute("PRAGMA foreign_keys=ON")
        required = {
            "users", "permissions", "role_permissions", "patients",
            "outpatient_pt_cases", "outpatient_pt_sessions",
        }
        present = {row[0] for row in con.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        missing = sorted(required - present)
        if missing:
            raise RuntimeError(f"Rebuilt database is missing required tables: {', '.join(missing)}")
        con.commit()
    finally:
        con.close()
    print(f"Rebuilt {DB} from {SQL.name}")


if __name__ == "__main__":
    build()
