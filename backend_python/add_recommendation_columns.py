import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(
    host=os.getenv('DB_HOST'),
    port=os.getenv('DB_PORT'),
    database=os.getenv('DB_NAME'),
    user=os.getenv('DB_USER'),
    password=os.getenv('DB_PASSWORD')
)

cur = conn.cursor()

print("Adding missing columns to recommendations table...")

try:
    cur.execute("ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS recommendation_rank INTEGER")
    print("  ✅ Added recommendation_rank column")
except Exception as e:
    print(f"  ⚠️ recommendation_rank: {e}")

try:
    cur.execute("ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'")
    print("  ✅ Added status column")
except Exception as e:
    print(f"  ⚠️ status: {e}")

try:
    cur.execute("ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP")
    print("  ✅ Added status_updated_at column")
except Exception as e:
    print(f"  ⚠️ status_updated_at: {e}")

try:
    cur.execute("ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS admin_notes TEXT")
    print("  ✅ Added admin_notes column")
except Exception as e:
    print(f"  ⚠️ admin_notes: {e}")

try:
    cur.execute("ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS updated_by VARCHAR(50)")
    print("  ✅ Added updated_by column")
except Exception as e:
    print(f"  ⚠️ updated_by: {e}")

# Update existing rows to have a rank based on score
try:
    cur.execute("""
        WITH ranked AS (
            SELECT recommendation_id, 
                   ROW_NUMBER() OVER (PARTITION BY attempt_id ORDER BY score DESC NULLS LAST, recommendation_id) as rn
            FROM recommendations
        )
        UPDATE recommendations r
        SET recommendation_rank = ranked.rn
        FROM ranked
        WHERE r.recommendation_id = ranked.recommendation_id
          AND r.recommendation_rank IS NULL
    """)
    print("  ✅ Updated recommendation ranks for existing rows")
except Exception as e:
    print(f"  ⚠️ rank update: {e}")

conn.commit()
print("\n✅ Migration completed successfully!")

cur.close()
conn.close()
