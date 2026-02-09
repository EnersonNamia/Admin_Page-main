#!/usr/bin/env python3
"""Test script to verify course update functionality"""

from models.database import execute_query

# Get the BS Computer Science course
print("Current state of BS Computer Science:")
courses = execute_query("SELECT * FROM courses WHERE course_name LIKE %s", ['%Computer Science%'])
for c in courses:
    print(f"  course_id: {c['course_id']}")
    print(f"  course_name: {c['course_name']}")
    print(f"  description: {c['description']}")
    print(f"  trait_tag: {c['trait_tag']}")
    print(f"  required_strand: {c['required_strand']}")
    print(f"  minimum_gwa: {c['minimum_gwa']}")

# Test update directly
if courses:
    course_id = courses[0]['course_id']
    print(f"\n\nTesting update on course_id={course_id}...")
    
    # Simulate what the frontend sends
    test_data = {
        'course_name': 'BS Computer Science',
        'description': 'Study of algorithms, programming, AI, and software development.',
        'required_strand': None,  # "Any Strand" in frontend becomes None
        'minimum_gwa': 85.0,
        'trait_tag': 'Software-Dev, Technical-Skill, Investigative'
    }
    
    result = execute_query(
        'UPDATE courses SET course_name = COALESCE(%s, course_name), description = COALESCE(%s, description), required_strand = COALESCE(%s, required_strand), minimum_gwa = COALESCE(%s, minimum_gwa), trait_tag = COALESCE(%s, trait_tag) WHERE course_id = %s',
        [test_data['course_name'], test_data['description'], test_data['required_strand'], test_data['minimum_gwa'], test_data['trait_tag'], course_id],
        fetch=False
    )
    print(f"Rows affected: {result}")
    
    # Verify the update
    print("\n\nAfter update:")
    courses = execute_query("SELECT * FROM courses WHERE course_id = %s", [course_id])
    for c in courses:
        print(f"  course_id: {c['course_id']}")
        print(f"  course_name: {c['course_name']}")
        print(f"  description: {c['description']}")
        print(f"  trait_tag: {c['trait_tag']}")
        print(f"  required_strand: {c['required_strand']}")
        print(f"  minimum_gwa: {c['minimum_gwa']}")
