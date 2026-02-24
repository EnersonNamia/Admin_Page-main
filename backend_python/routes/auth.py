from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, EmailStr
from passlib.hash import bcrypt
from datetime import datetime, timezone
from models.database import execute_query, execute_query_one
from middleware.security import (
    create_access_token,
    get_current_user,
    login_tracker,
    rate_limit_dependency
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Pydantic models
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# Login endpoint with rate limiting and brute force protection
@router.post("/login")
async def login(
    credentials: LoginRequest,
    request: Request,
    _: int = Depends(rate_limit_dependency)
):
    # Get client identifier for brute force protection
    client_ip = request.client.host if request.client else "unknown"
    login_identifier = f"{client_ip}:{credentials.email}"
    
    # Check if locked out due to too many failed attempts
    is_locked, seconds_remaining = login_tracker.is_locked_out(login_identifier)
    if is_locked:
        raise HTTPException(
            status_code=429,
            detail=f"Too many failed login attempts. Please try again in {seconds_remaining // 60 + 1} minutes."
        )
    
    try:
        # Find user by email
        user = execute_query_one(
            """SELECT 
                user_id,
                username,
                CONCAT(first_name, ' ', last_name) as full_name,
                first_name,
                last_name,
                email,
                password_hash,
                academic_info->>'strand' as strand,
                CAST(academic_info->>'gwa' AS DECIMAL(5,2)) as gwa,
                is_active
            FROM users WHERE email = $1""",
            [credentials.email]
        )
        
        if not user:
            # Record failed attempt
            login_tracker.record_attempt(login_identifier, success=False)
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Verify password (bcrypt has a 72-byte limit, truncate if needed)
        password_to_check = credentials.password[:72]
        if not bcrypt.verify(password_to_check, user['password_hash']):
            # Record failed attempt
            login_tracker.record_attempt(login_identifier, success=False)
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Check if user is active (is_active can be BOOLEAN or INTEGER depending on DB schema)
        is_active = user['is_active']
        if is_active is False or is_active == 0:
            raise HTTPException(status_code=403, detail="Account is deactivated")
        
        # Record successful login
        login_tracker.record_attempt(login_identifier, success=True)
        
        # Update last_login timestamp
        current_time = datetime.now(timezone.utc)
        execute_query(
            "UPDATE users SET last_login = $1 WHERE user_id = $2",
            [current_time, user['user_id']],
            fetch=False
        )
        
        # Create JWT token with user data
        token_data = {
            "sub": str(user['user_id']),
            "user_id": user['user_id'],
            "email": user['email'],
            "username": user['username'],
            "full_name": user['full_name'],
            "role": "admin"  # Adjust based on your user roles
        }
        access_token = create_access_token(token_data)
        
        # Return user info (without password)
        return {
            "token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user['user_id'],
                "email": user['email'],
                "full_name": user['full_name'],
                "username": user['username'],
                "strand": user['strand'],
                "gwa": user['gwa']
            },
            "message": "Login successful"
        }
    
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Login failed: {str(error)}")


# Verify token endpoint - check if token is still valid
@router.get("/verify")
async def verify_token_endpoint(current_user: dict = Depends(get_current_user)):
    """Verify the current token is valid and return user info"""
    return {
        "valid": True,
        "user": {
            "id": current_user.get("user_id"),
            "email": current_user.get("email"),
            "full_name": current_user.get("full_name"),
            "username": current_user.get("username"),
            "role": current_user.get("role")
        }
    }


# Logout endpoint - requires authentication
@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """
    Logout endpoint. 
    Note: JWT tokens are stateless, so we can't truly invalidate them server-side
    without implementing a token blacklist. The client should remove the token.
    """
    try:
        # Log the logout event (optional)
        user_id = current_user.get("user_id")
        if user_id:
            execute_query(
                "UPDATE users SET last_login = $1 WHERE user_id = $2",
                [datetime.now(timezone.utc), user_id],
                fetch=False
            )
        return {"message": "Logout successful"}
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Logout failed: {str(error)}")
