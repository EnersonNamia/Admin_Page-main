"""
Email Notification Service
Sends email notifications to admins for important events
"""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import Optional


class EmailService:
    """Email notification service using SMTP"""
    
    def __init__(self):
        self.smtp_host = os.getenv('SMTP_HOST', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', 587))
        self.smtp_user = os.getenv('SMTP_USER', '')
        self.smtp_password = os.getenv('SMTP_PASSWORD', '')
        self.admin_email = os.getenv('ADMIN_EMAIL', '')
        self.enabled = bool(self.smtp_user and self.smtp_password)
    
    def _send_email(self, to_email: str, subject: str, html_content: str) -> bool:
        """Send an email using SMTP"""
        if not self.enabled:
            print(f"[EMAIL] Service disabled - would send to {to_email}: {subject}")
            return False
        
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.smtp_user
            msg['To'] = to_email
            
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)
            
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.sendmail(self.smtp_user, to_email, msg.as_string())
            
            print(f"[EMAIL] Sent successfully to {to_email}")
            return True
            
        except Exception as e:
            print(f"[EMAIL] Failed to send: {str(e)}")
            return False
    
    def notify_new_feedback(self, feedback_data: dict) -> bool:
        """Notify admin when new feedback is submitted"""
        subject = f"📝 New Feedback Received - Rating: {feedback_data.get('rating', 'N/A')}/5"
        
        rating = feedback_data.get('rating', 0)
        stars = '⭐' * rating + '☆' * (5 - rating)
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }}
                .container {{ background: white; border-radius: 10px; padding: 30px; max-width: 600px; margin: 0 auto; }}
                .header {{ background: linear-gradient(135deg, #1a1a2e, #16213e); color: white; padding: 20px; border-radius: 10px 10px 0 0; margin: -30px -30px 20px -30px; }}
                .rating {{ font-size: 24px; margin: 15px 0; }}
                .feedback-text {{ background: #f9f9f9; padding: 15px; border-left: 4px solid #4CAF50; margin: 15px 0; }}
                .meta {{ color: #666; font-size: 14px; }}
                .footer {{ margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; color: #888; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2 style="margin: 0;">📝 New Feedback Submitted</h2>
                </div>
                
                <p class="meta">Submitted on: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}</p>
                
                <div class="rating">{stars}</div>
                <p><strong>Rating:</strong> {rating}/5</p>
                
                {f'<div class="feedback-text"><strong>Comment:</strong><br>{feedback_data.get("comment", "No comment provided")}</div>' if feedback_data.get("comment") else ''}
                
                <p class="meta">
                    <strong>User ID:</strong> {feedback_data.get('user_id', 'N/A')}<br>
                    <strong>Recommendation ID:</strong> {feedback_data.get('recommendation_id', 'N/A')}
                </p>
                
                <div class="footer">
                    This is an automated notification from the Course Recommendation System.
                </div>
            </div>
        </body>
        </html>
        """
        
        return self._send_email(self.admin_email, subject, html_content)
    
    def notify_new_user(self, user_data: dict) -> bool:
        """Notify admin when a new user registers"""
        subject = f"👤 New User Registration - {user_data.get('full_name', 'Unknown')}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }}
                .container {{ background: white; border-radius: 10px; padding: 30px; max-width: 600px; margin: 0 auto; }}
                .header {{ background: linear-gradient(135deg, #4CAF50, #45a049); color: white; padding: 20px; border-radius: 10px 10px 0 0; margin: -30px -30px 20px -30px; }}
                .info-row {{ padding: 10px 0; border-bottom: 1px solid #eee; }}
                .label {{ color: #666; font-size: 14px; }}
                .value {{ font-weight: bold; color: #333; }}
                .footer {{ margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; color: #888; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2 style="margin: 0;">👤 New User Registration</h2>
                </div>
                
                <div class="info-row">
                    <span class="label">Full Name:</span>
                    <span class="value">{user_data.get('full_name', 'N/A')}</span>
                </div>
                <div class="info-row">
                    <span class="label">Email:</span>
                    <span class="value">{user_data.get('email', 'N/A')}</span>
                </div>
                <div class="info-row">
                    <span class="label">Strand:</span>
                    <span class="value">{user_data.get('strand', 'N/A')}</span>
                </div>
                <div class="info-row">
                    <span class="label">GWA:</span>
                    <span class="value">{user_data.get('gwa', 'N/A')}</span>
                </div>
                <div class="info-row">
                    <span class="label">Registered:</span>
                    <span class="value">{datetime.now().strftime('%B %d, %Y at %I:%M %p')}</span>
                </div>
                
                <div class="footer">
                    This is an automated notification from the Course Recommendation System.
                </div>
            </div>
        </body>
        </html>
        """
        
        return self._send_email(self.admin_email, subject, html_content)
    
    def notify_low_rating_feedback(self, feedback_data: dict) -> bool:
        """Alert admin for low rating feedback (1-2 stars)"""
        subject = f"⚠️ Low Rating Feedback Alert - {feedback_data.get('rating', 'N/A')}/5 Stars"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }}
                .container {{ background: white; border-radius: 10px; padding: 30px; max-width: 600px; margin: 0 auto; }}
                .header {{ background: linear-gradient(135deg, #ff6b6b, #ee5a24); color: white; padding: 20px; border-radius: 10px 10px 0 0; margin: -30px -30px 20px -30px; }}
                .alert-box {{ background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 15px 0; }}
                .feedback-text {{ background: #f9f9f9; padding: 15px; border-left: 4px solid #ff6b6b; margin: 15px 0; }}
                .footer {{ margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; color: #888; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2 style="margin: 0;">⚠️ Low Rating Feedback Alert</h2>
                </div>
                
                <div class="alert-box">
                    <strong>Attention Required:</strong> A user has submitted feedback with a low rating.
                    Please review and take appropriate action.
                </div>
                
                <p><strong>Rating:</strong> {feedback_data.get('rating', 0)}/5 ⭐</p>
                
                {f'<div class="feedback-text"><strong>User Comment:</strong><br>{feedback_data.get("comment", "No comment")}</div>' if feedback_data.get("comment") else ''}
                
                <p><strong>User ID:</strong> {feedback_data.get('user_id', 'N/A')}</p>
                
                <div class="footer">
                    This is an automated alert from the Course Recommendation System.
                </div>
            </div>
        </body>
        </html>
        """
        
        return self._send_email(self.admin_email, subject, html_content)
    
    def send_test_email(self) -> bool:
        """Send a test email to verify configuration"""
        subject = "🧪 Test Email - Course Recommendation System"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }}
                .container {{ background: white; border-radius: 10px; padding: 30px; max-width: 600px; margin: 0 auto; }}
                .header {{ background: linear-gradient(135deg, #1a1a2e, #16213e); color: white; padding: 20px; border-radius: 10px 10px 0 0; margin: -30px -30px 20px -30px; text-align: center; }}
                .success {{ background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }}
                .footer {{ margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; color: #888; font-size: 12px; text-align: center; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2 style="margin: 0;">🧪 Email Configuration Test</h2>
                </div>
                
                <div class="success">
                    <strong>✅ Success!</strong> Your email notifications are working correctly.
                </div>
                
                <p>This is a test email from the <strong>Course Recommendation System</strong> admin panel.</p>
                
                <p>If you received this email, it means:</p>
                <ul>
                    <li>✅ SMTP configuration is correct</li>
                    <li>✅ Email notifications will work for feedback alerts</li>
                    <li>✅ System reports can be sent to your email</li>
                </ul>
                
                <p>Sent at: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}</p>
                
                <div class="footer">
                    Course Recommendation System - Admin Panel
                </div>
            </div>
        </body>
        </html>
        """
        
        return self._send_email(self.admin_email, subject, html_content)


# Singleton instance
email_service = EmailService()
