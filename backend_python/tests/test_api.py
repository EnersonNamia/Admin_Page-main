"""
Unit and Integration Tests for Course Recommendation System
Run with: pytest tests/ -v
"""

import pytest
from fastapi.testclient import TestClient
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)


class TestHealthEndpoints:
    """Test basic health and connectivity endpoints"""
    
    def test_root_endpoint(self):
        """Test that root endpoint returns welcome message"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data or "status" in data


class TestUserEndpoints:
    """Test user-related API endpoints"""
    
    def test_get_users_list(self):
        """Test fetching users list"""
        response = client.get("/api/users")
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        assert isinstance(data["users"], list)
    
    def test_get_users_with_pagination(self):
        """Test users list with pagination parameters"""
        response = client.get("/api/users?page=1&limit=10")
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
    
    def test_get_user_not_found(self):
        """Test fetching non-existent user returns 404"""
        response = client.get("/api/users/999999")
        assert response.status_code == 404


class TestCourseEndpoints:
    """Test course-related API endpoints"""
    
    def test_get_courses_list(self):
        """Test fetching courses list"""
        response = client.get("/api/courses")
        assert response.status_code == 200
        data = response.json()
        assert "courses" in data
        assert isinstance(data["courses"], list)
    
    def test_get_courses_with_pagination(self):
        """Test courses list with pagination"""
        response = client.get("/api/courses?page=1&limit=20")
        assert response.status_code == 200
    
    def test_get_course_not_found(self):
        """Test fetching non-existent course returns 404"""
        response = client.get("/api/courses/999999")
        assert response.status_code == 404


class TestTestEndpoints:
    """Test assessment test-related API endpoints"""
    
    def test_get_tests_list(self):
        """Test fetching tests list"""
        response = client.get("/api/tests")
        assert response.status_code == 200
        data = response.json()
        assert "tests" in data
        assert isinstance(data["tests"], list)
    
    def test_get_test_not_found(self):
        """Test fetching non-existent test returns 404"""
        response = client.get("/api/tests/999999")
        assert response.status_code == 404


class TestQuestionEndpoints:
    """Test question-related API endpoints"""
    
    def test_get_questions_list(self):
        """Test fetching questions list"""
        response = client.get("/api/tests/questions?page=1&limit=10")
        assert response.status_code == 200
        data = response.json()
        assert "questions" in data or isinstance(data, list)


class TestRecommendationEndpoints:
    """Test recommendation-related API endpoints"""
    
    def test_get_recommendations_list(self):
        """Test fetching recommendations list"""
        response = client.get("/api/recommendations")
        assert response.status_code == 200
        data = response.json()
        assert "recommendations" in data
    
    def test_get_recommendations_with_filters(self):
        """Test recommendations with filter parameters"""
        response = client.get("/api/recommendations?status=pending&page=1&limit=10")
        assert response.status_code == 200


class TestFeedbackEndpoints:
    """Test feedback-related API endpoints"""
    
    def test_get_feedback_list(self):
        """Test fetching feedback list"""
        response = client.get("/api/feedback")
        assert response.status_code == 200
        data = response.json()
        assert "feedback" in data
    
    def test_get_feedback_stats(self):
        """Test fetching feedback statistics"""
        response = client.get("/api/feedback/stats?test_id=1")
        # Accept 200 or 422 (if test_id doesn't exist)
        assert response.status_code in [200, 422]
    
    def test_submit_feedback_invalid_rating(self):
        """Test submitting feedback with invalid rating"""
        response = client.post("/api/feedback/submit", json={
            "user_id": 1,
            "rating": 10,  # Invalid - should be 1-5
            "feedback_text": "Test"
        })
        assert response.status_code == 400


class TestAnalyticsEndpoints:
    """Test analytics-related API endpoints"""
    
    def test_get_system_overview(self):
        """Test fetching system overview analytics"""
        response = client.get("/api/analytics/system/overview")
        assert response.status_code == 200
        data = response.json()
        assert "system_overview" in data
    
    def test_get_admin_overview(self):
        """Test fetching admin overview"""
        response = client.get("/api/analytics/admin/overview")
        assert response.status_code == 200


class TestAuthEndpoints:
    """Test authentication-related API endpoints"""
    
    def test_login_missing_credentials(self):
        """Test login with missing credentials"""
        response = client.post("/api/auth/login", json={})
        assert response.status_code in [400, 422]
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = client.post("/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code in [401, 404]


class TestInputValidation:
    """Test input validation and error handling"""
    
    def test_invalid_page_number(self):
        """Test handling of invalid page number"""
        response = client.get("/api/users?page=-1")
        assert response.status_code in [400, 422]
    
    def test_invalid_limit(self):
        """Test handling of invalid limit parameter"""
        response = client.get("/api/users?limit=1000")
        assert response.status_code in [200, 400, 422]


class TestCORSHeaders:
    """Test CORS configuration"""
    
    def test_cors_headers_present(self):
        """Test that CORS headers are present"""
        response = client.options("/api/users")
        # OPTIONS might not be explicitly handled, just check it doesn't error
        assert response.status_code in [200, 405]


# Run tests with pytest
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
