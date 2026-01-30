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

# Check tests table schema
print('tests table columns:')
cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='tests' ORDER BY ordinal_position")
for row in cur.fetchall():
    print(f'  {row[0]}: {row[1]}')

print()

# Get test 161 details
cur.execute('SELECT * FROM tests WHERE test_id = 161')
columns = [desc[0] for desc in cur.description]
print(f'Test 161: {columns}')
print(cur.fetchone())

print()

# Count total questions for test 161
cur.execute('SELECT COUNT(*) FROM questions WHERE test_id = 161')
print(f'Total questions in test 161: {cur.fetchone()[0]}')

cur.close()
conn.close()
