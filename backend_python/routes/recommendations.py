from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
import math
from datetime import datetime
from models.database import execute_query, execute_query_one

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])

# ============================================================
# GENERATE RECOMMENDATIONS ENGINE
# ============================================================

class GenerateRequest(BaseModel):
    user_ids: Optional[List[int]] = None  # If None, generate for all students
    rule_ids: Optional[List[int]] = None  # If None, use all active rules
    overwrite_existing: bool = False  # If True, delete existing recommendations first

@router.post("/generate")
async def generate_recommendations(request: GenerateRequest = None):
    """
    Generate recommendations for students based on active rules.
    Matches students against rules considering:
    - GWA ranges
    - Strand matching
    - Trait scores from assessments
    - Overall assessment scores
    """
    try:
        if request is None:
            request = GenerateRequest()
        
        # Step 1: Get active rules (or specific rules if provided)
        rule_query = """
            SELECT 
                rr.*,
                c.course_name as recommended_course_name
            FROM recommendation_rules rr
            LEFT JOIN courses c ON rr.recommended_course_id = c.course_id
            WHERE rr.is_active = true
        """
        rule_params = []
        
        if request.rule_ids and len(request.rule_ids) > 0:
            placeholders = ', '.join([f'${i+1}' for i in range(len(request.rule_ids))])
            rule_query = f"""
                SELECT 
                    rr.*,
                    c.course_name as recommended_course_name
                FROM recommendation_rules rr
                LEFT JOIN courses c ON rr.recommended_course_id = c.course_id
                WHERE rr.rule_id IN ({placeholders})
            """
            rule_params = request.rule_ids
        
        rule_query += " ORDER BY rr.priority DESC"
        rules = execute_query(rule_query, rule_params)
        
        if not rules:
            return {
                "message": "No active rules found",
                "generated": 0,
                "skipped": 0,
                "details": []
            }
        
        # Step 2: Get students with their academic info and test scores
        student_query = """
            SELECT 
                u.user_id,
                CONCAT(u.first_name, ' ', u.last_name) as full_name,
                u.email,
                u.academic_info->>'strand' as strand,
                CAST(NULLIF(u.academic_info->>'gwa', '') AS DECIMAL(5,2)) as gwa,
                (
                    SELECT json_agg(json_build_object(
                        'attempt_id', ta.attempt_id,
                        'total_score', ta.total_score,
                        'trait_scores', ta.trait_scores,
                        'dominant_trait', ta.dominant_trait
                    ))
                    FROM test_attempts ta
                    WHERE ta.user_id = u.user_id
                    AND ta.status = 'completed'
                    ORDER BY ta.created_at DESC
                    LIMIT 1
                ) as latest_attempts
            FROM users u
            WHERE COALESCE(u.is_active, 1) = 1 AND u.role = 'student'
        """
        student_params = []
        
        if request.user_ids and len(request.user_ids) > 0:
            placeholders = ', '.join([f'${i+1}' for i in range(len(request.user_ids))])
            student_query = f"""
                SELECT 
                    u.user_id,
                    CONCAT(u.first_name, ' ', u.last_name) as full_name,
                    u.email,
                    u.academic_info->>'strand' as strand,
                    CAST(NULLIF(u.academic_info->>'gwa', '') AS DECIMAL(5,2)) as gwa,
                    (
                        SELECT json_agg(json_build_object(
                            'attempt_id', ta.attempt_id,
                            'total_score', ta.total_score,
                            'trait_scores', ta.trait_scores,
                            'dominant_trait', ta.dominant_trait
                        ))
                        FROM test_attempts ta
                        WHERE ta.user_id = u.user_id
                        AND ta.status = 'completed'
                        ORDER BY ta.created_at DESC
                        LIMIT 1
                    ) as latest_attempts
                FROM users u
                WHERE u.user_id IN ({placeholders})
            """
            student_params = request.user_ids
        
        students = execute_query(student_query, student_params)
        
        if not students:
            return {
                "message": "No eligible students found",
                "generated": 0,
                "skipped": 0,
                "details": []
            }
        
        # Step 3: Optionally clear existing recommendations
        if request.overwrite_existing:
            if request.user_ids and len(request.user_ids) > 0:
                placeholders = ', '.join([f'${i+1}' for i in range(len(request.user_ids))])
                execute_query(f"DELETE FROM recommendations WHERE user_id IN ({placeholders})", request.user_ids, fetch=False)
            else:
                execute_query("DELETE FROM recommendations", fetch=False)
        
        # Step 4: Match students against rules and generate recommendations
        generated = 0
        skipped = 0
        details = []
        
        for student in students:
            student_recommendations = []
            
            for rule in rules:
                matched = True
                reasoning_parts = []
                
                # Check GWA condition
                if rule.get('condition_type') in ['gwa', 'combined']:
                    if rule.get('gwa_min') is not None or rule.get('gwa_max') is not None:
                        student_gwa = float(student.get('gwa') or 0)
                        gwa_min = float(rule.get('gwa_min') or 0)
                        gwa_max = float(rule.get('gwa_max') or 100)
                        
                        if not (gwa_min <= student_gwa <= gwa_max):
                            matched = False
                        else:
                            reasoning_parts.append(f"GWA {student_gwa:.2f} is within range ({gwa_min}-{gwa_max})")
                
                # Check Strand condition
                if rule.get('condition_type') in ['strand', 'combined']:
                    if rule.get('strand'):
                        student_strand = (student.get('strand') or '').upper()
                        rule_strand = rule.get('strand').upper()
                        if student_strand != rule_strand:
                            matched = False
                        else:
                            reasoning_parts.append(f"Strand matches ({student_strand})")
                
                # Check Trait condition
                if rule.get('condition_type') in ['trait', 'combined']:
                    if rule.get('trait_tag'):
                        trait_matched = False
                        latest_attempts = student.get('latest_attempts') or []
                        
                        for attempt in latest_attempts if isinstance(latest_attempts, list) else []:
                            trait_scores = attempt.get('trait_scores') or {}
                            if isinstance(trait_scores, str):
                                import json
                                try:
                                    trait_scores = json.loads(trait_scores)
                                except:
                                    trait_scores = {}
                            
                            trait_score = trait_scores.get(rule.get('trait_tag'), 0)
                            min_score = rule.get('trait_min_score') or 0
                            
                            if trait_score >= min_score:
                                trait_matched = True
                                reasoning_parts.append(f"Trait '{rule.get('trait_tag')}' score {trait_score} >= {min_score}")
                                break
                        
                        if not trait_matched:
                            matched = False
                
                # Check Assessment Score condition
                if rule.get('condition_type') in ['assessment_score', 'combined']:
                    if rule.get('assessment_min_score') is not None or rule.get('assessment_max_score') is not None:
                        score_matched = False
                        latest_attempts = student.get('latest_attempts') or []
                        
                        for attempt in latest_attempts if isinstance(latest_attempts, list) else []:
                            total_score = attempt.get('total_score') or 0
                            min_score = rule.get('assessment_min_score') or 0
                            max_score = rule.get('assessment_max_score') or 100
                            
                            if min_score <= total_score <= max_score:
                                score_matched = True
                                reasoning_parts.append(f"Assessment score {total_score} is within range ({min_score}-{max_score})")
                                break
                        
                        if not score_matched:
                            matched = False
                
                # If matched, create recommendation
                if matched and rule.get('recommended_course_id'):
                    # Check if this recommendation already exists
                    existing = execute_query_one("""
                        SELECT recommendation_id FROM recommendations 
                        WHERE user_id = $1 AND course_id = $2
                    """, [student['user_id'], rule['recommended_course_id']])
                    
                    if existing and not request.overwrite_existing:
                        skipped += 1
                        continue
                    
                    # Build reasoning
                    reasoning = f"Rule: {rule['rule_name']}. " + ". ".join(reasoning_parts) if reasoning_parts else f"Matched rule: {rule['rule_name']}"
                    
                    # Get attempt_id if available
                    attempt_id = None
                    latest_attempts = student.get('latest_attempts') or []
                    if isinstance(latest_attempts, list) and len(latest_attempts) > 0:
                        attempt_id = latest_attempts[0].get('attempt_id')
                    
                    # Insert recommendation
                    result = execute_query_one("""
                        INSERT INTO recommendations (user_id, course_id, attempt_id, reasoning, status, recommended_at)
                        VALUES ($1, $2, $3, $4, 'pending', NOW())
                        ON CONFLICT (user_id, course_id) DO UPDATE SET
                            reasoning = EXCLUDED.reasoning,
                            attempt_id = EXCLUDED.attempt_id,
                            recommended_at = NOW(),
                            status = 'pending'
                        RETURNING recommendation_id
                    """, [student['user_id'], rule['recommended_course_id'], attempt_id, reasoning])
                    
                    generated += 1
                    student_recommendations.append({
                        "course": rule.get('recommended_course_name'),
                        "rule": rule['rule_name']
                    })
            
            if student_recommendations:
                details.append({
                    "user_id": student['user_id'],
                    "name": student['full_name'],
                    "recommendations": student_recommendations
                })
        
        return {
            "message": f"Generated {generated} recommendations for {len(details)} students",
            "generated": generated,
            "skipped": skipped,
            "students_processed": len(students),
            "rules_applied": len(rules),
            "details": details[:20]  # Limit details to first 20 students
        }
    except HTTPException:
        raise
    except Exception as error:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate recommendations: {str(error)}")

# Pydantic models for recommendation rules
class RuleCreate(BaseModel):
    rule_name: str
    description: Optional[str] = None
    condition_type: str  # 'gwa', 'strand', 'trait', 'assessment_score', 'combined'
    gwa_min: Optional[float] = None
    gwa_max: Optional[float] = None
    strand: Optional[str] = None
    trait_tag: Optional[str] = None
    trait_min_score: Optional[int] = None
    assessment_min_score: Optional[int] = None
    assessment_max_score: Optional[int] = None
    recommended_course_id: int
    priority: Optional[int] = 0
    is_active: Optional[bool] = True

class RuleUpdate(BaseModel):
    rule_name: Optional[str] = None
    description: Optional[str] = None
    condition_type: Optional[str] = None
    gwa_min: Optional[float] = None
    gwa_max: Optional[float] = None
    strand: Optional[str] = None
    trait_tag: Optional[str] = None
    trait_min_score: Optional[int] = None
    assessment_min_score: Optional[int] = None
    assessment_max_score: Optional[int] = None
    recommended_course_id: Optional[int] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None

# Status update model
class StatusUpdate(BaseModel):
    status: str  # 'pending', 'approved', 'rejected', 'completed'
    admin_notes: Optional[str] = None

# Full recommendation update model
class RecommendationUpdate(BaseModel):
    course_id: Optional[int] = None
    reasoning: Optional[str] = None
    status: Optional[str] = None
    admin_notes: Optional[str] = None

# Get all recommendations with pagination and filtering
@router.get("/")
async def get_recommendations(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    user_id: str = Query(""),
    course_id: str = Query("")
):
    try:
        offset = (page - 1) * limit
        
        query = """
            SELECT 
                r.recommendation_id,
                r.attempt_id,
                r.user_id,
                r.course_id,
                r.reasoning,
                r.recommended_at,
                CONCAT(u.first_name, ' ', u.last_name) as user_name,
                u.email as user_email,
                c.course_name
            FROM recommendations r
            JOIN users u ON r.user_id = u.user_id
            JOIN courses c ON r.course_id = c.course_id
            WHERE 1=1
        """
        count_query = 'SELECT COUNT(*) as total FROM recommendations r WHERE 1=1'
        params = []
        count_params = []
        param_index = 1
        
        # Add user filter
        if user_id:
            query += f" AND r.user_id = ${param_index}"
            count_query += f" AND user_id = ${param_index}"
            params.append(int(user_id))
            count_params.append(int(user_id))
            param_index += 1
        
        # Add course filter
        if course_id:
            query += f" AND r.course_id = ${param_index}"
            count_query += f" AND course_id = ${param_index}"
            params.append(int(course_id))
            count_params.append(int(course_id))
            param_index += 1
        
        query += f" ORDER BY r.recommended_at DESC LIMIT ${param_index} OFFSET ${param_index + 1}"
        params.extend([limit, offset])
        
        recommendations = execute_query(query, params)
        count_result = execute_query_one(count_query, count_params)
        total = int(count_result['total']) if count_result else 0
        
        return {
            "recommendations": recommendations or [],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": math.ceil(total / limit) if total > 0 else 1
            }
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to fetch recommendations: {str(error)}")

# Get recommendation by ID
@router.get("/{recommendation_id}")
async def get_recommendation(recommendation_id: int):
    try:
        recommendation = execute_query_one("""
            SELECT 
                r.*,
                CONCAT(u.first_name, ' ', u.last_name) as user_name,
                u.email as user_email,
                c.course_name,
                c.description as course_description
            FROM recommendations r
            JOIN users u ON r.user_id = u.user_id
            JOIN courses c ON r.course_id = c.course_id
            WHERE r.recommendation_id = $1
        """, [recommendation_id])
        
        if not recommendation:
            raise HTTPException(status_code=404, detail="Recommendation not found")
        
        return recommendation
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to fetch recommendation: {str(error)}")

# ============================================================
# RECOMMENDATION RULES ENDPOINTS
# ============================================================

# Get all recommendation rules
@router.get("/rules/all")
async def get_rules(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    is_active: Optional[str] = Query(None)
):
    try:
        offset = (page - 1) * limit
        
        query = """
            SELECT 
                rr.*,
                c.course_name as recommended_course_name
            FROM recommendation_rules rr
            LEFT JOIN courses c ON rr.recommended_course_id = c.course_id
            WHERE 1=1
        """
        count_query = "SELECT COUNT(*) as total FROM recommendation_rules WHERE 1=1"
        params = []
        count_params = []
        param_index = 1
        
        if is_active is not None:
            active_bool = is_active.lower() == 'true'
            query += f" AND rr.is_active = ${param_index}"
            count_query += f" AND is_active = ${param_index}"
            params.append(active_bool)
            count_params.append(active_bool)
            param_index += 1
        
        query += f" ORDER BY rr.priority DESC, rr.created_at DESC LIMIT ${param_index} OFFSET ${param_index + 1}"
        params.extend([limit, offset])
        
        rules = execute_query(query, params)
        count_result = execute_query_one(count_query, count_params)
        total = int(count_result['total']) if count_result else 0
        
        return {
            "rules": rules or [],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": math.ceil(total / limit) if total > 0 else 1
            }
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to fetch rules: {str(error)}")

# Get single rule by ID
@router.get("/rules/{rule_id}")
async def get_rule(rule_id: int):
    try:
        rule = execute_query_one("""
            SELECT 
                rr.*,
                c.course_name as recommended_course_name
            FROM recommendation_rules rr
            LEFT JOIN courses c ON rr.recommended_course_id = c.course_id
            WHERE rr.rule_id = $1
        """, [rule_id])
        
        if not rule:
            raise HTTPException(status_code=404, detail="Rule not found")
        
        return rule
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to fetch rule: {str(error)}")

# Create a new rule
@router.post("/rules", status_code=201)
async def create_rule(rule: RuleCreate):
    try:
        # Verify course exists
        course = execute_query_one("SELECT course_id FROM courses WHERE course_id = $1", [rule.recommended_course_id])
        if not course:
            raise HTTPException(status_code=400, detail="Recommended course not found")
        
        result = execute_query_one("""
            INSERT INTO recommendation_rules (
                rule_name, description, condition_type,
                gwa_min, gwa_max, strand,
                trait_tag, trait_min_score,
                assessment_min_score, assessment_max_score,
                recommended_course_id, priority, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING rule_id
        """, [
            rule.rule_name, rule.description, rule.condition_type,
            rule.gwa_min, rule.gwa_max, rule.strand,
            rule.trait_tag, rule.trait_min_score,
            rule.assessment_min_score, rule.assessment_max_score,
            rule.recommended_course_id, rule.priority, rule.is_active
        ])
        
        return {
            "message": "Rule created successfully",
            "rule_id": result['rule_id']
        }
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to create rule: {str(error)}")

# Update a rule
@router.put("/rules/{rule_id}")
async def update_rule(rule_id: int, rule: RuleUpdate):
    try:
        # Check if rule exists
        existing = execute_query_one("SELECT rule_id FROM recommendation_rules WHERE rule_id = $1", [rule_id])
        if not existing:
            raise HTTPException(status_code=404, detail="Rule not found")
        
        # Build dynamic update query
        updates = []
        params = []
        param_index = 1
        
        fields = {
            'rule_name': rule.rule_name,
            'description': rule.description,
            'condition_type': rule.condition_type,
            'gwa_min': rule.gwa_min,
            'gwa_max': rule.gwa_max,
            'strand': rule.strand,
            'trait_tag': rule.trait_tag,
            'trait_min_score': rule.trait_min_score,
            'assessment_min_score': rule.assessment_min_score,
            'assessment_max_score': rule.assessment_max_score,
            'recommended_course_id': rule.recommended_course_id,
            'priority': rule.priority,
            'is_active': rule.is_active
        }
        
        for field, value in fields.items():
            if value is not None:
                updates.append(f"{field} = ${param_index}")
                params.append(value)
                param_index += 1
        
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Add updated_at
        updates.append(f"updated_at = ${param_index}")
        params.append(datetime.now())
        param_index += 1
        
        # Add rule_id for WHERE clause
        params.append(rule_id)
        
        query = f"UPDATE recommendation_rules SET {', '.join(updates)} WHERE rule_id = ${param_index}"
        execute_query(query, params, fetch=False)
        
        return {"message": "Rule updated successfully"}
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to update rule: {str(error)}")

# Delete a rule
@router.delete("/rules/{rule_id}")
async def delete_rule(rule_id: int):
    try:
        # Check if rule exists
        existing = execute_query_one("SELECT rule_id FROM recommendation_rules WHERE rule_id = $1", [rule_id])
        if not existing:
            raise HTTPException(status_code=404, detail="Rule not found")
        
        execute_query("DELETE FROM recommendation_rules WHERE rule_id = $1", [rule_id], fetch=False)
        
        return {"message": "Rule deleted successfully"}
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to delete rule: {str(error)}")

# Toggle rule active status
@router.patch("/rules/{rule_id}/toggle")
async def toggle_rule(rule_id: int):
    try:
        # Get current status
        rule = execute_query_one("SELECT is_active FROM recommendation_rules WHERE rule_id = $1", [rule_id])
        if not rule:
            raise HTTPException(status_code=404, detail="Rule not found")
        
        new_status = not rule['is_active']
        execute_query(
            "UPDATE recommendation_rules SET is_active = $1, updated_at = $2 WHERE rule_id = $3",
            [new_status, datetime.now(), rule_id],
            fetch=False
        )
        
        return {
            "message": f"Rule {'activated' if new_status else 'deactivated'} successfully",
            "is_active": new_status
        }
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to toggle rule: {str(error)}")

# Get available traits for rule conditions
@router.get("/rules/options/traits")
async def get_available_traits():
    try:
        traits = execute_query("SELECT DISTINCT trait_tag FROM options WHERE trait_tag IS NOT NULL ORDER BY trait_tag")
        return {"traits": [t['trait_tag'] for t in traits if t.get('trait_tag')]}
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to fetch traits: {str(error)}")

# Get available strands for rule conditions
@router.get("/rules/options/strands")
async def get_available_strands():
    return {"strands": ["STEM", "HUMSS", "ABM", "TVL"]}

# ============================================================
# RECOMMENDATION STATUS ENDPOINTS
# ============================================================

# Update recommendation status
@router.put("/{recommendation_id}/status")
async def update_recommendation_status(recommendation_id: int, status_update: StatusUpdate):
    try:
        # Validate status value
        valid_statuses = ['pending', 'approved', 'rejected', 'completed']
        if status_update.status.lower() not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
        
        # Check if recommendation exists
        existing = execute_query_one(
            "SELECT recommendation_id, status FROM recommendations WHERE recommendation_id = $1", 
            [recommendation_id]
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Recommendation not found")
        
        old_status = existing.get('status', 'pending')
        new_status = status_update.status.lower()
        
        # Update the status
        execute_query("""
            UPDATE recommendations 
            SET status = $1, 
                status_updated_at = $2, 
                admin_notes = COALESCE($3, admin_notes),
                updated_by = 'admin'
            WHERE recommendation_id = $4
        """, [new_status, datetime.now(), status_update.admin_notes, recommendation_id], fetch=False)
        
        return {
            "message": f"Status updated from '{old_status}' to '{new_status}'",
            "recommendation_id": recommendation_id,
            "old_status": old_status,
            "new_status": new_status
        }
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to update status: {str(error)}")

# ============================================================
# EDIT/MODIFY RECOMMENDATION ENDPOINTS
# ============================================================

# Get single recommendation details for editing
@router.get("/detail/{recommendation_id}")
async def get_recommendation_detail(recommendation_id: int):
    try:
        recommendation = execute_query_one("""
            SELECT 
                r.*,
                CONCAT(u.first_name, ' ', u.last_name) as user_name,
                u.email as user_email,
                u.academic_info->>'strand' as user_strand,
                u.academic_info->>'gwa' as user_gwa,
                c.course_name,
                c.description as course_description
            FROM recommendations r
            JOIN users u ON r.user_id = u.user_id
            JOIN courses c ON r.course_id = c.course_id
            WHERE r.recommendation_id = $1
        """, [recommendation_id])
        
        if not recommendation:
            raise HTTPException(status_code=404, detail="Recommendation not found")
        
        return recommendation
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to fetch recommendation: {str(error)}")

# Update recommendation (full edit)
@router.put("/edit/{recommendation_id}")
async def update_recommendation(recommendation_id: int, update: RecommendationUpdate):
    try:
        # Check if recommendation exists
        existing = execute_query_one(
            "SELECT * FROM recommendations WHERE recommendation_id = $1",
            [recommendation_id]
        )
        
        if not existing:
            raise HTTPException(status_code=404, detail="Recommendation not found")
        
        # Build dynamic update query
        update_fields = []
        params = []
        param_index = 1
        new_status = None
        
        if update.course_id is not None:
            # Verify course exists
            course = execute_query_one("SELECT course_id FROM courses WHERE course_id = $1", [update.course_id])
            if not course:
                raise HTTPException(status_code=400, detail="Course not found")
            update_fields.append(f"course_id = ${param_index}")
            params.append(update.course_id)
            param_index += 1
        
        if update.reasoning is not None:
            update_fields.append(f"reasoning = ${param_index}")
            params.append(update.reasoning)
            param_index += 1
        
        if update.status is not None:
            valid_statuses = ['pending', 'approved', 'rejected', 'completed']
            if update.status.lower() not in valid_statuses:
                raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
            new_status = update.status.lower()
            update_fields.append(f"status = ${param_index}")
            params.append(new_status)
            param_index += 1
            update_fields.append(f"status_updated_at = ${param_index}")
            params.append(datetime.now())
            param_index += 1
        
        if update.admin_notes is not None:
            update_fields.append(f"admin_notes = ${param_index}")
            params.append(update.admin_notes)
            param_index += 1
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Add updated_by
        update_fields.append(f"updated_by = ${param_index}")
        params.append('admin')
        param_index += 1
        
        # Add recommendation_id for WHERE clause
        params.append(recommendation_id)
        
        query = f"""
            UPDATE recommendations 
            SET {', '.join(update_fields)}
            WHERE recommendation_id = ${param_index}
        """
        
        execute_query(query, params, fetch=False)
        
        # If status was updated, also update all other recommendations for the same attempt
        if new_status is not None and existing.get('attempt_id'):
            execute_query("""
                UPDATE recommendations 
                SET status = $1, status_updated_at = $2, updated_by = 'admin'
                WHERE attempt_id = $3 AND recommendation_id != $4
            """, [new_status, datetime.now(), existing['attempt_id'], recommendation_id], fetch=False)
        
        # Fetch updated recommendation
        updated = execute_query_one("""
            SELECT r.*, c.course_name 
            FROM recommendations r 
            JOIN courses c ON r.course_id = c.course_id 
            WHERE r.recommendation_id = $1
        """, [recommendation_id])
        
        return {
            "message": "Recommendation updated successfully",
            "recommendation": updated
        }
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to update recommendation: {str(error)}")

# Delete recommendation
@router.delete("/delete/{recommendation_id}")
async def delete_recommendation(recommendation_id: int):
    try:
        # Check if recommendation exists
        existing = execute_query_one(
            "SELECT recommendation_id FROM recommendations WHERE recommendation_id = $1",
            [recommendation_id]
        )
        
        if not existing:
            raise HTTPException(status_code=404, detail="Recommendation not found")
        
        execute_query(
            "DELETE FROM recommendations WHERE recommendation_id = $1",
            [recommendation_id],
            fetch=False
        )
        
        return {
            "message": "Recommendation deleted successfully",
            "recommendation_id": recommendation_id
        }
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to delete recommendation: {str(error)}")

# Bulk update model
class BulkUpdateRequest(BaseModel):
    recommendation_ids: List[int]
    status: str
    admin_notes: Optional[str] = None

# Bulk update recommendation statuses (POST endpoint for frontend)
@router.post("/bulk-update")
async def bulk_update_recommendations(request: BulkUpdateRequest):
    try:
        valid_statuses = ['pending', 'approved', 'rejected', 'completed']
        if request.status.lower() not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
        
        if not request.recommendation_ids or len(request.recommendation_ids) == 0:
            raise HTTPException(status_code=400, detail="No recommendation IDs provided")
        
        updated_count = 0
        failed_ids = []
        
        for rec_id in request.recommendation_ids:
            try:
                result = execute_query("""
                    UPDATE recommendations 
                    SET status = $1, status_updated_at = $2, admin_notes = COALESCE($3, admin_notes), updated_by = 'admin'
                    WHERE recommendation_id = $4
                    RETURNING recommendation_id
                """, [request.status.lower(), datetime.now(), request.admin_notes, rec_id])
                if result:
                    updated_count += 1
                else:
                    failed_ids.append(rec_id)
            except Exception as e:
                failed_ids.append(rec_id)
        
        return {
            "message": f"Successfully updated {updated_count} recommendation(s) to '{request.status}'",
            "updated_count": updated_count,
            "failed_count": len(failed_ids),
            "failed_ids": failed_ids if failed_ids else None
        }
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to bulk update: {str(error)}")

# Bulk update recommendation statuses (PUT endpoint - legacy)
@router.put("/bulk/status")
async def bulk_update_status(recommendation_ids: list[int], status: str, admin_notes: Optional[str] = None):
    try:
        valid_statuses = ['pending', 'approved', 'rejected', 'completed']
        if status.lower() not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
        
        updated_count = 0
        for rec_id in recommendation_ids:
            try:
                execute_query("""
                    UPDATE recommendations 
                    SET status = $1, status_updated_at = $2, admin_notes = $3, updated_by = 'admin'
                    WHERE recommendation_id = $4
                """, [status.lower(), datetime.now(), admin_notes, rec_id], fetch=False)
                updated_count += 1
            except:
                pass
        
        return {
            "message": f"Updated {updated_count} recommendations to '{status}'",
            "updated_count": updated_count
        }
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to bulk update: {str(error)}")

# Get recommendation status statistics (counts unique assessments by top recommendation status)
@router.get("/stats/status")
async def get_status_stats():
    try:
        # Count unique assessments by the status of their top (rank 1) recommendation
        stats = execute_query("""
            SELECT 
                COALESCE(status, 'pending') as status,
                COUNT(DISTINCT attempt_id) as count
            FROM recommendations
            WHERE recommendation_rank = 1 OR recommendation_rank IS NULL
            GROUP BY COALESCE(status, 'pending')
            ORDER BY status
        """)
        
        # Convert to dict
        status_counts = {s['status']: int(s['count']) for s in stats}
        
        # Ensure all statuses are represented
        all_statuses = ['pending', 'approved', 'rejected', 'completed']
        for status in all_statuses:
            if status not in status_counts:
                status_counts[status] = 0
        
        total = sum(status_counts.values())
        
        return {
            "stats": status_counts,
            "total": total
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(error)}")

# Get recommendations by status with filtering - grouped by assessment
@router.get("/filter/status/{status}")
async def get_recommendations_by_status(
    status: str,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100)
):
    try:
        valid_statuses = ['pending', 'approved', 'rejected', 'completed', 'all']
        if status.lower() not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
        
        offset = (page - 1) * limit
        
        # Base query includes recommendation_rank
        if status.lower() == 'all':
            query = """
                SELECT 
                    r.*,
                    r.recommendation_rank,
                    CONCAT(u.first_name, ' ', u.last_name) as user_name,
                    u.email as user_email,
                    c.course_name,
                    c.description as course_description,
                    ta.questions_answered as assessment_score,
                    ta.questions_presented as total_questions,
                    ta.confidence_score,
                    (SELECT COUNT(DISTINCT o.trait_tag) 
                     FROM student_answers sa 
                     JOIN options o ON sa.chosen_option_id = o.option_id 
                     WHERE sa.attempt_id = r.attempt_id AND o.trait_tag IS NOT NULL) as traits_found,
                    ta.taken_at as assessment_date
                FROM recommendations r
                JOIN users u ON r.user_id = u.user_id
                JOIN courses c ON r.course_id = c.course_id
                LEFT JOIN test_attempts ta ON r.attempt_id = ta.attempt_id
                ORDER BY r.attempt_id DESC, r.recommendation_rank ASC
            """
            count_query = "SELECT COUNT(DISTINCT attempt_id) as total FROM recommendations WHERE attempt_id IS NOT NULL"
            all_recommendations = execute_query(query)
            count_result = execute_query_one(count_query)
        else:
            query = """
                SELECT 
                    r.*,
                    r.recommendation_rank,
                    CONCAT(u.first_name, ' ', u.last_name) as user_name,
                    u.email as user_email,
                    c.course_name,
                    c.description as course_description,
                    ta.questions_answered as assessment_score,
                    ta.questions_presented as total_questions,
                    ta.confidence_score,
                    (SELECT COUNT(DISTINCT o.trait_tag) 
                     FROM student_answers sa 
                     JOIN options o ON sa.chosen_option_id = o.option_id 
                     WHERE sa.attempt_id = r.attempt_id AND o.trait_tag IS NOT NULL) as traits_found,
                    ta.taken_at as assessment_date
                FROM recommendations r
                JOIN users u ON r.user_id = u.user_id
                JOIN courses c ON r.course_id = c.course_id
                LEFT JOIN test_attempts ta ON r.attempt_id = ta.attempt_id
                WHERE COALESCE(r.status, 'pending') = $1
                ORDER BY r.attempt_id DESC, r.recommendation_rank ASC
            """
            count_query = "SELECT COUNT(DISTINCT attempt_id) as total FROM recommendations WHERE COALESCE(status, 'pending') = $1 AND attempt_id IS NOT NULL"
            all_recommendations = execute_query(query, [status.lower()])
            count_result = execute_query_one(count_query, [status.lower()])
        
        # Helper function to extract match percentage from reasoning field
        import re
        def extract_match_percentage(reasoning):
            """Extract match percentage from reasoning text (e.g., 'Match: 94.0%')"""
            if not reasoning:
                return 0.0
            match = re.search(r'Match:\s*([\d.]+)%', str(reasoning))
            if match:
                return float(match.group(1))
            return 0.0
        
        # Group recommendations by attempt_id - collect all first, then sort
        grouped_by_attempt = {}
        for rec in all_recommendations or []:
            attempt_id = rec.get('attempt_id')
            if attempt_id is None:
                attempt_id = f"no_attempt_{rec.get('recommendation_id')}"
            
            if attempt_id not in grouped_by_attempt:
                grouped_by_attempt[attempt_id] = {
                    'attempt_id': rec.get('attempt_id'),
                    'user_id': rec.get('user_id'),
                    'user_name': rec.get('user_name'),
                    'user_email': rec.get('user_email'),
                    'assessment_score': rec.get('assessment_score'),
                    'total_questions': rec.get('total_questions'),
                    'confidence_score': rec.get('confidence_score'),
                    'traits_found': rec.get('traits_found'),
                    'assessment_date': rec.get('assessment_date'),
                    'all_recommendations': []  # Collect all recommendations first
                }
            
            rec_data = {
                'recommendation_id': rec.get('recommendation_id'),
                'course_id': rec.get('course_id'),
                'course_name': rec.get('course_name'),
                'course_description': rec.get('course_description'),
                'reasoning': rec.get('reasoning'),
                'status': rec.get('status') or 'pending',
                'recommendation_rank': rec.get('recommendation_rank') or 1,
                'recommended_at': rec.get('recommended_at'),
                'admin_notes': rec.get('admin_notes'),
                'match_percentage': extract_match_percentage(rec.get('reasoning'))
            }
            
            grouped_by_attempt[attempt_id]['all_recommendations'].append(rec_data)
        
        # Sort by match_percentage descending and assign top_recommendation and other_recommendations
        for attempt_id in grouped_by_attempt:
            all_recs = grouped_by_attempt[attempt_id]['all_recommendations']
            # Sort by match percentage descending (highest match first)
            all_recs.sort(key=lambda x: x.get('match_percentage', 0), reverse=True)
            
            # Assign proper ranks based on sorted order
            for idx, rec in enumerate(all_recs):
                rec['recommendation_rank'] = idx + 1
            
            # First one is top recommendation, rest are other recommendations
            if all_recs:
                grouped_by_attempt[attempt_id]['top_recommendation'] = all_recs[0]
                grouped_by_attempt[attempt_id]['other_recommendations'] = all_recs[1:]
            else:
                grouped_by_attempt[attempt_id]['top_recommendation'] = None
                grouped_by_attempt[attempt_id]['other_recommendations'] = []
            
            # Remove the temporary all_recommendations field
            del grouped_by_attempt[attempt_id]['all_recommendations']
        
        # Convert to list and paginate
        grouped_list = list(grouped_by_attempt.values())
        total = len(grouped_list)
        paginated = grouped_list[offset:offset + limit]
        
        return {
            "recommendations": paginated,
            "status_filter": status,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": math.ceil(total / limit) if total > 0 else 1
            }
        }
    except HTTPException:
        raise
    except Exception as error:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch recommendations: {str(error)}")


# ============================================================
# VIEW HISTORY ENDPOINTS
# ============================================================

# Get recommendation history with date filtering
@router.get("/history")
async def get_recommendation_history(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    user_id: Optional[int] = Query(None),
    course_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None)
):
    """
    Get recommendation history with advanced filtering.
    Supports date range, user, course, and status filtering.
    """
    try:
        offset = (page - 1) * limit
        
        query = """
            SELECT 
                r.recommendation_id,
                r.user_id,
                r.course_id,
                r.reasoning,
                r.status,
                r.recommended_at,
                r.status_updated_at,
                r.admin_notes,
                CONCAT(u.first_name, ' ', u.last_name) as user_name,
                u.email as user_email,
                c.course_name,
                DATE(r.recommended_at) as recommendation_date
            FROM recommendations r
            JOIN users u ON r.user_id = u.user_id
            JOIN courses c ON r.course_id = c.course_id
            WHERE 1=1
        """
        count_query = """
            SELECT COUNT(*) as total 
            FROM recommendations r
            WHERE 1=1
        """
        params = []
        count_params = []
        param_index = 1
        
        # Date range filters
        if start_date:
            query += f" AND r.recommended_at >= ${param_index}::timestamp"
            count_query += f" AND r.recommended_at >= ${param_index}::timestamp"
            params.append(start_date)
            count_params.append(start_date)
            param_index += 1
        
        if end_date:
            query += f" AND r.recommended_at <= ${param_index}::timestamp + interval '1 day'"
            count_query += f" AND r.recommended_at <= ${param_index}::timestamp + interval '1 day'"
            params.append(end_date)
            count_params.append(end_date)
            param_index += 1
        
        # User filter
        if user_id:
            query += f" AND r.user_id = ${param_index}"
            count_query += f" AND r.user_id = ${param_index}"
            params.append(user_id)
            count_params.append(user_id)
            param_index += 1
        
        # Course filter
        if course_id:
            query += f" AND r.course_id = ${param_index}"
            count_query += f" AND r.course_id = ${param_index}"
            params.append(course_id)
            count_params.append(course_id)
            param_index += 1
        
        # Status filter
        if status and status.lower() != 'all':
            query += f" AND COALESCE(r.status, 'pending') = ${param_index}"
            count_query += f" AND COALESCE(r.status, 'pending') = ${param_index}"
            params.append(status.lower())
            count_params.append(status.lower())
            param_index += 1
        
        query += f" ORDER BY r.recommended_at DESC LIMIT ${param_index} OFFSET ${param_index + 1}"
        params.extend([limit, offset])
        
        recommendations = execute_query(query, params)
        count_result = execute_query_one(count_query, count_params)
        total = int(count_result['total']) if count_result else 0
        
        # Group by date for timeline view
        grouped = {}
        for rec in recommendations or []:
            date_key = str(rec.get('recommendation_date', 'Unknown'))
            if date_key not in grouped:
                grouped[date_key] = []
            grouped[date_key].append(rec)
        
        return {
            "recommendations": recommendations or [],
            "grouped_by_date": grouped,
            "filters": {
                "start_date": start_date,
                "end_date": end_date,
                "user_id": user_id,
                "course_id": course_id,
                "status": status
            },
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": math.ceil(total / limit) if total > 0 else 1
            }
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to fetch history: {str(error)}")

# Get history summary/timeline
@router.get("/history/timeline")
async def get_history_timeline(
    days: int = Query(30, ge=1, le=365)
):
    """
    Get recommendation timeline showing counts per day.
    """
    try:
        timeline = execute_query("""
            SELECT 
                DATE(recommended_at) as date,
                COUNT(*) as count,
                COUNT(CASE WHEN COALESCE(status, 'pending') = 'approved' THEN 1 END) as approved,
                COUNT(CASE WHEN COALESCE(status, 'pending') = 'pending' THEN 1 END) as pending,
                COUNT(CASE WHEN COALESCE(status, 'pending') = 'rejected' THEN 1 END) as rejected,
                COUNT(CASE WHEN COALESCE(status, 'pending') = 'completed' THEN 1 END) as completed
            FROM recommendations
            WHERE recommended_at >= CURRENT_DATE - $1 * INTERVAL '1 day'
            GROUP BY DATE(recommended_at)
            ORDER BY date DESC
        """, [days])
        
        return {
            "timeline": timeline or [],
            "period_days": days
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to fetch timeline: {str(error)}")

# ============================================================
# EXPORT REPORTS ENDPOINTS
# ============================================================

from fastapi.responses import StreamingResponse
import csv
import io

@router.get("/export/csv")
async def export_recommendations_csv(
    status: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    """
    Export recommendations to CSV format.
    """
    try:
        query = """
            SELECT 
                r.recommendation_id,
                CONCAT(u.first_name, ' ', u.last_name) as student_name,
                u.email as student_email,
                u.academic_info->>'strand' as strand,
                u.academic_info->>'gwa' as gwa,
                c.course_name,
                r.reasoning,
                COALESCE(r.status, 'pending') as status,
                r.recommended_at,
                r.status_updated_at,
                r.admin_notes
            FROM recommendations r
            JOIN users u ON r.user_id = u.user_id
            JOIN courses c ON r.course_id = c.course_id
            WHERE 1=1
        """
        params = []
        param_index = 1
        
        if status and status.lower() != 'all':
            query += f" AND COALESCE(r.status, 'pending') = ${param_index}"
            params.append(status.lower())
            param_index += 1
        
        if start_date:
            query += f" AND r.recommended_at >= ${param_index}::timestamp"
            params.append(start_date)
            param_index += 1
        
        if end_date:
            query += f" AND r.recommended_at <= ${param_index}::timestamp + interval '1 day'"
            params.append(end_date)
            param_index += 1
        
        query += " ORDER BY r.recommended_at DESC"
        
        recommendations = execute_query(query, params)
        
        # Create CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow([
            'ID', 'Student Name', 'Email', 'Strand', 'GWA', 
            'Recommended Course', 'Reasoning', 'Status', 
            'Recommended Date', 'Status Updated', 'Admin Notes'
        ])
        
        # Write data
        for rec in recommendations or []:
            writer.writerow([
                rec.get('recommendation_id', ''),
                rec.get('student_name', ''),
                rec.get('student_email', ''),
                rec.get('strand', ''),
                rec.get('gwa', ''),
                rec.get('course_name', ''),
                rec.get('reasoning', ''),
                rec.get('status', 'pending'),
                str(rec.get('recommended_at', ''))[:19] if rec.get('recommended_at') else '',
                str(rec.get('status_updated_at', ''))[:19] if rec.get('status_updated_at') else '',
                rec.get('admin_notes', '')
            ])
        
        output.seek(0)
        
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=recommendations_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            }
        )
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to export CSV: {str(error)}")

@router.get("/export/summary")
async def get_export_summary():
    """
    Get a summary report of recommendations for dashboard/printing.
    """
    try:
        # Overall stats
        overall = execute_query_one("""
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN COALESCE(status, 'pending') = 'pending' THEN 1 END) as pending,
                COUNT(CASE WHEN COALESCE(status, 'pending') = 'approved' THEN 1 END) as approved,
                COUNT(CASE WHEN COALESCE(status, 'pending') = 'rejected' THEN 1 END) as rejected,
                COUNT(CASE WHEN COALESCE(status, 'pending') = 'completed' THEN 1 END) as completed,
                COUNT(DISTINCT user_id) as unique_students,
                COUNT(DISTINCT course_id) as unique_courses
            FROM recommendations
        """)
        
        # Top recommended courses
        top_courses = execute_query("""
            SELECT 
                c.course_name,
                COUNT(*) as recommendation_count,
                COUNT(CASE WHEN COALESCE(r.status, 'pending') = 'approved' THEN 1 END) as approved_count
            FROM recommendations r
            JOIN courses c ON r.course_id = c.course_id
            GROUP BY c.course_id, c.course_name
            ORDER BY recommendation_count DESC
            LIMIT 10
        """)
        
        # Recent activity
        recent = execute_query("""
            SELECT 
                DATE(recommended_at) as date,
                COUNT(*) as count
            FROM recommendations
            WHERE recommended_at >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY DATE(recommended_at)
            ORDER BY date DESC
        """)
        
        return {
            "summary": {
                "total_recommendations": overall['total'] if overall else 0,
                "pending": overall['pending'] if overall else 0,
                "approved": overall['approved'] if overall else 0,
                "rejected": overall['rejected'] if overall else 0,
                "completed": overall['completed'] if overall else 0,
                "unique_students": overall['unique_students'] if overall else 0,
                "unique_courses": overall['unique_courses'] if overall else 0
            },
            "top_courses": top_courses or [],
            "recent_activity": recent or [],
            "generated_at": datetime.now().isoformat()
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to generate summary: {str(error)}")

