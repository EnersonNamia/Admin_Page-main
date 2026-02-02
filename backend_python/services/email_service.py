"""
Email Notification Service
Only sends essential notifications to avoid email flooding:
1. Low Rating Alerts (1-2 stars) - Immediate
2. Daily Digest Summary - Once per day
"""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class EmailService:
    """Email notification service using SMTP - Essential notifications only"""
    
    def __init__(self):
        load_dotenv()
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
    
    # ============================================================
    # ESSENTIAL NOTIFICATION 1: LOW RATING ALERT (Immediate)
    # ============================================================
    def notify_low_rating_feedback(self, feedback_data: dict) -> bool:
        """Alert admin immediately when a low rating (1-2 stars) is received"""
        rating = feedback_data.get('rating', 0)
        
        # Only send for ratings 1-2
        if rating > 2:
            return False
            
        subject = f"⚠️ Low Rating Alert - {rating}/5 Stars Received"
        stars = "⭐" * rating + "☆" * (5 - rating)
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }}
                .container {{ background: white; border-radius: 10px; padding: 30px; max-width: 600px; margin: 0 auto; }}
                .header {{ background: linear-gradient(135deg, #e74c3c, #c0392b); color: white; padding: 20px; border-radius: 10px 10px 0 0; margin: -30px -30px 20px -30px; text-align: center; }}
                .alert-box {{ background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 15px 0; }}
                .rating {{ font-size: 28px; margin: 10px 0; }}
                .feedback-text {{ background: #f9f9f9; padding: 15px; border-left: 4px solid #e74c3c; margin: 15px 0; }}
                .meta {{ color: #666; font-size: 14px; }}
                .footer {{ margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; color: #888; font-size: 12px; text-align: center; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2 style="margin: 0;">⚠️ Low Rating Alert</h2>
                </div>
                
                <div class="alert-box">
                    <strong>Action Required:</strong> A user has submitted feedback with a low rating.
                </div>
                
                <p class="rating">Rating: {stars} ({rating}/5)</p>
                
                <div class="feedback-text">
                    <strong>Comment:</strong><br>
                    {feedback_data.get("comment") or "No comment provided"}
                </div>
                
                <p class="meta">
                    <strong>User ID:</strong> {feedback_data.get('user_id', 'N/A')}<br>
                    <strong>Received:</strong> {datetime.now().strftime('%B %d, %Y at %I:%M %p')}
                </p>
                
                <div class="footer">
                    Course Recommendation System - Admin Alert
                </div>
            </div>
        </body>
        </html>
        """
        
        return self._send_email(self.admin_email, subject, html_content)
    
    # ============================================================
    # ESSENTIAL NOTIFICATION 2: DAILY DIGEST (Once per day)
    # ============================================================
    def send_daily_digest(self, stats: dict) -> bool:
        """Send a daily summary email with all important stats"""
        subject = f"📊 Daily Digest - {datetime.now().strftime('%B %d, %Y')}"
        
        # Extract stats
        total_users = stats.get('total_users', 0)
        new_users_today = stats.get('new_users_today', 0)
        total_feedback = stats.get('total_feedback', 0)
        feedback_today = stats.get('feedback_today', 0)
        avg_rating = stats.get('average_rating', 0)
        low_ratings_today = stats.get('low_ratings_today', 0)
        total_assessments = stats.get('total_assessments', 0)
        assessments_today = stats.get('assessments_today', 0)
        
        # Rating stars display
        full_stars = int(avg_rating)
        rating_display = "⭐" * full_stars + "☆" * (5 - full_stars)
        
        # Alert section HTML
        alert_html = ""
        if low_ratings_today > 0:
            alert_html = f"""
                <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <strong>⚠️ Attention:</strong> {low_ratings_today} low rating(s) received today. Review in the admin panel.
                </div>
            """
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }}
                .container {{ background: white; border-radius: 10px; padding: 30px; max-width: 600px; margin: 0 auto; }}
                .header {{ background: linear-gradient(135deg, #1a1a2e, #16213e); color: white; padding: 25px; border-radius: 10px 10px 0 0; margin: -30px -30px 20px -30px; text-align: center; }}
                .stat-card {{ background: #f8f9fa; border-radius: 8px; padding: 20px; text-align: center; margin: 10px 0; display: inline-block; width: 45%; }}
                .stat-value {{ font-size: 32px; font-weight: bold; color: #1a1a2e; }}
                .stat-label {{ color: #666; font-size: 14px; margin-top: 5px; }}
                .stat-change {{ font-size: 12px; margin-top: 5px; color: #27ae60; }}
                .highlight {{ background: linear-gradient(135deg, #667eea, #764ba2); color: white; }}
                .highlight .stat-value {{ color: white; }}
                .highlight .stat-label {{ color: rgba(255,255,255,0.8); }}
                .footer {{ margin-top: 25px; padding-top: 20px; border-top: 1px solid #eee; color: #888; font-size: 12px; text-align: center; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2 style="margin: 0;">📊 Daily Digest</h2>
                    <p style="margin: 10px 0 0 0; opacity: 0.9;">{datetime.now().strftime('%B %d, %Y')}</p>
                </div>
                
                <div style="text-align: center;">
                    <div class="stat-card">
                        <div class="stat-value">{total_users}</div>
                        <div class="stat-label">Total Users</div>
                        <div class="stat-change">+{new_users_today} today</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">{total_assessments}</div>
                        <div class="stat-label">Total Assessments</div>
                        <div class="stat-change">+{assessments_today} today</div>
                    </div>
                    <div class="stat-card highlight">
                        <div class="stat-value">{avg_rating:.1f}</div>
                        <div class="stat-label">Avg Rating {rating_display}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">{total_feedback}</div>
                        <div class="stat-label">Total Feedback</div>
                        <div class="stat-change">+{feedback_today} today</div>
                    </div>
                </div>
                
                {alert_html}
                
                <div class="footer">
                    <p>Course Recommendation System - Daily Summary</p>
                    <p style="font-size: 11px;">This is an automated daily digest.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self._send_email(self.admin_email, subject, html_content)
    
    # ============================================================
    # TEST EMAIL (For verifying configuration)
    # ============================================================
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
                .header {{ background: linear-gradient(135deg, #27ae60, #2ecc71); color: white; padding: 20px; border-radius: 10px 10px 0 0; margin: -30px -30px 20px -30px; text-align: center; }}
                .success {{ background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }}
                .footer {{ margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; color: #888; font-size: 12px; text-align: center; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2 style="margin: 0;">✅ Email Configuration Test</h2>
                </div>
                
                <div class="success">
                    <strong>Success!</strong> Your email notifications are working correctly.
                </div>
                
                <p>This confirms that:</p>
                <ul>
                    <li>✅ SMTP configuration is correct</li>
                    <li>✅ Low rating alerts will be sent</li>
                    <li>✅ Daily digest emails will work</li>
                </ul>
                
                <p><strong>Sent at:</strong> {datetime.now().strftime('%B %d, %Y at %I:%M %p')}</p>
                
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
