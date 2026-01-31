"""Understand the full assessment to recommendation flow"""
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

# How many students have taken assessments?
print('=== ASSESSMENT STATISTICS ===')
cur.execute("SELECT COUNT(DISTINCT user_id) FROM user_test_attempts")
print(f'  Students who took assessments: {cur.fetchone()[0]}')

cur.execute("SELECT COUNT(*) FROM user_test_attempts")
print(f'  Total test attempts: {cur.fetchone()[0]}')

cur.execute("SELECT COUNT(DISTINCT user_id) FROM recommendations")
print(f'  Students with recommendations: {cur.fetchone()[0]}')

# How many recommendations per attempt?
print('\n=== RECOMMENDATIONS PER ATTEMPT ===')
cur.execute("""
    SELECT attempt_id, COUNT(*) as rec_count 
    FROM recommendations 
    GROUP BY attempt_id 
    ORDER BY rec_count DESC 
    LIMIT 5
""")
for row in cur.fetchall():
    print(f'  Attempt {row[0]}: {row[1]} recommendations')

# Status breakdown
print('\n=== STATUS BREAKDOWN ===')
cur.execute("""
    SELECT COALESCE(status, 'pending') as status, COUNT(*) 
    FROM recommendations 
    GROUP BY COALESCE(status, 'pending')
    ORDER BY COUNT(*) DESC
""")
for row in cur.fetchall():
    print(f'  {row[0]}: {row[1]}')

# Check what happens when user completes assessment
print('\n=== SAMPLE: ONE STUDENT FULL JOURNEY ===')
cur.execute("""
    SELECT 
        u.user_id,
        CONCAT(u.first_name, ' ', u.last_name) as name,
        uta.attempt_id,
        uta.score,
        uta.total_questions,
        uta.confidence_score,
        COUNT(r.recommendation_id) as recommendation_count
    FROM users u
    JOIN user_test_attempts uta ON u.user_id = uta.user_id
    LEFT JOIN recommendations r ON uta.attempt_id = r.attempt_id
    WHERE u.user_id = 42
    GROUP BY u.user_id, u.first_name, u.last_name, uta.attempt_id, uta.score, uta.total_questions, uta.confidence_score
    ORDER BY uta.attempt_id DESC
    LIMIT 3
""")
columns = ['user_id', 'name', 'attempt_id', 'score', 'total_questions', 'confidence_score', 'recommendation_count']
for row in cur.fetchall():
    print(dict(zip(columns, row)))

# Show recommendations for latest attempt
print('\n=== LATEST ATTEMPT RECOMMENDATIONS (user 42) ===')
cur.execute("""
    SELECT r.recommendation_id, c.course_name, r.status, r.reasoning
    FROM recommendations r
    JOIN courses c ON r.course_id = c.course_id
    WHERE r.attempt_id = 94
    ORDER BY r.recommendation_id
""")
for row in cur.fetchall():
    print(f'  [{row[2] or "pending"}] {row[1]}')
    print(f'     Reasoning: {row[3][:60]}...' if row[3] and len(row[3]) > 60 else f'     Reasoning: {row[3]}')

cur.close()
conn.close()
