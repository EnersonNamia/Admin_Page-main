import requests

# Test the endpoint directly
response = requests.get('http://localhost:8000/api/users/47/test-history')
data = response.json()

print('Test history for user 47:')
for attempt in data.get('test_history', [])[:5]:
    top = attempt['top_courses'][0]['course_name'] if attempt['top_courses'] else 'N/A'
    print(f"Attempt {attempt['attempt_id']}: Q={attempt['questions_answered']}, Traits={attempt['traits_count']}, Conf={attempt['confidence']}%, Top={top}")
