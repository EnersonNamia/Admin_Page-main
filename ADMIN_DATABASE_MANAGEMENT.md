# Admin Database Management Features

## Overview
The admin panel provides comprehensive database management capabilities. Admins can now make changes to the database directly through the user interface.

---

## 1. Questions Management

### Add Questions
**Location:** Questions Page → "Add Question" button

**Steps:**
1. Go to the **Questions** page from the navigation
2. Click the **"+ Add Question"** button (top right)
3. Fill in the form:
   - **Select Test**: Choose which test the question belongs to
   - **Question Text**: Enter the question text
   - **Question Type**: Select from Multiple Choice, True/False, or Short Answer
   - **Question Order**: Specify the order number (1, 2, 3, etc.)
4. Click **"Add Question"** to save

**Backend Endpoint:**
```
POST /api/tests/questions
```

### Delete Questions
**Options:**

**Option 1 - From Table View:**
1. Find the question in the Questions table
2. Click the **trash icon** in the Actions column
3. Confirm deletion

**Option 2 - From Detail View:**
1. Click the **eye icon** to view question details
2. In the modal, click the **"Delete Question"** button
3. Confirm deletion

**Backend Endpoint:**
```
DELETE /api/tests/questions/{question_id}
```

---

## 2. Users Management

### Add Users
**Location:** Users Page → "Add User" button

**Steps:**
1. Go to the **Users** page from the navigation
2. Click the **"+ Add User"** button (top right)
3. Fill in the form:
   - **Full Name**: Student's full name
   - **Email**: Student's email address (must be unique)
   - **Strand**: Select STEM, HUMSS, ABM, or TVL
   - **GWA**: General Weighted Average (0-100)
4. Click **"Add User"** to create the account

**Backend Endpoint:**
```
POST /api/users
```

### Delete Users
**Steps:**
1. Go to the **Users** page
2. Find the user you want to delete
3. Click the **trash icon** in the Actions column
4. Confirm the deletion

**Backend Endpoint:**
```
DELETE /api/users/{user_id}
```

### Deactivate/Activate Accounts
**Steps:**
1. Go to the **Users** page
2. Click the **eye icon** to view user details
3. In the detail modal, you'll see the "Account Status"
4. Click the **toggle button** at the bottom to deactivate or activate the account
   - **Deactivate Account**: Prevent user from logging in
   - **Activate Account**: Allow user to log in again

**Backend Endpoint:**
```
PATCH /api/users/{user_id}/status
```

---

## 3. Additional Features

### Search and Filter
- **Questions Page**: Search by question text, filter by test
- **Users Page**: Search by name/email, filter by strand, filter by status (active/inactive)

### View Details
- Click the **eye icon** on any item to view full details
- For users: See test history, performance metrics, and account status
- For questions: See test name, type, and order information

### Database Operations Summary

| Operation | Resource | Method | Endpoint |
|-----------|----------|--------|----------|
| Create | User | POST | `/api/users` |
| Delete | User | DELETE | `/api/users/{user_id}` |
| Update Status | User | PATCH | `/api/users/{user_id}/status` |
| Create | Question | POST | `/api/tests/questions` |
| Delete | Question | DELETE | `/api/tests/questions/{question_id}` |
| Create | Option | POST | `/api/tests/questions/{question_id}/options` |
| Delete | Option | DELETE | `/api/tests/options/{option_id}` |

---

## 4. Data Validation

### Users
- Email must be unique and valid
- GWA must be between 0-100
- Full name is required
- Default password generated or required

### Questions
- Test must exist
- Question text is required
- Question order must be numeric
- Question type must be one of: multiple_choice, true_false, short_answer

---

## 5. Security Notes

- All admin operations require proper authentication
- Delete operations are confirmed with a dialog
- Deactivated users cannot log in but their data is preserved
- Deleting users removes all associated data

---

## 6. Frontend Pages

- **Questions Page**: `/src/pages/QuestionsPage.js`
- **Users Page**: `/src/pages/UsersPage.js`

## 7. Backend Routes

- **Users Routes**: `/backend_python/routes/users.py`
- **Tests/Questions Routes**: `/backend_python/routes/tests.py`

---

**Last Updated:** January 29, 2026
