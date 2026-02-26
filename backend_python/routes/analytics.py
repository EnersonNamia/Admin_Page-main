from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from models.database import execute_query, execute_query_one
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

# Get system analytics overview
@router.get("/system/overview")
async def get_system_overview():
    try:
        # Combined query for all counts and stats - Optimized from 5 queries to 1
        stats = execute_query_one("""
            SELECT 
                (SELECT COUNT(*) FROM users) as user_count,
                (SELECT COUNT(*) FROM courses) as course_count,
                (SELECT COUNT(*) FROM tests) as test_count,
                (SELECT COUNT(*) FROM recommendations) as recommendation_count,
                (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '30 days') as recent_users,
                (SELECT COUNT(*) FROM recommendations WHERE recommended_at >= NOW() - INTERVAL '30 days') as recent_recommendations,
                (SELECT COUNT(*) FROM recommendations) as total_recommendations,
                (SELECT COUNT(CASE WHEN status = 'accepted' THEN 1 END) FROM recommendations) as accepted,
                (SELECT COUNT(CASE WHEN status = 'rejected' THEN 1 END) FROM recommendations) as rejected,
                (SELECT COUNT(CASE WHEN status = 'pending' THEN 1 END) FROM recommendations) as pending
        """)
        
        total_recs = stats['recommendation_count']
        accepted = stats['accepted'] or 0
        acceptance_rate = (accepted / total_recs * 100) if total_recs > 0 else 0
        
        return {
            "system_overview": {
                "total_users": int(stats['user_count']),
                "total_courses": int(stats['course_count']),
                "total_tests": int(stats['test_count']),
                "total_recommendations": int(stats['recommendation_count'])
            },
            "recent_activity": {
                "new_users_30d": int(stats['recent_users']),
                "new_recommendations_30d": int(stats['recent_recommendations'])
            },
            "system_performance": {
                "total": int(stats['total_recommendations']),
                "accepted": int(stats['accepted']),
                "rejected": int(stats['rejected']),
                "pending": int(stats['pending']),
                "acceptance_rate": round(acceptance_rate, 2)
            }
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to fetch system analytics: {str(error)}")


# ========== ADMIN ANALYTICS API ENDPOINTS ==========

@router.get("/admin/overview")
async def get_admin_analytics_overview():
    """
    Get system-wide analytics for admin dashboard
    - Total assessments taken
    - Total recommendations generated
    - Total users active
    - System health metrics
    """
    try:
        # Combined query - optimized from 3 separate queries to 1
        stats = execute_query_one("""
            SELECT 
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM test_attempts ta
                    JOIN tests t ON ta.test_id = t.test_id
                    WHERE t.test_type = 'adaptive') as total_adaptive,
                (SELECT COUNT(*) FROM test_attempts ta
                    JOIN tests t ON ta.test_id = t.test_id
                    WHERE t.test_type = 'assessment') as total_assessment,
                (SELECT COUNT(*) FROM recommendations) as total_recommendations
        """)
        
        total_assessments = int(stats['total_adaptive']) + int(stats['total_assessment'])
        total_recs = int(stats['total_recommendations'])
        avg_recommendations = total_recs / total_assessments if total_assessments > 0 else 0
        
        return {
            "success": True,
            "timestamp": str(datetime.now()),
            "overview": {
                "total_users": int(stats['total_users']),
                "total_assessments_taken": total_assessments,
                "total_recommendations_generated": total_recs,
                "average_recommendations_per_assessment": round(avg_recommendations, 2),
                "assessment_breakdown": {
                    "standard_assessment": int(stats['total_assessment']),
                    "smart_assessment_adaptive": int(stats['total_adaptive'])
                }
            }
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to fetch admin overview: {str(error)}")


@router.get("/admin/assessments")
async def get_assessments_analytics():
    """
    Get detailed assessment statistics
    - Assessments by type
    - Assessments by date
    - Assessment completion rates
    """
    try:
        # Total by type
        assessment_types = execute_query("""
            SELECT 
                t.test_type,
                t.test_name,
                COUNT(ta.attempt_id) as count
            FROM tests t
            LEFT JOIN test_attempts ta ON t.test_id = ta.test_id
            GROUP BY t.test_id, t.test_type, t.test_name
            ORDER BY count DESC
        """)
        
        # Assessments by date (last 30 days)
        assessments_by_date = execute_query("""
            SELECT 
                DATE(taken_at) as date,
                COUNT(attempt_id) as count
            FROM test_attempts
            WHERE taken_at >= NOW() - INTERVAL '30 days'
            GROUP BY DATE(taken_at)
            ORDER BY date ASC
        """)
        
        return {
            "success": True,
            "assessments": {
                "by_type": [
                    {
                        "type": t['test_type'],
                        "name": t['test_name'],
                        "total": t['count']
                    }
                    for t in assessment_types
                ],
                "by_date_last_30_days": [
                    {
                        "date": str(a['date']),
                        "count": a['count']
                    }
                    for a in assessments_by_date
                ]
            }
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to fetch assessments analytics: {str(error)}")


@router.get("/admin/users/{user_id}/assessments")
async def get_user_assessment_history_admin(user_id: int):
    """
    Get COMPLETE assessment history for a specific user (admin view)
    - How many assessments they took
    - When they took them
    - Recommendations from each assessment
    - Questions and answers from each assessment
    """
    try:
        user = execute_query_one("""
            SELECT user_id, first_name, last_name, email 
            FROM users 
            WHERE user_id = %s
        """, [user_id])
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get all test attempts
        attempts = execute_query("""
            SELECT ta.*, t.test_name, t.test_type FROM test_attempts ta
            JOIN tests t ON ta.test_id = t.test_id
            WHERE ta.user_id = %s
            ORDER BY ta.taken_at DESC
        """, [user_id])
        
        assessment_history = []
        
        for attempt in attempts:
            # Get test details
            test = execute_query_one("""
                SELECT * FROM tests WHERE test_id = %s
            """, [attempt['test_id']])
            
            # Get recommendations for this attempt (if stored with attempt_id reference)
            recommendations = execute_query("""
                SELECT * FROM recommendations WHERE user_id = %s
                ORDER BY recommended_at DESC LIMIT 10
            """, [user_id])
            
            recommended_courses = []
            for rec in recommendations:
                course = execute_query_one("""
                    SELECT * FROM courses WHERE course_id = %s
                """, [rec['course_id']])
                
                if course:
                    recommended_courses.append({
                        "course_id": course['course_id'],
                        "course_name": course['course_name'],
                        "description": course.get('description', ''),
                        "minimum_gwa": float(course['minimum_gwa']) if course.get('minimum_gwa') else None,
                        "required_strand": course.get('required_strand', ''),
                        "trait_tag": course.get('trait_tag', ''),
                        "reasoning": rec.get('reasoning', ''),
                        "recommended_at": str(rec['recommended_at']) if rec.get('recommended_at') else None
                    })
            
            assessment_history.append({
                "attempt_id": attempt['attempt_id'],
                "assessment_type": test['test_type'] if test else "unknown",
                "assessment_name": test['test_name'] if test else "Unknown Assessment",
                "taken_at": str(attempt['attempt_date']),
                "score": attempt.get('score', 0),
                "total_questions": attempt.get('total_questions', 0),
                "time_taken": attempt.get('time_taken', 0),
                "total_recommendations": len(recommended_courses),
                "recommended_courses": recommended_courses
            })
        
        return {
            "success": True,
            "user_id": user_id,
            "user_name": f"{user['first_name']} {user['last_name']}".strip(),
            "user_email": user['email'],
            "total_assessments_taken": len(attempts),
            "assessment_history": assessment_history
        }
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to fetch user assessment history: {str(error)}")


@router.get("/admin/all-users-summary")
async def get_all_users_assessment_summary():
    """
    Get summary of ALL users with their assessment counts
    - How many assessments each user took
    - When they last took an assessment
    - Total recommendations received by each user
    """
    try:
        users_data = execute_query("""
            SELECT 
                u.user_id,
                u.first_name,
                u.last_name,
                u.email,
                COUNT(ta.attempt_id) as assessment_count,
                MAX(ta.taken_at) as last_assessment
            FROM users u
            LEFT JOIN test_attempts ta ON u.user_id = ta.user_id
            GROUP BY u.user_id, u.first_name, u.last_name, u.email
            ORDER BY COUNT(ta.attempt_id) DESC
        """)
        
        users_summary = []
        for user in users_data:
            # Get total recommendations for this user
            total_recs = execute_query_one("""
                SELECT COUNT(*) as count FROM recommendations WHERE user_id = %s
            """, [user['user_id']])
            
            users_summary.append({
                "user_id": user['user_id'],
                "fullname": f"{user['first_name']} {user['last_name']}".strip(),
                "email": user['email'],
                "assessments_taken": user['assessment_count'] or 0,
                "last_assessment_date": str(user['last_assessment']) if user['last_assessment'] else None,
                "total_recommendations_received": int(total_recs['count']) if total_recs else 0
            })
        
        return {
            "success": True,
            "total_users": len(users_summary),
            "users": users_summary
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to fetch users summary: {str(error)}")


@router.get("/admin/recommendations-summary")
async def get_recommendations_summary():
    """
    Get overall recommendations analytics
    - Most recommended courses
    - Least recommended courses
    - Total recommendations breakdown
    """
    try:
        most_recommended = execute_query("""
            SELECT 
                c.course_id,
                c.course_name,
                c.description,
                COUNT(r.recommendation_id) as recommendation_count
            FROM courses c
            LEFT JOIN recommendations r ON c.course_id = r.course_id
            GROUP BY c.course_id, c.course_name, c.description
            ORDER BY COUNT(r.recommendation_id) DESC
            LIMIT 10
        """)
        
        total_recs = execute_query_one('SELECT COUNT(*) as count FROM recommendations')
        
        return {
            "success": True,
            "most_recommended_courses": [
                {
                    "course_id": c['course_id'],
                    "course_name": c['course_name'],
                    "description": c.get('description', ''),
                    "times_recommended": c['recommendation_count']
                }
                for c in most_recommended
            ],
            "total_recommendations_in_system": int(total_recs['count'])
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to fetch recommendations summary: {str(error)}")


@router.get("/admin/export")
async def export_analytics_data():
    """
    Export all analytics data for the admin dashboard
    Combines all analytics into one comprehensive endpoint
    """
    try:
        # Overview stats
        total_users = execute_query_one('SELECT COUNT(*) as count FROM users')
        total_assessments = execute_query_one('SELECT COUNT(*) as count FROM test_attempts')
        total_recommendations = execute_query_one('SELECT COUNT(*) as count FROM recommendations')
        
        # User with most assessments
        user_with_most = execute_query_one("""
            SELECT 
                CONCAT(u.first_name, ' ', u.last_name) as fullname,
                COUNT(ta.attempt_id) as count
            FROM users u
            LEFT JOIN test_attempts ta ON u.user_id = ta.user_id
            GROUP BY u.user_id, u.first_name, u.last_name
            ORDER BY COUNT(ta.attempt_id) DESC
            LIMIT 1
        """)
        
        total_users_count = int(total_users['count'])
        total_assess_count = int(total_assessments['count'])
        
        return {
            "success": True,
            "export_timestamp": str(datetime.now()),
            "summary": {
                "total_users": total_users_count,
                "total_assessments_taken": total_assess_count,
                "total_recommendations_generated": int(total_recommendations['count']),
                "average_assessments_per_user": round(total_assess_count / total_users_count, 2) if total_users_count > 0 else 0,
                "most_active_user": user_with_most['fullname'] if user_with_most else "N/A",
                "most_active_user_assessments": user_with_most['count'] if user_with_most else 0
            },
            "data_ready_for_export": True,
            "endpoints_available": [
                "/api/analytics/admin/overview",
                "/api/analytics/admin/assessments",
                "/api/analytics/admin/users/{user_id}/assessments",
                "/api/analytics/admin/all-users-summary",
                "/api/analytics/admin/recommendations-summary"
            ]
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to export analytics data: {str(error)}")


# PDF Report Generation Endpoint
@router.get("/export/pdf")
async def export_analytics_pdf():
    """Generate and download a PDF analytics report"""
    try:
        from services.pdf_service import pdf_generator
        
        # Gather all analytics data
        total_users = execute_query_one('SELECT COUNT(*) as count FROM users')
        active_users = execute_query_one("SELECT COUNT(*) as count FROM users WHERE is_active = 1")
        total_courses = execute_query_one('SELECT COUNT(*) as count FROM courses')
        total_tests = execute_query_one('SELECT COUNT(*) as count FROM tests')
        total_questions = execute_query_one('SELECT COUNT(*) as count FROM questions')
        total_attempts = execute_query_one('SELECT COUNT(*) as count FROM test_attempts')
        total_recommendations = execute_query_one('SELECT COUNT(*) as count FROM recommendations')
        
        # Strand distribution from academic_info JSON field
        strand_dist = execute_query("""
            SELECT 
                COALESCE(academic_info->>'strand', 'Unknown') as strand, 
                COUNT(*) as count 
            FROM users 
            GROUP BY academic_info->>'strand'
        """)
        strand_distribution = {row['strand'] or 'Unknown': row['count'] for row in strand_dist} if strand_dist else {}
        
        # Feedback stats - using correct table name
        feedback_stats_raw = execute_query_one("""
            SELECT 
                COUNT(*) as total,
                COALESCE(AVG(rating), 0) as average_rating,
                COUNT(CASE WHEN rating >= 4 THEN 1 END) as positive,
                COUNT(CASE WHEN rating = 3 THEN 1 END) as neutral,
                COUNT(CASE WHEN rating <= 2 THEN 1 END) as negative
            FROM recommendation_feedback
        """)
        
        # Recommendation status
        rec_stats = execute_query_one("""
            SELECT 
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
                COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
                COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
            FROM recommendations
        """)
        
        # Build data for PDF
        report_data = {
            'total_users': int(total_users['count']) if total_users else 0,
            'active_users': int(active_users['count']) if active_users else 0,
            'total_courses': int(total_courses['count']) if total_courses else 0,
            'total_tests': int(total_tests['count']) if total_tests else 0,
            'total_questions': int(total_questions['count']) if total_questions else 0,
            'total_attempts': int(total_attempts['count']) if total_attempts else 0,
            'total_recommendations': int(total_recommendations['count']) if total_recommendations else 0,
            'strand_distribution': strand_distribution,
            'feedback_stats': {
                'total': int(feedback_stats_raw['total']) if feedback_stats_raw else 0,
                'average_rating': float(feedback_stats_raw['average_rating']) if feedback_stats_raw else 0,
                'positive': int(feedback_stats_raw['positive']) if feedback_stats_raw else 0,
                'neutral': int(feedback_stats_raw['neutral']) if feedback_stats_raw else 0,
                'negative': int(feedback_stats_raw['negative']) if feedback_stats_raw else 0,
            },
            'recommendation_stats': {
                'pending': int(rec_stats['pending']) if rec_stats else 0,
                'approved': int(rec_stats['approved']) if rec_stats else 0,
                'rejected': int(rec_stats['rejected']) if rec_stats else 0,
                'completed': int(rec_stats['completed']) if rec_stats else 0,
            }
        }
        
        # Generate PDF
        pdf_buffer = pdf_generator.generate_analytics_report(report_data)
        
        filename = f"analytics_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF report: {str(error)}")


# Users PDF Report
@router.get("/export/users-pdf")
async def export_users_pdf():
    """Generate and download a PDF users report"""
    try:
        from services.pdf_service import pdf_generator
        
        users = execute_query("""
            SELECT user_id, 
                   CONCAT(first_name, ' ', last_name) as full_name, 
                   email, 
                   academic_info->>'strand' as strand, 
                   academic_info->>'gwa' as gwa, 
                   is_active, 
                   created_at
            FROM users
            ORDER BY created_at DESC
            LIMIT 100
        """)
        
        pdf_buffer = pdf_generator.generate_users_report(users or [])
        
        filename = f"users_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to generate users PDF: {str(error)}")


# ============================================================
# DAILY DIGEST EMAIL
# ============================================================
@router.post("/send-daily-digest")
async def send_daily_digest_email():
    """Send a daily digest email with system statistics"""
    try:
        from services.email_service import email_service
        
        # Gather stats for today
        today = datetime.now().date()
        
        # Total users
        total_users = execute_query_one('SELECT COUNT(*) as count FROM users')
        
        # New users today
        new_users_today = execute_query_one("""
            SELECT COUNT(*) as count FROM users 
            WHERE DATE(created_at) = CURRENT_DATE
        """)
        
        # Total feedback
        total_feedback = execute_query_one('SELECT COUNT(*) as count FROM recommendation_feedback')
        
        # Feedback today
        feedback_today = execute_query_one("""
            SELECT COUNT(*) as count FROM recommendation_feedback 
            WHERE DATE(created_at) = CURRENT_DATE
        """)
        
        # Average rating
        avg_rating = execute_query_one('SELECT COALESCE(AVG(rating), 0) as avg FROM recommendation_feedback')
        
        # Low ratings today (1-2 stars)
        low_ratings_today = execute_query_one("""
            SELECT COUNT(*) as count FROM recommendation_feedback 
            WHERE rating <= 2 AND DATE(created_at) = CURRENT_DATE
        """)
        
        # Total assessments
        total_assessments = execute_query_one('SELECT COUNT(*) as count FROM test_attempts')
        
        # Assessments today
        assessments_today = execute_query_one("""
            SELECT COUNT(*) as count FROM test_attempts 
            WHERE DATE(taken_at) = CURRENT_DATE
        """)
        
        # Build stats dict
        stats = {
            'total_users': int(total_users['count']) if total_users else 0,
            'new_users_today': int(new_users_today['count']) if new_users_today else 0,
            'total_feedback': int(total_feedback['count']) if total_feedback else 0,
            'feedback_today': int(feedback_today['count']) if feedback_today else 0,
            'average_rating': float(avg_rating['avg']) if avg_rating else 0,
            'low_ratings_today': int(low_ratings_today['count']) if low_ratings_today else 0,
            'total_assessments': int(total_assessments['count']) if total_assessments else 0,
            'assessments_today': int(assessments_today['count']) if assessments_today else 0,
        }
        
        # Send digest email
        success = email_service.send_daily_digest(stats)
        
        if success:
            return {
                "success": True,
                "message": "Daily digest email sent successfully",
                "stats": stats
            }
        else:
            return {
                "success": False,
                "message": "Email service is disabled or failed to send",
                "stats": stats
            }
            
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to send daily digest: {str(error)}")


@router.get("/email-status")
async def get_email_status():
    """Check if email notifications are enabled"""
    try:
        from services.email_service import email_service
        
        return {
            "enabled": email_service.enabled,
            "admin_email": email_service.admin_email if email_service.enabled else None,
            "smtp_configured": bool(email_service.smtp_user and email_service.smtp_password)
        }
    except Exception as error:
        return {
            "enabled": False,
            "error": str(error)
        }
