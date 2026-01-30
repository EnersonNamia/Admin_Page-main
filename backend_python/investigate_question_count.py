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

# Check user_test_attempts for attempt 69
print('user_test_attempts for attempt 69:')
cur.execute('SELECT * FROM user_test_attempts WHERE attempt_id = 69')
columns = [desc[0] for desc in cur.description]
print(f'Columns: {columns}')
print(cur.fetchone())

print('\n' + '='*50 + '\n')

# Check test_attempts for attempt 69
print('test_attempts for attempt 69:')
cur.execute('SELECT * FROM test_attempts WHERE attempt_id = 69')
columns = [desc[0] for desc in cur.description]
print(f'Columns: {columns}')
print(cur.fetchone())

print('\n' + '='*50 + '\n')

# Count all student_answers for attempt 69
print('student_answers count for attempt 69:')
cur.execute('SELECT COUNT(*) FROM student_answers WHERE attempt_id = 69')
print(f'Count: {cur.fetchone()[0]}')

print('\n' + '='*50 + '\n')

# Check ALL student_answers for attempt 69
print('ALL student_answers for attempt 69:')
cur.execute('SELECT * FROM student_answers WHERE attempt_id = 69 ORDER BY answer_id')
columns = [desc[0] for desc in cur.description]
print(f'Columns: {columns}')
for row in cur.fetchall():
    print(row)

print('\n' + '='*50 + '\n')

# Check if there are multiple test_attempts with same timestamp
print('All test_attempts around the same time for user 47:')
cur.execute("""
    SELECT attempt_id, taken_at, 
           (SELECT COUNT(*) FROM student_answers sa WHERE sa.attempt_id = ta.attempt_id) as answer_count
    FROM test_attempts ta
    WHERE user_id = 47 AND taken_at >= '2026-01-30 15:00:00'
    ORDER BY taken_at DESC
""")
for row in cur.fetchall():
    print(f'  Attempt {row[0]}: {row[2]} answers at {row[1]}')

print('\n' + '='*50 + '\n')

# Check questions table to see how many questions exist
print('Total questions in questions table by test_id:')
cur.execute("""
    SELECT test_id, COUNT(*) as question_count 
    FROM questions 
    GROUP BY test_id 
    ORDER BY test_id
""")
for row in cur.fetchall():
    print(f'  Test {row[0]}: {row[1]} questions')

print('\n' + '='*50 + '\n')

# Check if there's any configuration for quiz length
print('Checking tests table for quiz length configuration:')
cur.execute('SELECT * FROM tests WHERE test_id = 161')
columns = [desc[0] for desc in cur.description]
print(f'Columns: {columns}')
print(cur.fetchone())

cur.close()
conn.close()
