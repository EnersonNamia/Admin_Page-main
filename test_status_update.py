import requests
import json

# Test the recommendations API
url = 'http://localhost:5000/api/recommendations/filter/status/all'

try:
    response = requests.get(url)
    print(f'Get recommendations status: {response.status_code}')
    data = response.json()
    
    if data.get('recommendations'):
        rec = data['recommendations'][0]
        rec_id = rec['recommendation_id']
        print(f'\nFirst recommendation:')
        print(f'ID: {rec_id}')
        print(f'Fields: {list(rec.keys())}')
        print(f'Status: {rec.get("status")}')
        print(f'Course ID: {rec.get("course_id")}')
        
        # Now try to update it
        print(f'\n--- Attempting to update recommendation {rec_id} ---')
        update_data = {
            'course_id': rec.get('course_id'),
            'reasoning': rec.get('reasoning', 'Test update'),
            'status': 'approved' if rec.get('status') != 'approved' else 'pending',
            'admin_notes': 'Updated via test script'
        }
        
        print(f'Update payload: {json.dumps(update_data, indent=2)}')
        
        update_url = f'http://localhost:5000/api/recommendations/edit/{rec_id}'
        update_response = requests.put(update_url, json=update_data)
        print(f'Update status: {update_response.status_code}')
        print(f'Update response: {update_response.json()}')
        
    else:
        print('No recommendations found in database')
        
except Exception as e:
    print(f'Error: {e}')
    import traceback
    traceback.print_exc()
