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

# Get attempt 69 details
cur.execute('SELECT * FROM test_attempts WHERE attempt_id = 69')
print('Attempt 69 details:')
print([desc[0] for desc in cur.description])
print(cur.fetchone())

cur.execute('SELECT COUNT(*) FROM student_answers WHERE attempt_id = 69')
print(f"Answers count: {cur.fetchone()[0]}")

print('\n')

# Get recommendations for attempt 69
cur.execute("""
    SELECT c.course_name, r.reasoning
    FROM recommendations r
    JOIN courses c ON r.course_id = c.course_id
    WHERE r.attempt_id = 69
    ORDER BY r.recommended_at
""")
print('Recommendations for attempt 69:')
for row in cur.fetchall():
    print(f'  {row[0]}: {row[1]}')

print('\n')

# Check if attempt 69 is in user_test_attempts
cur.execute('SELECT * FROM user_test_attempts WHERE attempt_id = 69')
result = cur.fetchone()
print(f'In user_test_attempts: {result}')

# Check all user_test_attempts for user who owns attempt 69
cur.execute('SELECT user_id FROM test_attempts WHERE attempt_id = 69')
user_id = cur.fetchone()[0]
print(f'\nUser ID for attempt 69: {user_id}')

cur.execute('SELECT * FROM user_test_attempts WHERE user_id = %s ORDER BY attempt_date DESC LIMIT 5', [user_id])
print(f'user_test_attempts for user {user_id}:')
print([desc[0] for desc in cur.description])
for row in cur.fetchall():
    print(row)

cur.close()
conn.close()
