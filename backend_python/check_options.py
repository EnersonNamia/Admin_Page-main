import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()

conn = psycopg2.connect(
    host=os.getenv('DB_HOST'),
    port=os.getenv('DB_PORT'),
    database=os.getenv('DB_NAME'),
    user=os.getenv('DB_USER'),
    password=os.getenv('DB_PASSWORD')
)

cur = conn.cursor()

# Check question 22 details including question_order
print("=== Question 22 Details ===")
cur.execute("SELECT question_id, question_order, question_text FROM questions WHERE question_id = 22")
row = cur.fetchone()
if row:
    print(f"  question_id: {row[0]}")
    print(f"  question_order: {row[1]}")
    print(f"  text: {row[2][:60]}...")

# Check how many options question 22 has  
print("\n=== Options count for Question 22 ===")
cur.execute("SELECT COUNT(*) FROM options WHERE question_id = 22")
print(f"  Total options: {cur.fetchone()[0]}")

# Show all options for question 22
print("\n=== All Options for Question 22 ===")
cur.execute("SELECT option_id, option_text, option_order FROM options WHERE question_id = 22 ORDER BY option_id")
for row in cur.fetchall():
    print(f"  ID {row[0]} (order: {row[2]}): '{row[1]}'")

conn.close()
