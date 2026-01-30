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

# Check test_attempts schema
print('test_attempts table columns:')
cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='test_attempts' ORDER BY ordinal_position")
for row in cur.fetchall():
    print(f'  {row[0]}: {row[1]}')

print('\n' + '='*50 + '\n')

# Check student_answers schema
print('student_answers table columns:')
cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='student_answers' ORDER BY ordinal_position")
for row in cur.fetchall():
    print(f'  {row[0]}: {row[1]}')

print('\n' + '='*50 + '\n')

# Check latest test_attempts data for user 42
print('Latest test_attempts for user 42:')
cur.execute("""
    SELECT * FROM test_attempts 
    WHERE user_id = 42 
    ORDER BY created_at DESC 
    LIMIT 3
""")
columns = [desc[0] for desc in cur.description]
print(f'Columns: {columns}')
for row in cur.fetchall():
    print(row)

cur.close()
conn.close()
