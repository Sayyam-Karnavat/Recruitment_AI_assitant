"""
Database Restore & Sync Tool: Local PostgreSQL -> New Render DB
==============================================================
Use this script after creating your new Render PostgreSQL instance.
It pushes your local backup data into the new live database.
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
# Local PostgreSQL database URL (Source backup)
SOURCE_DB_URL = "postgresql://postgres:sanyam@localhost:5432/Resume_Shortlisting"

# Replace with your NEW live Render database URL
# Format: postgresql://username:password@dpg-xxx-a.singapore-postgres.render.com/dbname
TARGET_DB_URL = "postgresql://sanyam:LDanLQiBIHtSXMiumIJQuKygVJo8sLx3@dpg-dascmbg473hc73fnmflg-a.singapore-postgres.render.com/recruitmentdb_su6j"
# ==============================================================================


def sync_databases():
    if "newinstance" in TARGET_DB_URL or "username:password" in TARGET_DB_URL:
        print("ERROR: Please set TARGET_DB_URL with your new Render PostgreSQL connection string.")
        sys.exit(1)

    print(f"Connecting to Source (Local PostgreSQL: {SOURCE_DB_URL.split('@')[-1]})...")
    source_engine = create_engine(SOURCE_DB_URL)

    print(f"Connecting to Target (New Render DB: {TARGET_DB_URL.split('@')[-1]})...")
    target_engine = create_engine(TARGET_DB_URL)

    # 1. Ensure uuid-ossp extension exists on target
    with target_engine.connect() as target_conn:
        target_conn.execute(text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'))
        target_conn.commit()

    # 2. Reflect all tables dynamically from local source
    print("\n--- Discovering Schema from Local Backup ---")
    source_metadata = MetaData()
    source_metadata.reflect(bind=source_engine)
    tables = source_metadata.sorted_tables

    print(f"Discovered {len(tables)} tables to restore: {[t.name for t in tables]}")

    # 3. Drop existing target tables in reverse order and recreate matching schema
    print("\n--- Resetting New Target Database Schema ---")
    print("Dropping existing tables in New Target (if any)...")
    source_metadata.drop_all(bind=target_engine)

    print("Creating all tables in New Target database...")
    source_metadata.create_all(bind=target_engine)

    # 4. Copy data in topological order to respect foreign key constraints
    print("\n--- Starting Data Restore (Local -> New Render) ---")
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
    print("                      DATA RESTORE VERIFICATION REPORT")
    print("======================================================================")
    print(f"{'Table Name':<28} | {'Local Rows':<15} | {'New Render Rows':<15} | {'Status'}")
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
        print("SUCCESS: All tables restored perfectly! Your new Render DB is live with your data.")
        print("\nDon't forget to update DATABASE_URL in Render Environment Variables and backend/.env!")
    else:
        print("WARNING: Some tables had row count mismatches. Please inspect logs above.")


if __name__ == "__main__":
    sync_databases()
