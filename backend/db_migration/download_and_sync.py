"""
Database Backup & Sync Tool: Render -> Local PostgreSQL
======================================================
Use this script before deleting your expiring Render database.
It downloads all schemas, tables, and rows from Render into your local database.
"""

import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, MetaData, text

# Load backend environment variables if present
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(backend_dir, ".env"))

# ==============================================================================
# CONFIGURATION
# ==============================================================================
# Live Render database URL (Source to backup from)
DEFAULT_RENDER_URL = "postgresql://sanyam:Lh8DRgrcCq8BtVjDEQcVvndwaHA42MJO@dpg-dalbg765vjqs73epgkfg-a.singapore-postgres.render.com/recruitmentdb_3jr5"
SOURCE_DB_URL = os.getenv("DATABASE_URL", DEFAULT_RENDER_URL)

# Local PostgreSQL database URL (Target backup)
# Format: postgresql://username:password@localhost:5432/dbname
TARGET_DB_URL = "postgresql://postgres:sanyam@localhost:5432/Resume_Shortlisting"
# ==============================================================================


def sync_databases():
    print(f"Connecting to Source (Live Render DB: {SOURCE_DB_URL.split('@')[-1]})...")
    source_engine = create_engine(SOURCE_DB_URL)

    print(f"Connecting to Target (Local PostgreSQL: {TARGET_DB_URL.split('@')[-1]})...")
    target_engine = create_engine(TARGET_DB_URL)

    # 1. Ensure uuid-ossp extension exists on target
    with target_engine.connect() as target_conn:
        target_conn.execute(text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'))
        target_conn.commit()

    # 2. Reflect all tables dynamically from the source database
    print("\n--- Discovering Schema from Source Database ---")
    source_metadata = MetaData()
    source_metadata.reflect(bind=source_engine)
    tables = source_metadata.sorted_tables

    print(f"Discovered {len(tables)} tables: {[t.name for t in tables]}")

    # 3. Drop existing target tables in reverse order and recreate matching schema
    print("\n--- Resetting Target Database Schema ---")
    print("Dropping existing tables in Target (if any)...")
    source_metadata.drop_all(bind=target_engine)

    print("Creating all tables in Target database to match schema perfectly...")
    source_metadata.create_all(bind=target_engine)

    # 4. Copy data in topological order to respect foreign key constraints
    print("\n--- Starting Data Sync (Render -> Local) ---")
    sync_logs = []

    with source_engine.connect() as source_conn, target_engine.begin() as target_conn:
        for table in tables:
            print(f"Syncing table: {table.name}...")

            # Fetch all rows from source
            rows = source_conn.execute(table.select()).mappings().all()
            source_count = len(rows)

            # Insert into target
            if source_count > 0:
                data_to_insert = [dict(row) for row in rows]
                target_conn.execute(table.insert(), data_to_insert)

            sync_logs.append({
                "table": table.name,
                "source_count": source_count
            })
            print(f"  -> Inserted {source_count} rows")

    # 5. Verification Report
    print("\n======================================================================")
    print("                      DATA BACKUP VERIFICATION REPORT")
    print("======================================================================")
    print(f"{'Table Name':<28} | {'Render Rows':<15} | {'Local Rows':<15} | {'Status'}")
    print("-" * 72)

    all_match = True
    with target_engine.connect() as target_conn:
        for log in sync_logs:
            table_name = log["table"]
            source_count = log["source_count"]

            # Count rows in target
            target_count = target_conn.execute(text(f'SELECT COUNT(*) FROM "{table_name}"')).scalar()

            match = "MATCH" if source_count == target_count else "MISMATCH"
            if source_count != target_count:
                all_match = False

            print(f"{table_name:<28} | {source_count:<15} | {target_count:<15} | {match}")

    print("======================================================================")
    if all_match:
        print("SUCCESS: Local database backup completed! All tables match Render.")
    else:
        print("WARNING: Some tables had row count mismatches. Please inspect logs above.")


if __name__ == "__main__":
    sync_databases()
