from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional
import math
import os
import httpx
from models.database import execute_query, execute_query_one

router = APIRouter(prefix="/api/courses", tags=["courses"])

# Production CoursePro backend URL for cache invalidation
PRODUCTION_API_URL = os.getenv('PRODUCTION_API_URL', '')

async def invalidate_production_cache():
    """
    Call CoursePro production backend to invalidate its cache.
    This ensures that course changes made in Admin Panel are reflected immediately.
    """
    if not PRODUCTION_API_URL:
        print("[Cache] No PRODUCTION_API_URL configured, skipping production cache invalidation")
        return
    
    cache_key = os.getenv('CACHE_INVALIDATION_KEY', '')
    if not cache_key:
        print("[Cache] No CACHE_INVALIDATION_KEY configured, skipping cache invalidation")
        return
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Call the public cache invalidation endpoint with API key
            response = await client.post(
                f"{PRODUCTION_API_URL}/cache/invalidate",
                params={"api_key": cache_key}
            )
            if response.status_code == 200:
                print(f"[Cache] Production cache invalidated successfully (courses changed)")
            else:
                print(f"[Cache] Production cache invalidation returned status {response.status_code}: {response.text}")
    except Exception as e:
        print(f"[Cache] Failed to invalidate production cache: {e}")
        # Don't raise - this is a best-effort operation

# Pydantic models
class CourseCreate(BaseModel):
    course_name: str
    description: str
    required_strand: Optional[str] = None
    minimum_gwa: Optional[float] = Field(None, ge=75, le=100)
    trait_tag: Optional[str] = None

class CourseUpdate(BaseModel):
    course_name: Optional[str] = None
    description: Optional[str] = None
    required_strand: Optional[str] = None
    minimum_gwa: Optional[float] = Field(None, ge=75, le=100)
    trait_tag: Optional[str] = None

# Get all courses with pagination and search
@router.get("")
async def get_courses(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: str = Query(""),
    strand: str = Query("")
):
    try:
        offset = (page - 1) * limit
        
        query = "SELECT * FROM courses WHERE 1=1"
        count_query = "SELECT COUNT(*) as total FROM courses WHERE 1=1"
        params = []
        count_params = []
        param_index = 1
        
        # Add search filter
        if search:
            search_param = f"%{search}%"
            query += f" AND (course_name ILIKE ${param_index} OR description ILIKE ${param_index + 1})"
            count_query += f" AND (course_name ILIKE ${param_index} OR description ILIKE ${param_index + 1})"
            params.extend([search_param, search_param])
            count_params.extend([search_param, search_param])
            param_index += 2
        
        # Add strand filter
        if strand:
            query += f" AND required_strand = ${param_index}"
            count_query += f" AND required_strand = ${param_index}"
            params.append(strand)
            count_params.append(strand)
            param_index += 1
        
        query += f" ORDER BY course_id DESC LIMIT ${param_index} OFFSET ${param_index + 1}"
        params.extend([limit, offset])
        
        courses = execute_query(query, params)
        count_result = execute_query_one(count_query, count_params)
        total = int(count_result['total'])
        
        return {
            "courses": courses,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": math.ceil(total / limit)
            }
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to fetch courses: {str(error)}")

# Get course by ID
@router.get("/{course_id}")
async def get_course(course_id: int):
    try:
        course = execute_query_one('SELECT * FROM courses WHERE course_id = $1', [course_id])
        
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        return course
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to fetch course: {str(error)}")

# Create new course
@router.post("", status_code=201)
async def create_course(course: CourseCreate):
    try:
        result = execute_query_one(
            'INSERT INTO courses (course_name, description, required_strand, minimum_gwa, trait_tag) VALUES ($1, $2, $3, $4, $5) RETURNING course_id',
            [course.course_name, course.description, course.required_strand, course.minimum_gwa, course.trait_tag]
        )
        
        # Invalidate production cache so new course appears in recommendations
        await invalidate_production_cache()
        
        return {
            "message": "Course created successfully",
            "course_id": result['course_id']
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to create course: {str(error)}")

# Update course
@router.put("/{course_id}")
async def update_course(course_id: int, course: CourseUpdate):
    try:
        # Build dynamic update query - required_strand should be set directly (including null for "Any Strand")
        # Other fields use COALESCE to keep existing value if not provided
        result = execute_query(
            'UPDATE courses SET course_name = COALESCE($1, course_name), description = COALESCE($2, description), required_strand = $3, minimum_gwa = COALESCE($4, minimum_gwa), trait_tag = COALESCE($5, trait_tag) WHERE course_id = $6',
            [course.course_name, course.description, course.required_strand, course.minimum_gwa, course.trait_tag, course_id],
            fetch=False
        )
        
        if result == 0:
            raise HTTPException(status_code=404, detail="Course not found")
        
        # Invalidate production cache so course changes appear in recommendations
        await invalidate_production_cache()
        
        return {"message": "Course updated successfully"}
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to update course: {str(error)}")

# Delete course
@router.delete("/{course_id}")
async def delete_course(course_id: int):
    try:
        # First check if course exists
        course = execute_query_one('SELECT course_id FROM courses WHERE course_id = $1', [course_id])
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        # Delete related recommendations first (foreign key constraint)
        execute_query('DELETE FROM recommendations WHERE course_id = $1', [course_id], fetch=False)
        
        # Delete related recommendation_rules if table exists
        try:
            execute_query('DELETE FROM recommendation_rules WHERE recommended_course_id = $1', [course_id], fetch=False)
        except Exception:
            pass  # Table might not exist yet
        
        # Now delete the course
        result = execute_query('DELETE FROM courses WHERE course_id = $1', [course_id], fetch=False)
        
        if result == 0:
            raise HTTPException(status_code=404, detail="Course not found")
        
        # Invalidate production cache so deleted course is removed from recommendations
        await invalidate_production_cache()
        
        return {"message": "Course deleted successfully"}
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to delete course: {str(error)}")
