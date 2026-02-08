from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any
import math
from models.database import execute_query, execute_query_one
from pydantic import BaseModel

router = APIRouter(prefix="/api/tests", tags=["tests"])

# Pydantic models
class TestAttempt(BaseModel):
    user_id: int
    test_id: int
    score: int
    total_questions: int
    time_taken: Optional[int] = None  # in minutes

class TestCreate(BaseModel):
    test_name: str
    description: Optional[str] = None
    test_type: Optional[str] = "adaptive"  # adaptive, assessment, etc.

class TestUpdate(BaseModel):
    test_name: Optional[str] = None
    description: Optional[str] = None
    test_type: Optional[str] = None

class QuestionCreate(BaseModel):
    test_id: int
    question_text: str
    question_order: int
    question_type: Optional[str] = "multiple_choice"  # multiple_choice, true_false, short_answer
    category: Optional[str] = None

class QuestionUpdate(BaseModel):
    question_text: Optional[str] = None
    question_order: Optional[int] = None
    question_type: Optional[str] = None
    category: Optional[str] = None

class OptionCreate(BaseModel):
    question_id: Optional[int] = None
    option_text: str
    trait: Optional[str] = None

# Get all tests with pagination and search
@router.get("/")
async def get_tests(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: str = Query("")
):
    try:
        offset = (page - 1) * limit
        
        query = 'SELECT * FROM tests WHERE 1=1'
        count_query = 'SELECT COUNT(*) as total FROM tests WHERE 1=1'
        params = []
        count_params = []
        param_index = 1
        
        # Add search filter
        if search:
            search_param = f"%{search}%"
            query += f" AND test_name ILIKE ${param_index}"
            count_query += f" AND test_name ILIKE ${param_index}"
            params.append(search_param)
            count_params.append(search_param)
            param_index += 1
        
        query += f" ORDER BY test_id DESC LIMIT ${param_index} OFFSET ${param_index + 1}"
        params.extend([limit, offset])
        
        tests = execute_query(query, params)
        count_result = execute_query_one(count_query, count_params)
        total = int(count_result['total'])
        
        return {
            "tests": tests,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": math.ceil(total / limit)
            }
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to fetch tests: {str(error)}")

# Create a new test
@router.post("/", status_code=201)
async def create_test(test: TestCreate):
    try:
        result = execute_query_one(
            """INSERT INTO tests (test_name, description, test_type) 
               VALUES ($1, $2, $3) RETURNING test_id""",
            [test.test_name, test.description or "", test.test_type or "adaptive"]
        )
        
        return {
            "message": "Test created successfully",
            "test_id": result['test_id'],
            "test_name": test.test_name
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to create test: {str(error)}")

# Get test by ID with questions and options
@router.get("/{test_id}")
async def get_test(test_id: int):
    try:
        test = execute_query_one('SELECT * FROM tests WHERE test_id = $1', [test_id])
        
        if not test:
            raise HTTPException(status_code=404, detail="Test not found")
        
        questions = execute_query(
            'SELECT * FROM questions WHERE test_id = $1 ORDER BY question_order',
            [test_id]
        )
        
        # Get options for each question
        questions_with_options = []
        for question in questions:
            options = execute_query(
                'SELECT * FROM options WHERE question_id = $1 ORDER BY option_order',
                [question['question_id']]
            )
            question_dict = dict(question)
            question_dict['options'] = options
            questions_with_options.append(question_dict)
        
        test_dict = dict(test)
        test_dict['questions'] = questions_with_options
        
        return test_dict
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to fetch test: {str(error)}")

# Delete test
@router.delete("/{test_id}")
async def delete_test(test_id: int):
    try:
        result = execute_query('DELETE FROM tests WHERE test_id = $1', [test_id], fetch=False)
        
        if result == 0:
            raise HTTPException(status_code=404, detail="Test not found")
        
        return {"message": "Test deleted successfully"}
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to delete test: {str(error)}")

# Update test
@router.put("/{test_id}")
async def update_test(test_id: int, test: TestUpdate):
    try:
        # Check if test exists
        existing = execute_query_one('SELECT test_id FROM tests WHERE test_id = $1', [test_id])
        if not existing:
            raise HTTPException(status_code=404, detail="Test not found")
        
        # Build dynamic update query
        updates = []
        values = []
        param_count = 1
        
        if test.test_name is not None:
            updates.append(f"test_name = ${param_count}")
            values.append(test.test_name)
            param_count += 1
        
        if test.description is not None:
            updates.append(f"description = ${param_count}")
            values.append(test.description)
            param_count += 1
            
        if test.test_type is not None:
            updates.append(f"test_type = ${param_count}")
            values.append(test.test_type)
            param_count += 1
        
        if not updates:
            return {"message": "No fields to update"}
        
        values.append(test_id)
        query = f"UPDATE tests SET {', '.join(updates)} WHERE test_id = ${param_count}"
        
        execute_query(query, values, fetch=False)
        
        return {"message": "Test updated successfully"}
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to update test: {str(error)}")

# Get test attempts for a specific test
@router.get("/{test_id}/attempts")
async def get_test_attempts(test_id: int):
    try:
        # Verify test exists
        test = execute_query_one('SELECT test_id FROM tests WHERE test_id = $1', [test_id])
        if not test:
            raise HTTPException(status_code=404, detail="Test not found")
        
        attempts = execute_query("""
            SELECT 
                ta.attempt_id,
                ta.user_id,
                CONCAT(u.first_name, ' ', u.last_name) as full_name,
                u.email,
                ta.score,
                ta.total_questions,
                ROUND((ta.score::float / NULLIF(ta.total_questions, 0) * 100)::numeric, 2) as percentage,
                ta.taken_at as attempt_date,
                ta.time_taken
            FROM test_attempts ta
            JOIN users u ON ta.user_id = u.user_id
            WHERE ta.test_id = $1
            ORDER BY ta.taken_at DESC
        """, [test_id])
        
        return {
            "attempts": attempts,
            "total_attempts": len(attempts)
        }
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to fetch test attempts: {str(error)}")

# Submit test attempt (record test results)
@router.post("/{test_id}/submit", status_code=201)
async def submit_test_attempt(test_id: int, attempt: TestAttempt):
    try:
        # Verify test exists
        test = execute_query_one('SELECT test_id FROM tests WHERE test_id = $1', [test_id])
        if not test:
            raise HTTPException(status_code=404, detail="Test not found")
        
        # Verify user exists
        user = execute_query_one('SELECT user_id FROM users WHERE user_id = $1', [attempt.user_id])
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Insert test attempt into user_test_attempts
        result = execute_query_one(
            """INSERT INTO user_test_attempts (user_id, test_id, score, total_questions, time_taken) 
               VALUES ($1, $2, $3, $4, $5) RETURNING attempt_id""",
            [attempt.user_id, test_id, attempt.score, attempt.total_questions, attempt.time_taken]
        )
        
        # Also insert into test_attempts table for tracking total system attempts
        try:
            execute_query_one(
                """INSERT INTO test_attempts (user_id, test_id, score, total_questions, time_taken) 
                   VALUES ($1, $2, $3, $4, $5) RETURNING attempt_id""",
                [attempt.user_id, test_id, attempt.score, attempt.total_questions, attempt.time_taken]
            )
        except Exception as e:
            # Log but don't fail if test_attempts insert fails
            print(f"Warning: Failed to insert into test_attempts: {str(e)}")
        
        return {
            "message": "Test attempt recorded successfully",
            "attempt_id": result['attempt_id']
        }
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to record test attempt: {str(error)}")

# Get all available traits
@router.get("/traits")
async def get_traits():
    try:
        traits = execute_query("SELECT DISTINCT trait_tag FROM options WHERE trait_tag IS NOT NULL ORDER BY trait_tag")
        trait_list = [trait['trait_tag'] for trait in traits if trait.get('trait_tag')]
        return {"traits": trait_list}
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to fetch traits: {str(error)}")

# ==================== QUESTION MANAGEMENT ====================

# Get all questions with pagination and search
@router.get("/questions/list/all")
async def get_questions(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: str = Query(""),
    test_id: Optional[int] = Query(None)
):
    try:
        offset = (page - 1) * limit
        
        query = """SELECT 
            q.question_id,
            q.test_id,
            t.test_name,
            q.question_text,
            q.question_order,
            q.question_type,
            (SELECT COUNT(*) FROM options WHERE question_id = q.question_id) as option_count,
            q.created_at
        FROM questions q
        JOIN tests t ON q.test_id = t.test_id
        WHERE 1=1"""
        
        count_query = "SELECT COUNT(*) as total FROM questions WHERE 1=1"
        params = []
        count_params = []
        param_index = 1
        
        # Add search filter
        if search:
            search_param = f"%{search}%"
            query += f" AND (q.question_text ILIKE ${param_index} OR t.test_name ILIKE ${param_index + 1})"
            count_query += f" AND (question_text ILIKE ${param_index} OR test_id IN (SELECT test_id FROM tests WHERE test_name ILIKE ${param_index + 1}))"
            params.extend([search_param, search_param])
            count_params.extend([search_param, search_param])
            param_index += 2
        
        # Add test filter
        if test_id:
            query += f" AND q.test_id = ${param_index}"
            count_query += f" AND test_id = ${param_index}"
            params.append(test_id)
            count_params.append(test_id)
            param_index += 1
        
        query += f" ORDER BY q.test_id, q.question_order LIMIT ${param_index} OFFSET ${param_index + 1}"
        params.extend([limit, offset])
        
        questions = execute_query(query, params)
        count_result = execute_query_one(count_query, count_params)
        total = int(count_result['total'])
        
        return {
            "questions": questions,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": math.ceil(total / limit)
            }
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to fetch questions: {str(error)}")

# Get question with all options
@router.get("/questions/{question_id}")
async def get_question(question_id: int):
    try:
        question = execute_query_one('SELECT * FROM questions WHERE question_id = $1', [question_id])
        
        if not question:
            raise HTTPException(status_code=404, detail="Question not found")
        
        options = execute_query(
            'SELECT * FROM options WHERE question_id = $1 ORDER BY option_order',
            [question_id]
        )
        
        question_dict = dict(question)
        question_dict['options'] = options
        
        return question_dict
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to fetch question: {str(error)}")

# Create question
@router.post("/questions", status_code=201)
async def create_question(question: QuestionCreate):
    try:
        # Verify test exists
        test = execute_query_one('SELECT test_id FROM tests WHERE test_id = $1', [question.test_id])
        if not test:
            raise HTTPException(status_code=404, detail="Test not found")
        
        result = execute_query_one(
            """INSERT INTO questions (test_id, question_text, question_order, question_type, category)
               VALUES ($1, $2, $3, $4, $5) RETURNING question_id""",
            [question.test_id, question.question_text, question.question_order, question.question_type, question.category]
        )
        
        return {
            "message": "Question created successfully",
            "question_id": result['question_id']
        }
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to create question: {str(error)}")

# Delete question
@router.delete("/questions/{question_id}")
async def delete_question(question_id: int):
    try:
        # First delete all options for this question
        execute_query('DELETE FROM options WHERE question_id = $1', [question_id], fetch=False)
        
        # Then delete the question
        result = execute_query('DELETE FROM questions WHERE question_id = $1', [question_id], fetch=False)
        
        if result == 0:
            raise HTTPException(status_code=404, detail="Question not found")
        
        return {"message": "Question deleted successfully"}
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to delete question: {str(error)}")

# Update question
@router.put("/questions/{question_id}")
async def update_question(question_id: int, question: QuestionUpdate):
    try:
        # Check if question exists
        existing = execute_query_one('SELECT question_id FROM questions WHERE question_id = $1', [question_id])
        if not existing:
            raise HTTPException(status_code=404, detail="Question not found")
        
        # Build dynamic update query
        updates = []
        values = []
        param_count = 1
        
        if question.question_text is not None:
            updates.append(f"question_text = ${param_count}")
            values.append(question.question_text)
            param_count += 1
        
        if question.question_order is not None:
            updates.append(f"question_order = ${param_count}")
            values.append(question.question_order)
            param_count += 1
            
        if question.question_type is not None:
            updates.append(f"question_type = ${param_count}")
            values.append(question.question_type)
            param_count += 1
            
        if question.category is not None:
            updates.append(f"category = ${param_count}")
            values.append(question.category)
            param_count += 1
        
        if not updates:
            return {"message": "No fields to update"}
        
        values.append(question_id)
        query = f"UPDATE questions SET {', '.join(updates)} WHERE question_id = ${param_count}"
        
        execute_query(query, values, fetch=False)
        
        return {"message": "Question updated successfully"}
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to update question: {str(error)}")

# Create option for a question
@router.post("/questions/{question_id}/options", status_code=201)
async def create_option(question_id: int, option: OptionCreate):
    try:
        # Verify question exists
        question = execute_query_one('SELECT question_id FROM questions WHERE question_id = $1', [question_id])
        if not question:
            raise HTTPException(status_code=404, detail="Question not found")
        
        result = execute_query_one(
            """INSERT INTO options (question_id, option_text, trait_tag, weight)
               VALUES ($1, $2, $3, $4) RETURNING option_id""",
            [question_id, option.option_text, option.trait or None, 1]
        )
        
        return {
            "message": "Option created successfully",
            "option_id": result['option_id']
        }
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to create option: {str(error)}")

# Delete option
@router.delete("/options/{option_id}")
async def delete_option(option_id: int):
    try:
        result = execute_query('DELETE FROM options WHERE option_id = $1', [option_id], fetch=False)
        
        if result == 0:
            raise HTTPException(status_code=404, detail="Option not found")
        
        return {"message": "Option deleted successfully"}
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to delete option: {str(error)}")
