"""Check how assessment results connect to recommendations"""
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

# Check if there's a separate user_test_attempts table
print('=== CHECKING FOR USER_TEST_ATTEMPTS TABLE ===')
cur.execute("""
    SELECT table_name FROM information_schema.tables 
    WHERE table_name LIKE '%attempt%' OR table_name LIKE '%test%'
    ORDER BY table_name
""")
for row in cur.fetchall():
    print(f'  {row[0]}')

# Check user_test_attempts schema if exists
print('\n=== USER_TEST_ATTEMPTS COLUMNS (if exists) ===')
try:
    cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='user_test_attempts' ORDER BY ordinal_position")
    for row in cur.fetchall():
        print(f'  {row[0]}: {row[1]}')
except Exception as e:
    print(f'  Table may not exist: {e}')

# Check sample data from user_test_attempts
print('\n=== SAMPLE USER_TEST_ATTEMPTS DATA ===')
try:
    cur.execute("""
        SELECT * FROM user_test_attempts 
        ORDER BY attempt_id DESC 
        LIMIT 3
    """)
    columns = [desc[0] for desc in cur.description]
    print(f'Columns: {columns}')
    for row in cur.fetchall():
        print(row)
except Exception as e:
    print(f'  Error: {e}')

# Check how recommendations are linked
print('\n=== RECOMMENDATIONS WITH ATTEMPT INFO ===')
cur.execute("""
    SELECT r.recommendation_id, r.attempt_id, r.user_id, r.course_id, 
           r.status, c.course_name, r.reasoning
    FROM recommendations r
    LEFT JOIN courses c ON r.course_id = c.course_id
    ORDER BY r.recommendation_id DESC
    LIMIT 5
""")
columns = [desc[0] for desc in cur.description]
print(f'Columns: {columns}')
for row in cur.fetchall():
    print(row)

# Check if recommendations come from assessments or admin rules
print('\n=== COUNT: RECOMMENDATIONS WITH vs WITHOUT ATTEMPT_ID ===')
cur.execute("""
    SELECT 
        COUNT(*) FILTER (WHERE attempt_id IS NOT NULL) as with_attempt,
        COUNT(*) FILTER (WHERE attempt_id IS NULL) as without_attempt,
        COUNT(*) as total
    FROM recommendations
""")
row = cur.fetchone()
print(f'  With attempt_id (from assessment): {row[0]}')
print(f'  Without attempt_id (admin-generated): {row[1]}')
print(f'  Total: {row[2]}')

cur.close()
conn.close()
