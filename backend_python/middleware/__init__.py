"""
Middleware package for the Course Recommendation System
"""

from .security import (
    create_access_token,
    verify_token,
    get_current_user,
    get_current_user_optional,
    require_admin,
    rate_limit_dependency,
    get_security_headers,
    validate_password_strength,
    login_tracker,
    rate_limiter
)

__all__ = [
    'create_access_token',
    'verify_token',
    'get_current_user',
    'get_current_user_optional',
    'require_admin',
    'rate_limit_dependency',
    'get_security_headers',
    'validate_password_strength',
    'login_tracker',
    'rate_limiter'
]
