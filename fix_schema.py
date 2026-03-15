
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy import create_engine, text
from config import settings

engine = create_engine(settings.DATABASE_URL)

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE predictions ADD COLUMN IF NOT EXISTS traffic_intensity FLOAT DEFAULT 0.0;"))
        conn.commit()
        print("Schema updated successfully.")
    except Exception as e:
        print(f"Schema update failed or already done: {e}")
