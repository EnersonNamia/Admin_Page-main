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

# Check latest test_attempts data for user 42
print('Latest test_attempts for user 42:')
cur.execute("""
    SELECT * FROM test_attempts 
    WHERE user_id = 42 
    ORDER BY taken_at DESC 
    LIMIT 5
""")
columns = [desc[0] for desc in cur.description]
print(f'Columns: {columns}')
for row in cur.fetchall():
    print(row)

print('\n' + '='*50 + '\n')

# Get the attempt_id for the most recent test attempt
cur.execute("""
    SELECT attempt_id FROM test_attempts 
    WHERE user_id = 42 
    ORDER BY taken_at DESC 
    LIMIT 1
""")
latest_attempt_id = cur.fetchone()[0]
print(f'Latest attempt_id: {latest_attempt_id}')

# Count student answers for this attempt
cur.execute("""
    SELECT COUNT(*) FROM student_answers WHERE attempt_id = %s
""", [latest_attempt_id])
answer_count = cur.fetchone()[0]
print(f'Number of answers for attempt {latest_attempt_id}: {answer_count}')

print('\n' + '='*50 + '\n')

# Check recommendations table schema
print('recommendations table columns:')
cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='recommendations' ORDER BY ordinal_position")
for row in cur.fetchall():
    print(f'  {row[0]}: {row[1]}')

print('\n' + '='*50 + '\n')

# Get recommendations for the latest attempt
print(f'Recommendations for attempt {latest_attempt_id}:')
cur.execute("""
    SELECT r.*, c.course_name 
    FROM recommendations r
    JOIN courses c ON r.course_id = c.course_id
    WHERE r.attempt_id = %s
    ORDER BY r.recommended_at
""", [latest_attempt_id])
columns = [desc[0] for desc in cur.description]
print(f'Columns: {columns}')
for row in cur.fetchall():
    print(row)

cur.close()
conn.close()
