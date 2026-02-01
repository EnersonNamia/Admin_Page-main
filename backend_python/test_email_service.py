"""Test Email Sending"""
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from services.email_service import email_service

print("=" * 60)
print("EMAIL SERVICE TEST")
print("=" * 60)
print(f"SMTP Host: {email_service.smtp_host}")
print(f"SMTP Port: {email_service.smtp_port}")
print(f"SMTP User: {email_service.smtp_user}")
print(f"Admin Email: {email_service.admin_email}")
print(f"Service Enabled: {email_service.enabled}")
print("=" * 60)

if not email_service.enabled:
    print("\n⚠️  EMAIL SERVICE IS DISABLED!")
    print("\nTo enable email notifications:")
    print("1. Go to https://myaccount.google.com/security")
    print("2. Enable 2-Step Verification (if not already)")
    print("3. Go to App Passwords: https://myaccount.google.com/apppasswords")
    print("4. Create a new App Password for 'Mail' on 'Windows Computer'")
    print("5. Copy the 16-character password (no spaces)")
    print("6. Update .env file: SMTP_PASSWORD=your16charpassword")
    print("7. Restart the backend server")
else:
    print("\n📧 Sending test email...")
    
    # Send a test email
    result = email_service.send_test_email()
    
    if result:
        print("✅ Test email sent successfully!")
        print(f"   Check your inbox at: {email_service.admin_email}")
    else:
        print("❌ Failed to send test email")
        print("   Check the console for error details")
