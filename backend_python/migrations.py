"""
Database migration script to add user activity tracking columns
Run this once to update your existing database schema
"""

import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def run_migrations():
    """Run database migrations"""
    conn = None
    try:
        # Connect to PostgreSQL
        conn = psycopg2.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            port=os.getenv('DB_PORT', '5432'),
            database=os.getenv('DB_NAME', 'coursepro_db'),
            user=os.getenv('DB_USER', 'postgres'),
            password=os.getenv('DB_PASSWORD', 'admin123')
        )
        
        cursor = conn.cursor()
        
        # Migration 1: Add is_active column if it doesn't exist
        print("🔄 Checking for is_active column...")
        cursor.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name='users' AND column_name='is_active'
        """)
        
        if not cursor.fetchone():
            print("   Adding is_active column...")
            cursor.execute("""
                ALTER TABLE users 
                ADD COLUMN is_active BOOLEAN DEFAULT TRUE
            """)
            print("   ✅ is_active column added")
        else:
            print("   ✅ is_active column already exists")
        
        # Migration 2: Add last_login column if it doesn't exist
        print("🔄 Checking for last_login column...")
        cursor.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name='users' AND column_name='last_login'
        """)
        
        if not cursor.fetchone():
            print("   Adding last_login column...")
            cursor.execute("""
                ALTER TABLE users 
                ADD COLUMN last_login TIMESTAMP WITH TIME ZONE
            """)
            print("   ✅ last_login column added")
        else:
            print("   ✅ last_login column already exists")
        
        # Migration 3: Check if user_test_attempts table exists
        print("🔄 Checking for user_test_attempts table...")
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'user_test_attempts'
            )
        """)
        
        if not cursor.fetchone()[0]:
            print("   Creating user_test_attempts table...")
            cursor.execute("""
                CREATE TABLE user_test_attempts (
                    attempt_id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                    test_id INTEGER NOT NULL REFERENCES tests(test_id) ON DELETE CASCADE,
                    score INTEGER NOT NULL,
                    total_questions INTEGER NOT NULL,
                    attempt_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    time_taken INTEGER,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            """)
            print("   ✅ user_test_attempts table created")
        else:
            print("   ✅ user_test_attempts table already exists")
        
        # Migration 4: Add recommendation_rank column if it doesn't exist
        print("🔄 Checking for recommendation_rank column in recommendations...")
        cursor.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name='recommendations' AND column_name='recommendation_rank'
        """)
        
        if not cursor.fetchone():
            print("   Adding recommendation_rank column...")
            cursor.execute("""
                ALTER TABLE recommendations 
                ADD COLUMN recommendation_rank INTEGER DEFAULT 1
            """)
            print("   ✅ recommendation_rank column added")
        else:
            print("   ✅ recommendation_rank column already exists")
        
        # Migration 5: Add status column to recommendations if it doesn't exist
        print("🔄 Checking for status column in recommendations...")
        cursor.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name='recommendations' AND column_name='status'
        """)
        
        if not cursor.fetchone():
            print("   Adding status column...")
            cursor.execute("""
                ALTER TABLE recommendations 
                ADD COLUMN status VARCHAR(20) DEFAULT 'pending'
            """)
            print("   ✅ status column added")
        else:
            print("   ✅ status column already exists")
        
        # Migration 6: Add admin_notes column to recommendations if it doesn't exist
        print("🔄 Checking for admin_notes column in recommendations...")
        cursor.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name='recommendations' AND column_name='admin_notes'
        """)
        
        if not cursor.fetchone():
            print("   Adding admin_notes column...")
            cursor.execute("""
                ALTER TABLE recommendations 
                ADD COLUMN admin_notes TEXT
            """)
            print("   ✅ admin_notes column added")
        else:
            print("   ✅ admin_notes column already exists")
        
        # Migration 7: Update recommendation_rank for existing recommendations
        print("🔄 Updating recommendation ranks for existing data...")
        cursor.execute("""
            WITH ranked AS (
                SELECT recommendation_id,
                       ROW_NUMBER() OVER (PARTITION BY attempt_id ORDER BY recommendation_id) as rn
                FROM recommendations
                WHERE recommendation_rank IS NULL OR recommendation_rank = 1
            )
            UPDATE recommendations r
            SET recommendation_rank = ranked.rn
            FROM ranked
            WHERE r.recommendation_id = ranked.recommendation_id
        """)
        print("   ✅ Recommendation ranks updated")

        # Migration 8: Add status_updated_at column to recommendations
        print("🔄 Checking for status_updated_at column in recommendations...")
        cursor.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name='recommendations' AND column_name='status_updated_at'
        """)
        
        if not cursor.fetchone():
            print("   Adding status_updated_at column...")
            cursor.execute("""
                ALTER TABLE recommendations 
                ADD COLUMN status_updated_at TIMESTAMP WITH TIME ZONE
            """)
            print("   ✅ status_updated_at column added")
        else:
            print("   ✅ status_updated_at column already exists")
        
        # Migration 9: Add updated_by column to recommendations
        print("🔄 Checking for updated_by column in recommendations...")
        cursor.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name='recommendations' AND column_name='updated_by'
        """)
        
        if not cursor.fetchone():
            print("   Adding updated_by column...")
            cursor.execute("""
                ALTER TABLE recommendations 
                ADD COLUMN updated_by VARCHAR(100)
            """)
            print("   ✅ updated_by column added")
        else:
            print("   ✅ updated_by column already exists")
        
        # Migration 10: Fix NULL is_active values for existing users
        print("🔄 Fixing NULL is_active values for users...")
        cursor.execute("""
            UPDATE users SET is_active = 1 WHERE is_active IS NULL
        """)
        print("   ✅ is_active values fixed")

        # Migration 11: Add question_order column to questions table
        print("🔄 Checking for question_order column in questions...")
        cursor.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name='questions' AND column_name='question_order'
        """)
        
        if not cursor.fetchone():
            print("   Adding question_order column...")
            cursor.execute("""
                ALTER TABLE questions 
                ADD COLUMN question_order INTEGER DEFAULT 1
            """)
            print("   ✅ question_order column added")
        else:
            print("   ✅ question_order column already exists")

        # Migration 12: Add created_at column to questions table
        print("🔄 Checking for created_at column in questions...")
        cursor.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name='questions' AND column_name='created_at'
        """)
        
        if not cursor.fetchone():
            print("   Adding created_at column...")
            cursor.execute("""
                ALTER TABLE questions 
                ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            """)
            print("   ✅ created_at column added")
        else:
            print("   ✅ created_at column already exists")

        # Migration 13: Add option_order column to options table
        print("🔄 Checking for option_order column in options...")
        cursor.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name='options' AND column_name='option_order'
        """)
        
        if not cursor.fetchone():
            print("   Adding option_order column...")
            cursor.execute("""
                ALTER TABLE options 
                ADD COLUMN option_order INTEGER DEFAULT 1
            """)
            # Update existing options with sequential order per question
            cursor.execute("""
                WITH numbered AS (
                    SELECT option_id,
                           ROW_NUMBER() OVER (PARTITION BY question_id ORDER BY option_id) as rn
                    FROM options
                )
                UPDATE options o
                SET option_order = numbered.rn
                FROM numbered
                WHERE o.option_id = numbered.option_id
            """)
            print("   ✅ option_order column added and existing data updated")
        else:
            print("   ✅ option_order column already exists")

        # Migration 14: Create recommendation_rules table if it doesn't exist
        print("🔄 Checking for recommendation_rules table...")
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'recommendation_rules'
            )
        """)
        
        if not cursor.fetchone()[0]:
            print("   Creating recommendation_rules table...")
            cursor.execute("""
                CREATE TABLE recommendation_rules (
                    rule_id SERIAL PRIMARY KEY,
                    rule_name VARCHAR(255) NOT NULL,
                    description TEXT,
                    condition_type VARCHAR(50) NOT NULL,
                    gwa_min DECIMAL(5,2),
                    gwa_max DECIMAL(5,2),
                    strand VARCHAR(50),
                    trait_tag VARCHAR(100),
                    trait_min_score INTEGER,
                    assessment_min_score INTEGER,
                    assessment_max_score INTEGER,
                    recommended_course_id INTEGER REFERENCES courses(course_id) ON DELETE CASCADE,
                    priority INTEGER DEFAULT 0,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            """)
            print("   ✅ recommendation_rules table created")
        else:
            print("   ✅ recommendation_rules table already exists")

        # Migration 15: Add ON DELETE CASCADE to recommendations.course_id if not already set
        print("🔄 Updating foreign key constraints for recommendations table...")
        try:
            # Check if the constraint exists and recreate it with CASCADE
            cursor.execute("""
                SELECT conname FROM pg_constraint 
                WHERE conrelid = 'recommendations'::regclass 
                AND contype = 'f' 
                AND confrelid = 'courses'::regclass
            """)
            existing_fk = cursor.fetchone()
            
            if existing_fk:
                # Drop the existing constraint and recreate with CASCADE
                cursor.execute(f"""
                    ALTER TABLE recommendations 
                    DROP CONSTRAINT IF EXISTS {existing_fk[0]}
                """)
                cursor.execute("""
                    ALTER TABLE recommendations 
                    ADD CONSTRAINT recommendations_course_id_fkey 
                    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
                """)
                print("   ✅ Foreign key constraint updated with CASCADE")
            else:
                # Add the constraint with CASCADE if it doesn't exist
                cursor.execute("""
                    ALTER TABLE recommendations 
                    ADD CONSTRAINT recommendations_course_id_fkey 
                    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
                """)
                print("   ✅ Foreign key constraint added with CASCADE")
        except Exception as fk_error:
            print(f"   ⚠️  Could not update foreign key constraint: {fk_error}")
            # This is non-fatal, continue with other migrations

        # Migration 16: Widen trait_tag column in options table for multi-trait support
        print("🔄 Checking trait_tag column size in options table...")
        try:
            cursor.execute("""
                SELECT character_maximum_length 
                FROM information_schema.columns 
                WHERE table_name='options' AND column_name='trait_tag'
            """)
            result = cursor.fetchone()
            if result and result[0] and result[0] < 500:
                cursor.execute("ALTER TABLE options ALTER COLUMN trait_tag TYPE VARCHAR(500)")
                print("   ✅ options.trait_tag column widened to VARCHAR(500) for multi-trait support")
            else:
                print("   ✅ options.trait_tag column already supports multiple traits")
        except Exception as col_error:
            print(f"   ⚠️  Could not widen trait_tag column: {col_error}")

        conn.commit()
        print("\n✅ All migrations completed successfully!")
        
        # Migration: Create performance indexes (create new cursor)
        print("🔄 Creating database indexes for performance...")
        
        indexes = [
            ("idx_questions_test_id", "CREATE INDEX IF NOT EXISTS idx_questions_test_id ON questions(test_id)"),
            ("idx_options_question_id", "CREATE INDEX IF NOT EXISTS idx_options_question_id ON options(question_id)"),
            ("idx_test_attempts_user_id", "CREATE INDEX IF NOT EXISTS idx_test_attempts_user_id ON test_attempts(user_id)"),
            ("idx_test_attempts_test_id", "CREATE INDEX IF NOT EXISTS idx_test_attempts_test_id ON test_attempts(test_id)"),
            ("idx_test_attempts_taken_at", "CREATE INDEX IF NOT EXISTS idx_test_attempts_taken_at ON test_attempts(taken_at)"),
            ("idx_recommendations_user_id", "CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON recommendations(user_id)"),
            ("idx_recommendations_status", "CREATE INDEX IF NOT EXISTS idx_recommendations_status ON recommendations(status)"),
            ("idx_recommendations_recommended_at", "CREATE INDEX IF NOT EXISTS idx_recommendations_recommended_at ON recommendations(recommended_at)"),
            ("idx_users_email", "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)"),
            ("idx_courses_course_id", "CREATE INDEX IF NOT EXISTS idx_courses_course_id ON courses(course_id)"),
        ]
        
        for index_name, index_sql in indexes:
            try:
                index_cursor = conn.cursor()
                index_cursor.execute(index_sql)
                conn.commit()
                index_cursor.close()
                print(f"   ✅ Index {index_name} created")
            except Exception as e:
                conn.rollback()
                if "already exists" in str(e):
                    print(f"   ℹ️  Index {index_name} already exists")
                else:
                    print(f"   ⚠️  Error creating index {index_name}: {e}")
        
        cursor.close()
        print("\n✅ Database indexes created successfully!\n")
        
    except Exception as error:
        print(f"❌ Migration failed: {error}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    print("🚀 Starting database migrations...")
    print(f"   Database: {os.getenv('DB_NAME', 'coursepro_db')}")
    print(f"   Host: {os.getenv('DB_HOST', 'localhost')}\n")
    run_migrations()
