"""
Admin User Setup Script
Run this script to create an admin user for the Course Recommendation System

Usage:
    python create_admin.py

This will prompt you for:
    - Admin email address
    - Admin password (must meet security requirements)
    - First name
    - Last name
"""

import os
import sys
import getpass
from dotenv import load_dotenv

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from passlib.hash import bcrypt
from models.database import execute_query, execute_query_one, get_db_pool, test_connection

load_dotenv()


def validate_password(password: str) -> tuple:
    """Validate password meets security requirements"""
    errors = []
    
    if len(password) < 8:
        errors.append("Password must be at least 8 characters long")
    if not any(c.isupper() for c in password):
        errors.append("Password must contain at least one uppercase letter")
    if not any(c.islower() for c in password):
        errors.append("Password must contain at least one lowercase letter")
    if not any(c.isdigit() for c in password):
        errors.append("Password must contain at least one digit")
    
    special_chars = "!@#$%^&*()_+-=[]{}|;':\",./<>?"
    if not any(c in special_chars for c in password):
        errors.append("Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;':\",./<>?)")
    
    return (len(errors) == 0, errors)


def create_admin_user():
    """Create an admin user interactively"""
    print("\n" + "=" * 60)
    print("   ADMIN USER SETUP - Course Recommendation System")
    print("=" * 60 + "\n")
    
    # Test database connection
    print("🔄 Testing database connection...")
    try:
        get_db_pool()
        if not test_connection():
            print("❌ Database connection failed. Please check your .env configuration.")
            return False
        print("✅ Database connected successfully!\n")
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        return False
    
    # Get admin details
    print("Please enter the admin user details:\n")
    
    # Email
    while True:
        email = input("📧 Email address: ").strip()
        if "@" in email and "." in email:
            # Check if email already exists
            existing = execute_query_one(
                "SELECT user_id FROM users WHERE email = $1",
                [email]
            )
            if existing:
                print(f"   ⚠️  User with email '{email}' already exists.")
                update = input("   Do you want to update this user to admin? (y/n): ").strip().lower()
                if update == 'y':
                    # Update existing user - we'll handle this later
                    print(f"   ✅ Will update existing user to admin status.\n")
                    break
                else:
                    print("   Please enter a different email.\n")
                    continue
            break
        print("   ❌ Please enter a valid email address.\n")
    
    # Password
    while True:
        print("\n🔐 Password requirements:")
        print("   - At least 8 characters")
        print("   - At least one uppercase letter")
        print("   - At least one lowercase letter")
        print("   - At least one digit")
        print("   - At least one special character\n")
        
        password = getpass.getpass("🔐 Password: ")
        is_valid, errors = validate_password(password)
        
        if not is_valid:
            print("   ❌ Password does not meet requirements:")
            for error in errors:
                print(f"      - {error}")
            continue
        
        password_confirm = getpass.getpass("🔐 Confirm password: ")
        if password != password_confirm:
            print("   ❌ Passwords do not match. Please try again.")
            continue
        
        break
    
    # Name
    first_name = input("\n👤 First name: ").strip() or "Admin"
    last_name = input("👤 Last name: ").strip() or "User"
    
    # Username
    default_username = f"{first_name.lower()}_{last_name.lower()}".replace(" ", "_")
    username = input(f"👤 Username [{default_username}]: ").strip() or default_username
    
    # Confirm
    print("\n" + "-" * 40)
    print("Admin User Details:")
    print(f"   Email:     {email}")
    print(f"   Username:  {username}")
    print(f"   Name:      {first_name} {last_name}")
    print("-" * 40)
    
    confirm = input("\nCreate this admin user? (y/n): ").strip().lower()
    if confirm != 'y':
        print("\n❌ Admin user creation cancelled.")
        return False
    
    # Hash password
    password_hash = bcrypt.hash(password[:72])  # bcrypt has 72 byte limit
    
    # Check if user exists (update) or create new
    existing = execute_query_one(
        "SELECT user_id FROM users WHERE email = $1",
        [email]
    )
    
    try:
        if existing:
            # Update existing user
            execute_query(
                """UPDATE users SET 
                    username = $1,
                    first_name = $2,
                    last_name = $3,
                    password_hash = $4,
                    is_active = 1
                WHERE email = $5""",
                [username, first_name, last_name, password_hash, email],
                fetch=False
            )
            print(f"\n✅ Admin user updated successfully!")
        else:
            # Create new user
            execute_query(
                """INSERT INTO users (username, first_name, last_name, email, password_hash, academic_info, is_active)
                VALUES ($1, $2, $3, $4, $5, '{"strand": "ADMIN", "gwa": 100}', 1)""",
                [username, first_name, last_name, email, password_hash],
                fetch=False
            )
            print(f"\n✅ Admin user created successfully!")
        
        print(f"\n📋 Login credentials:")
        print(f"   Email:    {email}")
        print(f"   Password: (the password you entered)")
        print(f"\n🌐 Access the admin panel at: http://localhost:3000")
        print(f"   Make sure the backend is running on: http://localhost:5000\n")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Failed to create admin user: {e}")
        return False


def list_admin_users():
    """List all users that can access admin panel"""
    print("\n📋 Current Users:")
    print("-" * 80)
    
    try:
        users = execute_query(
            """SELECT user_id, username, email, 
                      CONCAT(first_name, ' ', last_name) as full_name,
                      is_active, last_login
               FROM users 
               ORDER BY user_id 
               LIMIT 20"""
        )
        
        if not users:
            print("   No users found in database.")
        else:
            print(f"{'ID':<5} {'Username':<20} {'Email':<30} {'Active':<8}")
            print("-" * 80)
            for user in users:
                active = "✅" if user.get('is_active') else "❌"
                print(f"{user['user_id']:<5} {user['username'] or 'N/A':<20} {user['email']:<30} {active:<8}")
        
        print("-" * 80)
    except Exception as e:
        print(f"   Error listing users: {e}")


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("   Course Recommendation System - Admin Setup")
    print("=" * 60)
    
    print("\nOptions:")
    print("  1. Create/Update admin user")
    print("  2. List existing users")
    print("  3. Exit")
    
    choice = input("\nSelect option (1-3): ").strip()
    
    if choice == "1":
        create_admin_user()
    elif choice == "2":
        list_admin_users()
    elif choice == "3":
        print("\nGoodbye!")
    else:
        print("\nInvalid option. Running admin user creation...")
        create_admin_user()
