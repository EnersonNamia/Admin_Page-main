"""
PDF Report Generation Service
Generates professional PDF reports for analytics data
"""

from io import BytesIO
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.graphics.shapes import Drawing, Rect
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.piecharts import Pie


class PDFReportGenerator:
    """Generate PDF reports for the Course Recommendation System"""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self.title_style = ParagraphStyle(
            'CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            textColor=colors.HexColor('#1a1a2e')
        )
        self.heading_style = ParagraphStyle(
            'CustomHeading',
            parent=self.styles['Heading2'],
            fontSize=16,
            spaceBefore=20,
            spaceAfter=10,
            textColor=colors.HexColor('#16213e')
        )
        self.normal_style = ParagraphStyle(
            'CustomNormal',
            parent=self.styles['Normal'],
            fontSize=11,
            spaceAfter=6
        )
    
    def generate_analytics_report(self, data: dict) -> BytesIO:
        """Generate a comprehensive analytics PDF report"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=50,
            leftMargin=50,
            topMargin=50,
            bottomMargin=50
        )
        
        story = []
        
        # Title
        story.append(Paragraph("📊 Analytics Report", self.title_style))
        story.append(Paragraph(
            f"Generated on: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}",
            self.normal_style
        ))
        story.append(Spacer(1, 20))
        
        # System Overview Section
        story.append(Paragraph("System Overview", self.heading_style))
        
        overview_data = [
            ["Metric", "Value"],
            ["Total Users", str(data.get('total_users', 0))],
            ["Active Users", str(data.get('active_users', 0))],
            ["Total Courses", str(data.get('total_courses', 0))],
            ["Total Tests", str(data.get('total_tests', 0))],
            ["Total Questions", str(data.get('total_questions', 0))],
            ["Total Test Attempts", str(data.get('total_attempts', 0))],
            ["Total Recommendations", str(data.get('total_recommendations', 0))],
        ]
        
        overview_table = Table(overview_data, colWidths=[3*inch, 2*inch])
        overview_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a1a2e')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f5f5f5')),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#cccccc')),
            ('FONTSIZE', (0, 1), (-1, -1), 11),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ]))
        story.append(overview_table)
        story.append(Spacer(1, 30))
        
        # User Statistics Section
        if 'strand_distribution' in data:
            story.append(Paragraph("User Distribution by Strand", self.heading_style))
            strand_data = [["Strand", "Count"]]
            for strand, count in data['strand_distribution'].items():
                strand_data.append([strand, str(count)])
            
            strand_table = Table(strand_data, colWidths=[2.5*inch, 1.5*inch])
            strand_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4CAF50')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#cccccc')),
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ]))
            story.append(strand_table)
            story.append(Spacer(1, 30))
        
        # Feedback Summary Section
        if 'feedback_stats' in data:
            story.append(Paragraph("Feedback Summary", self.heading_style))
            fb = data['feedback_stats']
            feedback_data = [
                ["Metric", "Value"],
                ["Total Feedback", str(fb.get('total', 0))],
                ["Average Rating", f"{fb.get('average_rating', 0):.1f} / 5.0"],
                ["Positive (4-5 stars)", str(fb.get('positive', 0))],
                ["Neutral (3 stars)", str(fb.get('neutral', 0))],
                ["Negative (1-2 stars)", str(fb.get('negative', 0))],
            ]
            
            feedback_table = Table(feedback_data, colWidths=[3*inch, 2*inch])
            feedback_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2196F3')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#cccccc')),
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ]))
            story.append(feedback_table)
            story.append(Spacer(1, 30))
        
        # Recommendation Status Section
        if 'recommendation_stats' in data:
            story.append(Paragraph("Recommendation Status", self.heading_style))
            rec = data['recommendation_stats']
            rec_data = [
                ["Status", "Count"],
                ["Pending", str(rec.get('pending', 0))],
                ["Approved", str(rec.get('approved', 0))],
                ["Rejected", str(rec.get('rejected', 0))],
                ["Completed", str(rec.get('completed', 0))],
            ]
            
            rec_table = Table(rec_data, colWidths=[2.5*inch, 1.5*inch])
            rec_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#FF9800')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#cccccc')),
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ]))
            story.append(rec_table)
        
        # Footer
        story.append(Spacer(1, 40))
        story.append(Paragraph(
            "— Course Recommendation System Admin Dashboard —",
            ParagraphStyle('Footer', parent=self.normal_style, alignment=1, textColor=colors.gray)
        ))
        
        doc.build(story)
        buffer.seek(0)
        return buffer
    
    def generate_users_report(self, users: list) -> BytesIO:
        """Generate a PDF report of all users"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=30,
            leftMargin=30,
            topMargin=50,
            bottomMargin=50
        )
        
        story = []
        
        # Title
        story.append(Paragraph("👥 Users Report", self.title_style))
        story.append(Paragraph(
            f"Generated on: {datetime.now().strftime('%B %d, %Y')} | Total Users: {len(users)}",
            self.normal_style
        ))
        story.append(Spacer(1, 20))
        
        # Users Table
        table_data = [["#", "Name", "Email", "Strand", "GWA", "Status"]]
        for i, user in enumerate(users[:100], 1):  # Limit to 100 for PDF
            table_data.append([
                str(i),
                user.get('full_name', 'N/A')[:25],
                user.get('email', 'N/A')[:30],
                user.get('strand', 'N/A'),
                str(user.get('gwa', 'N/A')),
                "Active" if user.get('is_active') else "Inactive"
            ])
        
        users_table = Table(table_data, colWidths=[0.4*inch, 1.5*inch, 2*inch, 0.7*inch, 0.6*inch, 0.8*inch])
        users_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a1a2e')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9f9f9')]),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(users_table)
        
        doc.build(story)
        buffer.seek(0)
        return buffer


# Singleton instance
pdf_generator = PDFReportGenerator()
