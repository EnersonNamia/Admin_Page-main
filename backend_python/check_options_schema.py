import os
from dotenv import load_dotenv
load_dotenv()
import psycopg2

conn = psycopg2.connect(
    host=os.getenv('DB_HOST'),
    port=os.getenv('DB_PORT'),
    database=os.getenv('DB_NAME'),
    user=os.getenv('DB_USER'),
    password=os.getenv('DB_PASSWORD')
)
cur = conn.cursor()
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='options'")
cols = [row[0] for row in cur.fetchall()]
print("Options table columns:", cols)

# Also check a sample option to see if it has trait data
cur.execute("SELECT * FROM options LIMIT 1")
col_names = [desc[0] for desc in cur.description]
print("Column names:", col_names)

cur.close()
conn.close()
