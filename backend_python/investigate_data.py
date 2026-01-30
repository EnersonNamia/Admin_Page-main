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
row = cur.fetchone()
print(f'Data: {row}')

print('\n' + '='*50 + '\n')

# Check if there's any additional data stored for the attempt
# Maybe there's a result or session table
print('Looking for other tables that might store results:')
cur.execute("""
    SELECT tablename FROM pg_tables 
    WHERE schemaname='public' 
    AND (tablename LIKE '%result%' OR tablename LIKE '%session%' OR tablename LIKE '%trait%')
""")
for row in cur.fetchall():
    print(f'  {row[0]}')

print('\n' + '='*50 + '\n')

# Check all recommendations for attempt 69 (not just top 5)
print('ALL recommendations for attempt 69:')
cur.execute("""
    SELECT c.course_name, c.trait_tag, r.reasoning
    FROM recommendations r
    JOIN courses c ON r.course_id = c.course_id
    WHERE r.attempt_id = 69
    ORDER BY r.recommended_at
""")
count = 0
all_traits = set()
for row in cur.fetchall():
    count += 1
    if row[1]:
        all_traits.add(row[1])
    print(f'  {count}. {row[0]} - {row[1]}')

print(f'\nTotal recommendations: {count}')
print(f'Total unique traits from all recommendations: {len(all_traits)}')
print(f'Traits: {all_traits}')

print('\n' + '='*50 + '\n')

# Check questions table for test 161 
print('Questions in questions table (may not be for adaptive test):')
cur.execute('SELECT COUNT(*) FROM questions')
print(f'Total questions in database: {cur.fetchone()[0]}')

# Check if there's trait data in student_answers
print('\nChecking student_answers joined with options for traits:')
cur.execute("""
    SELECT sa.answer_id, o.trait_tag
    FROM student_answers sa
    JOIN options o ON sa.chosen_option_id = o.option_id
    WHERE sa.attempt_id = 69
""")
answer_traits = set()
for row in cur.fetchall():
    if row[1]:
        answer_traits.add(row[1])
print(f'Unique traits from student answers: {len(answer_traits)}')
print(f'Traits: {answer_traits}')

cur.close()
conn.close()
