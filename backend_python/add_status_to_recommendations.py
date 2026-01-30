"""
Add status and status tracking columns to recommendations table
"""
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

# Add status columns to recommendations table
alter_sql = """
-- Add status column
ALTER TABLE recommendations 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';

-- Add status history tracking
ALTER TABLE recommendations 
ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP;

-- Add notes/comments field
ALTER TABLE recommendations 
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Add who updated the status
ALTER TABLE recommendations 
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_recommendations_status ON recommendations(status);
"""

try:
    cur.execute(alter_sql)
    conn.commit()
    print("✅ Status columns added to recommendations table!")
    
    # Verify columns
    cur.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'recommendations' 
        ORDER BY ordinal_position
    """)
    print('\nUpdated recommendations table columns:')
    for row in cur.fetchall():
        print(f'  {row[0]}: {row[1]}')
    
except Exception as e:
    print(f"❌ Error: {e}")
    conn.rollback()
finally:
    cur.close()
    conn.close()
