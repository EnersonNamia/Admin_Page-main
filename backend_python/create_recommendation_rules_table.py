"""
Create the recommendation_rules table for storing admin-defined recommendation criteria
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

# Create the recommendation_rules table
create_table_sql = """
CREATE TABLE IF NOT EXISTS recommendation_rules (
    rule_id SERIAL PRIMARY KEY,
    rule_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Condition fields
    condition_type VARCHAR(50) NOT NULL,  -- 'gwa', 'strand', 'trait', 'assessment_score', 'combined'
    
    -- GWA conditions
    gwa_min DECIMAL(5,2),
    gwa_max DECIMAL(5,2),
    
    -- Strand condition
    strand VARCHAR(50),  -- 'STEM', 'HUMSS', 'ABM', 'TVL', or NULL for all
    
    -- Trait condition
    trait_tag VARCHAR(100),
    trait_min_score INTEGER,
    
    -- Assessment score condition
    assessment_min_score INTEGER,
    assessment_max_score INTEGER,
    
    -- Action: which course to recommend
    recommended_course_id INTEGER REFERENCES courses(course_id),
    
    -- Priority (higher = checked first)
    priority INTEGER DEFAULT 0,
    
    -- Rule status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) DEFAULT 'admin'
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_recommendation_rules_active ON recommendation_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_recommendation_rules_condition_type ON recommendation_rules(condition_type);
CREATE INDEX IF NOT EXISTS idx_recommendation_rules_priority ON recommendation_rules(priority DESC);
"""

try:
    cur.execute(create_table_sql)
    conn.commit()
    print("✅ recommendation_rules table created successfully!")
    
    # Check if table exists
    cur.execute("SELECT COUNT(*) FROM recommendation_rules")
    count = cur.fetchone()[0]
    print(f"   Current rules count: {count}")
    
except Exception as e:
    print(f"❌ Error creating table: {e}")
    conn.rollback()
finally:
    cur.close()
    conn.close()
