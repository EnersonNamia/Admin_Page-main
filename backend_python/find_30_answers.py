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

# Find all attempts with 30 answers
print('All attempts with around 30 answers:')
cur.execute("""
    SELECT ta.attempt_id, ta.user_id, ta.taken_at, 
           (SELECT COUNT(*) FROM student_answers sa WHERE sa.attempt_id = ta.attempt_id) as answer_count
    FROM test_attempts ta
    WHERE (SELECT COUNT(*) FROM student_answers sa WHERE sa.attempt_id = ta.attempt_id) >= 25
    ORDER BY ta.taken_at DESC
    LIMIT 20
""")
for row in cur.fetchall():
    print(f'  Attempt {row[0]}: user_id={row[1]}, {row[3]} answers at {row[2]}')

print('\n' + '='*50 + '\n')

# Check user 48 (testdirect) who has 8 tests
print('Test attempts for user 48 (testdirect):')
cur.execute("""
    SELECT ta.attempt_id, ta.taken_at, 
           (SELECT COUNT(*) FROM student_answers sa WHERE sa.attempt_id = ta.attempt_id) as answer_count
    FROM test_attempts ta
    WHERE ta.user_id = 48
    ORDER BY ta.taken_at DESC
""")
for row in cur.fetchall():
    print(f'  Attempt {row[0]}: {row[2]} answers at {row[1]}')

print('\n' + '='*50 + '\n')

# Check if recommendations have match percentages in reasoning
print('Sample recommendations with match percentages:')
cur.execute("""
    SELECT r.attempt_id, c.course_name, r.reasoning
    FROM recommendations r
    JOIN courses c ON r.course_id = c.course_id
    WHERE r.reasoning LIKE '%Match%'
    ORDER BY r.recommended_at DESC
    LIMIT 10
""")
for row in cur.fetchall():
    print(f'  Attempt {row[0]}: {row[1]} - {row[2]}')

cur.close()
conn.close()
