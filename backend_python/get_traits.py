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

# Get unique traits
cur.execute("SELECT DISTINCT trait_tag FROM options WHERE trait_tag IS NOT NULL ORDER BY trait_tag")
traits = [row[0] for row in cur.fetchall()]
print("Available traits:", traits)

cur.close()
conn.close()
