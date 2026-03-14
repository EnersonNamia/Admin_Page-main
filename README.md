# Course Recommendation System - Admin Panel

## Overview

A full-stack admin dashboard for managing the Course Recommendation System. This panel allows administrators to manage users, courses, tests, questions, recommendations, and feedback with comprehensive analytics and reporting capabilities.

**Tech Stack:**
- **Backend:** FastAPI (Python)
- **Frontend:** React
- **Database:** PostgreSQL (Railway)

---

## Features at a Glance

| Module | Key Features |
|--------|--------------|
| **Dashboard** | Real-time stats, System info |
| **Users** | Search, Filter by strand/status, View test history, Export CSV |
| **Courses** | CRUD, Trait selector, Table/Grid views, Export CSV |
| **Tests** | Create and manage assessment tests |
| **Questions** | CRUD with options, Trait assignment, Category management |
| **Recommendations** | Review workflow, Bulk actions, Rules engine, Export CSV |
| **Feedback** | View ratings, Filter, Statistics, Export CSV |
| **Analytics** | Charts, Export PDF reports, Send email digest |

---

## Security Features

- ✅ JWT Authentication with secure token generation
- ✅ Password hashing with bcrypt
- ✅ Rate limiting (100 requests per 15 minutes)
- ✅ Brute force protection (5 attempts → 15 min lockout)
- ✅ Security headers (XSS, CSRF, Clickjacking protection)
- ✅ Environment variables for sensitive data

---

## Quick Start

### 1. Install Dependencies

```bash
# Backend
cd backend_python
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment

Copy the example environment file and update with your values:
```bash
cd backend_python
cp .env.example .env
```

### 3. Create Admin User

```bash
cd backend_python
python create_admin.py
```

Follow the prompts to create your admin account with a secure password.

### 4. Start the Application

**Terminal 1 - Backend:**
```bash
cd backend_python
python main.py
```
Backend runs on: http://localhost:5000

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```
Frontend runs on: http://localhost:3000

### 5. Access Admin Panel

1. Open http://localhost:3000 in your browser
2. Login with the admin credentials you created
3. You're in! 🎉

---

## Gmail App Password Setup (For Email Notifications)

The system sends email notifications for:
- Low rating alerts
- Daily feedback summaries
- System alerts

### How to Get a Gmail App Password:

1. **Enable 2-Factor Authentication:**
   - Go to https://myaccount.google.com/security
   - Enable "2-Step Verification"

2. **Create App Password:**
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" as the app
   - Select "Windows Computer" as the device
   - Click "Generate"
   - Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

3. **Update .env File:**
   ```env
   SMTP_USER=your_email@gmail.com
   SMTP_PASSWORD=abcdefghijklmnop  # paste without spaces
   ADMIN_EMAIL=your_email@gmail.com
   ```

---

## Complete Feature Documentation

### 🔐 Login Page

**Features:**
- Secure admin login with email/password
- JWT token-based authentication
- Rate limiting protection (429 error after too many attempts)
- Account deactivation detection
- Loading state with spinner
- Last login timestamp tracking

---

### 📊 Dashboard

**Features:**
- **Real-time Statistics Cards:**
  - Total Users (registered students)
  - Total Courses (available programs)
  - Total Tests (assessments taken)
  - Total Recommendations (generated)

- **System Information Panel:**
  - System Name, Version, Algorithm type
  - Database type and connection status (Online/Offline)
  - Target Users information

- **Quick Features Overview**
- Cached data with configurable TTL (30s-10min)

---

### 👥 Users Management

**Features:**
- **List & Search:**
  - Paginated user table with configurable page size
  - Search by name or email
  - Filter by Strand (STEM, HUMSS, ABM, TVL)
  - Filter by Status (Active/Inactive)

- **User Table Columns:**
  - Name, Email, Strand, GWA
  - Tests Taken count
  - Last Active (with human-readable time: "5m ago", "2d ago")
  - Online/Offline status indicator

- **User Details Modal:**
  - Full user profile information
  - Assessment History with expandable attempts
  - View test details: questions answered, traits, confidence %
  - Top course recommendations per attempt
  - Trait breakdown visualization

- **Actions:**
  - View detailed user profile
  - Toggle user active/inactive status
  - Delete user (with confirmation modal, cascades all related data)
  - **Export to CSV** - Download all user data

---

### 📚 Courses Management

**Features:**
- **View Modes:**
  - **Table View** - Traditional data table
  - **Grid View** - Card-based layout

- **Search & Pagination:**
  - Server-side search by course name/description
  - Debounced search input (300ms delay)
  - Configurable page size (10/25/50/100)

- **Course Properties:**
  - Course Name
  - Description
  - Required Strand (STEM/HUMSS/ABM/TVL/Any)
  - Minimum GWA requirement
  - Trait Tags (exactly 3 required)

- **Trait Selector:**
  - Categorized trait picker with categories:
    - RIASEC Types (Realistic, Investigative, Artistic, Social, Enterprising, Conventional)
    - Healthcare/Technology/Engineering/Business/Arts/Science Paths
    - Skill Traits
  - **Dynamic trait creation** - Add custom traits on the fly
  - Visual trait selection badges

- **Actions:**
  - Create new course with full trait selector
  - Edit existing course details
  - Delete course (with confirmation modal)
  - **Export to CSV** - Download all courses

- **Cache Invalidation:**
  - Automatically notifies CoursePro production backend when courses change

---

### 📝 Tests Management

**Features:**
- **Test List:**
  - Test Name, Description, Type, Created Date

- **Test Types:**
  - Adaptive assessment
  - Standard assessment

- **Actions:**
  - Create new test (name + description)
  - Edit test details
  - Delete test (with confirmation modal)

---

### ❓ Questions Management

**Features:**
- **View Modes:**
  - Table View and Grid View options
  - Pagination (10/25/50/100 per page)

- **Question Table Columns:**
  - Test Name (badge)
  - Question Text
  - Type (Standard)
  - Options Count
  - Order
  - Actions

- **Search & Filtering:**
  - Server-side search by question text (debounced)
  - Filter by Test dropdown

- **Question Categories (Organized by Groups):**
  - Career Discovery
  - Field-Specific Specialization (Healthcare, Technology, Engineering, etc.)
  - Situational & Scenario-Based
  - Scale/Rating Questions
  - Academic Questions
  - Skills & Competencies
  - Professional & Career Planning
  - Work & Lifestyle Preferences
  - Personality & Interests
  - And more...

- **Question Creation:**
  - Auto-assigned to "Career Assessment" test
  - Category selection with organized dropdown groups
  - **Dynamic category creation** - Add new categories
  - 4 options required with trait assignment

- **Option Management:**
  - Each option has text and trait assignment
  - Trait selector with categorized traits:
    - RIASEC Types
    - Specialized Path Traits (Healthcare Path, Tech Path, etc.)
    - Skill Traits
    - General traits (Helping Others, Problem Solving, Creative, Leadership, etc.)
  - **Custom trait creation** - Add new traits dynamically
  - Add/Edit/Delete individual options

- **Actions:**
  - Create question with 4 options
  - View question details with all options
  - Edit question text, category, order
  - Edit individual option text and traits
  - Add new options to existing questions
  - Delete questions (cascades all options)

- **Production Cache Invalidation:**
  - Notifies CoursePro production backend on any question/option changes

---

### 💡 Recommendations Management

**Three Tabs:**

#### Tab 1: Review Recommendations
- **Status Filter Tabs with Counts:**
  - All / Pending / Approved / Rejected / Completed
  - Badge showing count for each status

- **Recommendation Table:**
  - Checkbox for bulk selection
  - Student Name & Email
  - Top Recommended Course (with trophy icon)
  - "+N more" indicator for additional recommendations
  - Assessment Info: Confidence %, Traits count, Questions count
  - Match Reason description
  - Status dropdown (instant change)
  - Action buttons

- **Expandable Rows:**
  - Click arrow to show other 4 recommendations
  - Each with course name, match %, and status

- **Bulk Actions:**
  - Select All Pending checkbox
  - Bulk Approve Selected
  - Bulk Reject Selected
  - Selection counter display

- **Individual Actions:**
  - Quick status change via dropdown (optimistic UI - instant feedback)
  - Edit button - Opens modal to change course, reasoning, status, admin notes
  - Delete button (with confirmation)

- **Pagination:**
  - 25 items per page
  - Page navigation controls

#### Tab 2: Matching Rules
- **Rule Properties:**
  - Rule Name & Description
  - Condition Type: GWA, Strand, Trait, Assessment Score, or Combined
  - GWA Range (min/max)
  - Strand Match (STEM/HUMSS/ABM/TVL)
  - Trait Tag with minimum score
  - Assessment Score range
  - Recommended Course selection
  - Priority level
  - Active/Inactive toggle

- **Actions:**
  - Create new rule
  - Edit existing rule
  - Toggle rule active status
  - Delete rule

- **Generate Recommendations:**
  - Run all active rules against students
  - Optional: Overwrite existing recommendations

#### Tab 3: History
- **Filters:**
  - Date range picker (start/end date)
  - Status filter dropdown

- **Timeline View:**
  - Visual timeline of recommendations over last 30 days
  - Grouped by date

#### Export Features
- **Export Reports Button:**
  - Opens export modal with summary statistics
  - **Export to CSV** - Download by status filter
  - Shows counts: All, Pending, Approved, Rejected, Completed

---

### ⭐ Feedback Management

**Features:**
- **Statistics Dashboard (Top Cards):**
  - Total Feedback count
  - Average Rating (with star display)
  - Positive feedback count (4-5 stars)
  - Neutral feedback count (3 stars)
  - Negative feedback count (1-2 stars)
  - Feedback with Comments count

- **View Modes:**
  - **Table View** - Compact data table
  - **Card View** - Visual card layout with star ratings

- **Filtering:**
  - Filter by Rating (1-5 stars dropdown)
  - Search by student name or feedback text
  - Clear Filters button

- **Feedback Table Columns:**
  - Student Name, Email
  - Course Recommended
  - Feedback Text (truncated)
  - Star Rating (visual stars)
  - Submitted Date

- **Pagination:**
  - Configurable items per page (10/25/50/100)
  - Page navigation

- **Detail Modal:**
  - Full feedback details
  - Complete student information
  - Course recommended
  - Full feedback text (untruncated)
  - Rating with stars

- **Actions:**
  - View full feedback details
  - **Export to CSV** - Download all feedback data

- **Automatic Email Notifications:**
  - Alert sent to admin for low ratings (1-2 stars)
  - Includes user info, rating, and comment

---

### 📈 Analytics Dashboard

**Features:**
- **Main Statistics Cards:**
  - Total Users (Registered Students)
  - Total Courses (Available Programs)
  - Total Tests (Assessment Modules)
  - Total Recommendations (Generated)

- **Data Distribution Chart:**
  - Horizontal bar chart showing relative counts
  - Users, Courses, Tests, Recommendations
  - Percentage-based bar widths

- **Feedback Overview Panel:**
  - Large average rating circle display
  - Star rating visualization
  - Total reviews count

- **Feedback Sentiment Chart:**
  - Positive/Neutral/Negative breakdown
  - Percentage bars with colors
  - Emoji icons for each sentiment

- **Quick Stats Grid:**
  - Average Recommendations per User
  - Satisfaction Rate percentage
  - Total Feedback Received
  - Total Records count

- **Export Features:**
  - **Export PDF Report** - Comprehensive analytics report containing:
    - System overview table
    - User distribution by strand
    - Feedback summary with ratings
    - Recommendation status breakdown
    - Professional styling with colors

- **Email Features:**
  - **Send Daily Digest** - Email summary to admin with:
    - Total users & new users today
    - Total assessments & today's count
    - Average rating with star display
    - Total feedback & today's count
    - Low rating alerts if applicable

---

### 📧 Email Notification Service

**Automatic Notifications:**
- **Low Rating Alert (Immediate):**
  - Triggered on 1-2 star feedback submission
  - HTML-formatted alert email
  - Contains: User ID, Rating, Comment, Timestamp

- **Daily Digest (Manual/Scheduled):**
  - Comprehensive summary email
  - New users and assessments today
  - Feedback statistics
  - Low rating alerts section

**Configuration:**
- SMTP via Gmail (or any SMTP server)
- App Password authentication
- Admin email for notifications
- Enable/disable via environment variables

---

### 📄 PDF Report Generation

**Analytics Report Includes:**
- System overview statistics table
- User distribution by strand (pie chart data)
- Feedback summary with average ratings
- Recommendation status breakdown
- Professional styling with school colors
- Generated timestamp

---

## Project Structure

```
Admin_Page-main/
├── backend_python/           # FastAPI Backend
│   ├── main.py              # Application entry point
│   ├── create_admin.py      # Admin user setup script
│   ├── migrations.py        # Database migrations
│   ├── requirements.txt     # Python dependencies
│   ├── .env                 # Environment variables (gitignored)
│   ├── .env.example         # Environment template
│   ├── middleware/          # Security middleware
│   │   └── security.py      # JWT, rate limiting, headers
│   ├── models/
│   │   └── database.py      # Database connection
│   ├── routes/              # API endpoints
│   │   ├── auth.py          # Authentication
│   │   ├── users.py         # User management
│   │   ├── courses.py       # Course management
│   │   ├── tests.py         # Test management
│   │   ├── recommendations.py
│   │   ├── analytics.py
│   │   └── feedback.py
│   └── services/            # Business logic
│       ├── email_service.py
│       └── pdf_service.py
│
├── frontend/                 # React Frontend
│   ├── src/
│   │   ├── App.js           # Main application
│   │   ├── pages/           # Page components
│   │   │   ├── LoginPage.js
│   │   │   ├── Dashboard.js
│   │   │   ├── UsersPage.js
│   │   │   ├── CoursesPage.js
│   │   │   ├── QuestionsPage.js
│   │   │   ├── RecommendationsPage.js
│   │   │   └── ...
│   │   ├── components/      # Reusable components
│   │   │   ├── Navigation.js
│   │   │   └── Toast.js
│   │   └── utils/
│   │       └── cache.js     # Client-side cache manager
│   └── public/
│
├── docker-compose.yml        # Docker configuration
└── README.md                 # This file
```

---

## API Endpoints

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login and get JWT token |
| POST | `/api/auth/logout` | Logout (requires auth) |
| GET | `/api/auth/verify` | Verify token validity |

### Users (`/api/users`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List users (paginated, searchable) |
| GET | `/api/users/{id}` | Get user by ID |
| GET | `/api/users/{id}/test-history` | Get user's test history |
| POST | `/api/users` | Create user |
| PUT | `/api/users/{id}` | Update user |
| DELETE | `/api/users/{id}` | Delete user (cascades) |
| PATCH | `/api/users/{id}/status` | Toggle active status |
| GET | `/api/users/stats/overview` | User statistics |

### Courses (`/api/courses`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/courses` | List courses (paginated, searchable) |
| GET | `/api/courses/{id}` | Get course by ID |
| POST | `/api/courses` | Create course |
| PUT | `/api/courses/{id}` | Update course |
| DELETE | `/api/courses/{id}` | Delete course |

### Tests (`/api/tests`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tests` | List all tests |
| GET | `/api/tests/{id}` | Get test with questions |
| POST | `/api/tests` | Create test |
| PUT | `/api/tests/{id}` | Update test |
| DELETE | `/api/tests/{id}` | Delete test |
| GET | `/api/tests/traits` | Get all available traits |

### Questions (`/api/tests/questions`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tests/questions/list/all` | List questions (paginated, searchable) |
| GET | `/api/tests/questions/{id}` | Get question with options |
| GET | `/api/tests/questions/{id}/options` | Get options for question |
| POST | `/api/tests/questions` | Create question |
| PUT | `/api/tests/questions/{id}` | Update question |
| DELETE | `/api/tests/questions/{id}` | Delete question |
| POST | `/api/tests/questions/{id}/options` | Add option |
| PUT | `/api/tests/options/{id}` | Update option |
| DELETE | `/api/tests/options/{id}` | Delete option |

### Recommendations (`/api/recommendations`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/recommendations` | List all recommendations |
| GET | `/api/recommendations/{id}` | Get single recommendation |
| GET | `/api/recommendations/filter/status/{status}` | Filter by status (optimized) |
| GET | `/api/recommendations/stats/status` | Status statistics |
| PUT | `/api/recommendations/{id}/status` | Update status |
| PUT | `/api/recommendations/edit/{id}` | Full edit |
| DELETE | `/api/recommendations/delete/{id}` | Delete |
| POST | `/api/recommendations/bulk-update` | Bulk status update |
| POST | `/api/recommendations/generate` | Generate from rules |
| GET | `/api/recommendations/export/csv` | Export to CSV |
| GET | `/api/recommendations/export/summary` | Export summary |
| GET | `/api/recommendations/history` | History with filters |
| GET | `/api/recommendations/history/timeline` | Timeline data |

### Recommendation Rules (`/api/recommendations/rules`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/recommendations/rules/all` | List all rules |
| GET | `/api/recommendations/rules/{id}` | Get single rule |
| POST | `/api/recommendations/rules` | Create rule |
| PUT | `/api/recommendations/rules/{id}` | Update rule |
| DELETE | `/api/recommendations/rules/{id}` | Delete rule |
| PATCH | `/api/recommendations/rules/{id}/toggle` | Toggle active |
| GET | `/api/recommendations/rules/options/traits` | Available traits |
| GET | `/api/recommendations/rules/options/strands` | Available strands |

### Feedback (`/api/feedback`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/feedback` | List feedback (paginated, filterable) |
| GET | `/api/feedback/{id}` | Get single feedback |
| GET | `/api/feedback/stats/overview` | Feedback statistics |
| POST | `/api/feedback/submit` | Submit feedback (student-facing) |

### Analytics (`/api/analytics`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/system/overview` | System stats |
| GET | `/api/analytics/admin/overview` | Admin dashboard stats |
| GET | `/api/analytics/admin/assessments` | Assessment analytics |
| GET | `/api/analytics/admin/users/{id}/assessments` | User assessment history |
| GET | `/api/analytics/admin/all-users-summary` | All users summary |
| GET | `/api/analytics/admin/recommendations-summary` | Recommendations stats |
| GET | `/api/analytics/export/pdf` | Download PDF report |
| POST | `/api/analytics/send-daily-digest` | Send email digest |

### API Documentation
- **Swagger UI:** http://localhost:5000/docs (development only)
- **ReDoc:** http://localhost:5000/redoc (development only)

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `5432` |
| `DB_NAME` | Database name | `railway` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | `your_password` |
| `PORT` | Backend port | `5000` |
| `ENVIRONMENT` | `development` or `production` | `development` |
| `JWT_SECRET` | Secret key for JWT | (auto-generated) |
| `JWT_EXPIRATION_HOURS` | Token expiry | `24` |
| `RATE_LIMIT_REQUESTS` | Max requests | `100` |
| `RATE_LIMIT_WINDOW_MINUTES` | Rate limit window | `15` |
| `SMTP_HOST` | Email server | `smtp.gmail.com` |
| `SMTP_PORT` | Email port | `587` |
| `SMTP_USER` | Email address | `your@gmail.com` |
| `SMTP_PASSWORD` | App password | `your_app_password` |
| `ADMIN_EMAIL` | Admin notification email | `admin@gmail.com` |

---

## Performance Optimizations

The admin panel includes several performance optimizations for better user experience:

### Frontend Optimizations

| Feature | Optimization | Benefit |
|---------|--------------|---------|
| **Search Debouncing** | 300ms debounce on search inputs (Questions, Courses) | Prevents API spam on every keystroke |
| **Optimistic UI Updates** | Status changes update UI instantly before API response | Instant feedback on recommendation status changes |
| **Client-side Caching** | Cache manager for frequently accessed data | Reduces redundant API calls |

### Backend Optimizations

| Endpoint | Optimization | Benefit |
|----------|--------------|---------|
| `/api/recommendations/filter/status` | SQL-level pagination instead of Python pagination | ~50-100x faster for large datasets |
| `/api/recommendations/filter/status` | Batch query for traits_found | Eliminates N+1 query problem |
| `/api/tests/questions/list/all` | Server-side search with pagination | Efficient filtering at database level |
| `/api/courses` | Server-side search with pagination | Efficient filtering at database level |

### How It Works

**Before (Slow):**
1. Fetch ALL recommendations from database
2. Group and sort in Python
3. Paginate the results in memory
4. Return page to frontend

**After (Fast):**
1. Get paginated attempt_ids at SQL level (with status filter)
2. Fetch only recommendations for those specific attempt_ids
3. Batch query for additional data (traits_found)
4. Return pre-paginated results

---

## Security Best Practices

### Before Production:

1. **Regenerate JWT Secret:**
   ```bash
   python -c "import secrets; print(secrets.token_hex(32))"
   ```

2. **Update Database Password:**
   - Change the Railway database password
   - Update `DB_PASSWORD` in `.env`

3. **Regenerate Gmail App Password:**
   - Revoke old app password in Google settings
   - Create new one and update `SMTP_PASSWORD`

4. **Set Environment to Production:**
   ```env
   ENVIRONMENT=production
   ```
   This disables Swagger/ReDoc documentation.

---

## Troubleshooting

### "Invalid email or password"
- Ensure you've created an admin user with `python create_admin.py`
- Check that the backend is running on port 5000

### "Too many login attempts"
- Wait 15 minutes or restart the backend server
- This is brute force protection working as intended

### "Database connection failed"
- Check your `.env` file has correct database credentials
- Ensure the database is accessible (Railway may have IP restrictions)

### Email notifications not working
- Verify Gmail App Password is correct (16 characters, no spaces)
- Ensure 2FA is enabled on your Google account
- Check SMTP_USER matches the account with the app password

---

## Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up --build
```

---

## License

This project is part of a capstone project for educational purposes.
