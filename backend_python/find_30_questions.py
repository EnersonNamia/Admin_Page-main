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

# Find all attempts with their answer counts
print('All test_attempts for user 42 with answer counts:')
cur.execute("""
    SELECT ta.attempt_id, ta.taken_at, 
           (SELECT COUNT(*) FROM student_answers sa WHERE sa.attempt_id = ta.attempt_id) as answer_count
    FROM test_attempts ta
    WHERE ta.user_id = 42 
    ORDER BY ta.taken_at DESC
""")
for row in cur.fetchall():
    print(f'  Attempt {row[0]}: {row[2]} answers at {row[1]}')

print('\n' + '='*50 + '\n')

# Find the attempt with 30 answers
cur.execute("""
    SELECT ta.attempt_id, ta.taken_at, 
           (SELECT COUNT(*) FROM student_answers sa WHERE sa.attempt_id = ta.attempt_id) as answer_count
    FROM test_attempts ta
    WHERE ta.user_id = 42 
    ORDER BY ta.taken_at DESC
""")
for row in cur.fetchall():
    if row[2] == 30:
        print(f'Found attempt with 30 answers: attempt_id={row[0]}, taken_at={row[1]}')
        
        # Get recommendations for this attempt
        cur.execute("""
            SELECT c.course_name, r.reasoning
            FROM recommendations r
            JOIN courses c ON r.course_id = c.course_id
            WHERE r.attempt_id = %s
            ORDER BY r.recommended_at
        """, [row[0]])
        print('Recommendations:')
        for rec in cur.fetchall():
            print(f'  - {rec[0]}: {rec[1]}')

print('\n' + '='*50 + '\n')

# Check user_test_attempts vs test_attempts
print('Comparing user_test_attempts vs test_attempts:')
cur.execute("""
    SELECT 
        uta.attempt_id as uta_attempt_id,
        uta.total_questions as uta_total,
        ta.attempt_id as ta_attempt_id,
        (SELECT COUNT(*) FROM student_answers sa WHERE sa.attempt_id = ta.attempt_id) as actual_answers
    FROM user_test_attempts uta
    LEFT JOIN test_attempts ta ON ta.user_id = uta.user_id 
        AND DATE(ta.taken_at) = DATE(uta.attempt_date)
    WHERE uta.user_id = 42
    ORDER BY uta.attempt_date DESC
    LIMIT 5
""")
columns = [desc[0] for desc in cur.description]
print(f'Columns: {columns}')
for row in cur.fetchall():
    print(row)

cur.close()
conn.close()
