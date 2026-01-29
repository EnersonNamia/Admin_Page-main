"""
Verification script to check test attempt counts
Run this to verify that test_taken counts are working correctly
"""

import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(
    host=os.getenv('DB_HOST', 'localhost'),
    port=os.getenv('DB_PORT', '5432'),
    database=os.getenv('DB_NAME', 'coursepro_db'),
    user=os.getenv('DB_USER', 'postgres'),
    password=os.getenv('DB_PASSWORD', 'admin123')
)

cur = conn.cursor()

print("=" * 80)
print("TEST ATTEMPT COUNTS VERIFICATION")
print("=" * 80)

# Check test_attempts table
print("\n1. Total test_attempts in system:")
try:
    cur.execute("SELECT COUNT(*) FROM test_attempts")
    total_attempts = cur.fetchone()[0]
    print(f"   ✅ Total test_attempts: {total_attempts}")
except Exception as e:
    print(f"   ❌ Error: {e}")

# Check user_test_attempts table
print("\n2. Total user_test_attempts in system:")
try:
    cur.execute("SELECT COUNT(*) FROM user_test_attempts")
    user_total_attempts = cur.fetchone()[0]
    print(f"   ✅ Total user_test_attempts: {user_total_attempts}")
except Exception as e:
    print(f"   ❌ Error: {e}")

# Check breakdown by user
print("\n3. Test attempts per user (top 10):")
try:
    cur.execute("""
        SELECT 
            u.user_id,
            CONCAT(u.first_name, ' ', u.last_name) as full_name,
            COUNT(uta.attempt_id) as tests_taken
        FROM users u
        LEFT JOIN user_test_attempts uta ON u.user_id = uta.user_id
        GROUP BY u.user_id, u.first_name, u.last_name
        ORDER BY tests_taken DESC
        LIMIT 10
    """)
    for row in cur.fetchall():
        print(f"   {row[1]}: {row[2]} tests taken")
except Exception as e:
    print(f"   ❌ Error: {e}")

# Check test types
print("\n4. Tests by type:")
try:
    cur.execute("""
        SELECT test_type, COUNT(*) as count
        FROM tests
        GROUP BY test_type
        ORDER BY count DESC
    """)
    for row in cur.fetchall():
        print(f"   {row[0]}: {row[1]} tests")
except Exception as e:
    print(f"   ❌ Error: {e}")

# Check test attempts by type
print("\n5. Test attempts by test type:")
try:
    cur.execute("""
        SELECT 
            COALESCE(t.test_type, 'unknown') as test_type,
            COUNT(uta.attempt_id) as attempt_count
        FROM user_test_attempts uta
        LEFT JOIN tests t ON uta.test_id = t.test_id
        GROUP BY t.test_type
        ORDER BY attempt_count DESC
    """)
    for row in cur.fetchall():
        print(f"   {row[0]}: {row[1]} attempts")
except Exception as e:
    print(f"   ❌ Error: {e}")

# Verify both tables are synchronized
print("\n6. Synchronization check (test_attempts vs user_test_attempts):")
try:
    cur.execute("""
        SELECT 
            COUNT(DISTINCT ta.attempt_id) as test_attempts_count,
            COUNT(DISTINCT uta.attempt_id) as user_test_attempts_count
        FROM test_attempts ta
        FULL OUTER JOIN user_test_attempts uta 
            ON ta.user_id = uta.user_id 
            AND ta.test_id = uta.test_id 
            AND DATE(ta.attempt_date) = DATE(uta.attempt_date)
    """)
    row = cur.fetchone()
    if row[0] == row[1]:
        print(f"   ✅ Both tables are synchronized ({row[0]} attempts)")
    else:
        print(f"   ⚠️  Mismatch detected:")
        print(f"       test_attempts: {row[0]}")
        print(f"       user_test_attempts: {row[1]}")
except Exception as e:
    print(f"   ❌ Error: {e}")

print("\n" + "=" * 80)
print("VERIFICATION COMPLETE")
print("=" * 80)

cur.close()
conn.close()
