"""
Security middleware and utilities for the Course Recommendation System
Provides JWT authentication, rate limiting, and security headers
"""

from fastapi import HTTPException, Security, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from functools import wraps
import os
import time
from collections import defaultdict
import threading

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "change_this_to_a_secure_secret_in_production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", "24"))

# Rate Limiting Configuration
RATE_LIMIT_REQUESTS = int(os.getenv("RATE_LIMIT_REQUESTS", "100"))
RATE_LIMIT_WINDOW_MINUTES = int(os.getenv("RATE_LIMIT_WINDOW_MINUTES", "15"))

# Security bearer scheme
security = HTTPBearer(auto_error=False)


class RateLimiter:
    """
    Simple in-memory rate limiter.
    For production, consider using Redis for distributed rate limiting.
    """
    
    def __init__(self, requests_limit: int = 100, window_minutes: int = 15):
        self.requests_limit = requests_limit
        self.window_seconds = window_minutes * 60
        self.requests: Dict[str, list] = defaultdict(list)
        self._lock = threading.Lock()
    
    def is_rate_limited(self, identifier: str) -> tuple[bool, int]:
        """
        Check if the identifier is rate limited.
        Returns (is_limited, remaining_requests)
        """
        current_time = time.time()
        window_start = current_time - self.window_seconds
        
        with self._lock:
            # Clean old requests
            self.requests[identifier] = [
                req_time for req_time in self.requests[identifier]
                if req_time > window_start
            ]
            
            # Check limit
            current_requests = len(self.requests[identifier])
            if current_requests >= self.requests_limit:
                return True, 0
            
            # Add new request
            self.requests[identifier].append(current_time)
            return False, self.requests_limit - current_requests - 1
    
    def get_retry_after(self, identifier: str) -> int:
        """Get seconds until rate limit resets"""
        if identifier not in self.requests or not self.requests[identifier]:
            return 0
        
        oldest_request = min(self.requests[identifier])
        retry_after = int(oldest_request + self.window_seconds - time.time())
        return max(0, retry_after)


# Global rate limiter instance
rate_limiter = RateLimiter(RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_MINUTES)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token with the given data.
    
    Args:
        data: Dictionary containing user data to encode
        expires_delta: Optional custom expiration time
    
    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "access"
    })
    
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Dict[str, Any]:
    """
    Verify and decode a JWT token.
    
    Args:
        token: JWT token string
    
    Returns:
        Decoded token payload
    
    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except JWTError as e:
        raise HTTPException(
            status_code=401,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"}
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> Dict[str, Any]:
    """
    Dependency to get the current authenticated user from JWT token.
    
    Use this as a dependency in protected routes:
        @router.get("/protected")
        async def protected_route(user: dict = Depends(get_current_user)):
            return {"user": user}
    """
    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    token = credentials.credentials
    payload = verify_token(token)
    
    # Check token type
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=401,
            detail="Invalid token type",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return payload


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> Optional[Dict[str, Any]]:
    """
    Optional version of get_current_user.
    Returns None if no valid token is provided instead of raising an exception.
    """
    if credentials is None:
        return None
    
    try:
        token = credentials.credentials
        payload = verify_token(token)
        if payload.get("type") != "access":
            return None
        return payload
    except HTTPException:
        return None


def require_admin(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Dependency to require admin role.
    Use after get_current_user to enforce admin access.
    """
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )
    return user


async def rate_limit_dependency(request: Request):
    """
    Dependency to apply rate limiting based on client IP.
    """
    client_ip = request.client.host if request.client else "unknown"
    
    is_limited, remaining = rate_limiter.is_rate_limited(client_ip)
    
    if is_limited:
        retry_after = rate_limiter.get_retry_after(client_ip)
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please try again later.",
            headers={
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(RATE_LIMIT_REQUESTS),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(retry_after)
            }
        )
    
    return remaining


def get_security_headers() -> Dict[str, str]:
    """
    Returns security headers to be added to responses.
    """
    return {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com;",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
    }


def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password meets minimum security requirements.
    
    Requirements:
    - At least 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter"
    
    if not any(c.islower() for c in password):
        return False, "Password must contain at least one lowercase letter"
    
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one digit"
    
    special_chars = "!@#$%^&*()_+-=[]{}|;':\",./<>?"
    if not any(c in special_chars for c in password):
        return False, "Password must contain at least one special character"
    
    return True, ""


# Login attempt tracking for brute force protection
class LoginAttemptTracker:
    """
    Track failed login attempts for brute force protection.
    """
    
    def __init__(self, max_attempts: int = 5, lockout_minutes: int = 15):
        self.max_attempts = max_attempts
        self.lockout_seconds = lockout_minutes * 60
        self.attempts: Dict[str, list] = defaultdict(list)
        self.lockouts: Dict[str, float] = {}
        self._lock = threading.Lock()
    
    def record_attempt(self, identifier: str, success: bool) -> None:
        """Record a login attempt"""
        current_time = time.time()
        
        with self._lock:
            if success:
                # Clear attempts on successful login
                self.attempts[identifier] = []
                if identifier in self.lockouts:
                    del self.lockouts[identifier]
            else:
                # Record failed attempt
                self.attempts[identifier].append(current_time)
                
                # Clean old attempts
                window_start = current_time - self.lockout_seconds
                self.attempts[identifier] = [
                    t for t in self.attempts[identifier] if t > window_start
                ]
                
                # Check if should be locked out
                if len(self.attempts[identifier]) >= self.max_attempts:
                    self.lockouts[identifier] = current_time + self.lockout_seconds
    
    def is_locked_out(self, identifier: str) -> tuple[bool, int]:
        """
        Check if identifier is locked out.
        Returns (is_locked, seconds_remaining)
        """
        with self._lock:
            if identifier not in self.lockouts:
                return False, 0
            
            current_time = time.time()
            lockout_end = self.lockouts[identifier]
            
            if current_time >= lockout_end:
                del self.lockouts[identifier]
                self.attempts[identifier] = []
                return False, 0
            
            return True, int(lockout_end - current_time)


# Global login attempt tracker
login_tracker = LoginAttemptTracker(max_attempts=5, lockout_minutes=15)
