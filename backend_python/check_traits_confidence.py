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

# Check options table schema
print('options table columns:')
cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='options' ORDER BY ordinal_position")
for row in cur.fetchall():
    print(f'  {row[0]}: {row[1]}')

print('\n' + '='*50 + '\n')

# Get all answers with traits for attempt 69
print('All student answers with their traits for attempt 69:')
cur.execute("""
    SELECT sa.answer_id, q.question_text, o.option_text, o.trait_tag
    FROM student_answers sa
    JOIN options o ON sa.chosen_option_id = o.option_id
    LEFT JOIN questions q ON o.question_id = q.question_id
    WHERE sa.attempt_id = 69
    ORDER BY sa.answer_id
""")
answer_count = 0
all_traits = set()
for row in cur.fetchall():
    answer_count += 1
    if row[3]:
        all_traits.add(row[3])
    print(f'  {answer_count}. Trait: {row[3]}')

print(f'\nTotal answers: {answer_count}')
print(f'Total unique traits from answers: {len(all_traits)}')
print(f'Traits: {all_traits}')

print('\n' + '='*50 + '\n')

# Check if there's a confidence score stored somewhere
# Maybe in the reasoning field of recommendations - extract confidence
print('Looking for confidence data in recommendations:')
cur.execute("""
    SELECT reasoning FROM recommendations WHERE attempt_id = 69
""")
import re
max_confidence = 0
for row in cur.fetchall():
    reasoning = row[0] or ''
    match = re.search(r'Match:\s*([\d.]+)%', reasoning)
    if match:
        conf = float(match.group(1))
        if conf > max_confidence:
            max_confidence = conf
print(f'Max match percentage (used as confidence): {max_confidence}%')

# Calculate average confidence
cur.execute("""
    SELECT reasoning FROM recommendations WHERE attempt_id = 69
""")
total_conf = 0
count = 0
for row in cur.fetchall():
    reasoning = row[0] or ''
    match = re.search(r'Match:\s*([\d.]+)%', reasoning)
    if match:
        total_conf += float(match.group(1))
        count += 1
if count > 0:
    avg_conf = total_conf / count
    print(f'Average match percentage: {avg_conf:.1f}%')

cur.close()
conn.close()
