# Course Recommendation System - Admin Panel

## Overview

A full-stack admin dashboard for the Course Recommendation System built with:
- **Backend:** FastAPI (Python)
- **Frontend:** React
- **Database:** PostgreSQL (Railway)

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
│   │   │   └── ...
│   │   └── components/      # Reusable components
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
| GET | `/api/users/` | List users (paginated) |
| GET | `/api/users/{id}` | Get user by ID |
| POST | `/api/users/` | Create user |
| PUT | `/api/users/{id}` | Update user |
| DELETE | `/api/users/{id}` | Delete user |

### Other Endpoints
- `/api/courses` - Course management
- `/api/tests` - Test management
- `/api/recommendations` - Recommendation system
- `/api/analytics` - Statistics and reports
- `/api/feedback` - User feedback

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
