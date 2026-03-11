from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv
from models.database import get_db_pool, test_connection, close_all_connections
from routes import users, courses, tests, recommendations, analytics, feedback, auth
from middleware.security import get_security_headers

# Load environment variables
load_dotenv()


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Middleware to add security headers to all responses"""
    
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        
        # Add security headers
        security_headers = get_security_headers()
        for header_name, header_value in security_headers.items():
            response.headers[header_name] = header_value
        
        return response


# Lifespan context manager (replaces deprecated on_event)
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application startup and shutdown"""
    # Startup
    allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    try:
        get_db_pool()
        if test_connection():
            print("✅ Backend server started successfully")
            print(f"   Environment: {os.getenv('ENVIRONMENT', 'development')}")
            print(f"   CORS enabled for: {', '.join(allowed_origins)}")
    except Exception as error:
        print(f"❌ Failed to start server: {error}")
        raise error
    
    yield  # Application runs here
    
    # Shutdown
    close_all_connections()
    print("✅ Server shutdown complete")


# Create FastAPI app with lifespan
app = FastAPI(
    title="Course Recommendation System API",
    description="Backend API for Course Recommendation System Admin Panel",
    version="1.0.0",
    docs_url="/docs" if os.getenv("ENVIRONMENT") == "development" else None,
    redoc_url="/redoc" if os.getenv("ENVIRONMENT") == "development" else None,
    lifespan=lifespan,
    redirect_slashes=False,  # Prevent 307 redirects for trailing slashes
)

# Configure CORS
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add security headers middleware
app.add_middleware(SecurityHeadersMiddleware)

# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(courses.router)
app.include_router(tests.router)
app.include_router(recommendations.router)
app.include_router(analytics.router)
app.include_router(feedback.router)

# Health check endpoint
@app.get("/")
async def root():
    return {
        "message": "Course Recommendation System API",
        "status": "running",
        "version": "1.0.0"
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    try:
        if test_connection():
            return {"status": "healthy", "database": "connected"}
        else:
            raise HTTPException(status_code=503, detail="Database connection failed")
    except Exception as error:
        raise HTTPException(status_code=503, detail=f"Health check failed: {str(error)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 5000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
