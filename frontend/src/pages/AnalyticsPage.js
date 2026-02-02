import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AnalyticsPage.css';

const API_BASE_URL = 'http://localhost:5000/api';

function AnalyticsPage() {
  const [analytics, setAnalytics] = useState({
    users: 0,
    courses: 0,
    tests: 0,
    recommendations: 0,
  });
  const [feedbackStats, setFeedbackStats] = useState({
    total_feedback: 0,
    average_rating: 0,
    positive_feedback: 0,
    neutral_feedback: 0,
    negative_feedback: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [users, courses, adminOverview, recs, feedback] = await Promise.all([
        axios.get(`${API_BASE_URL}/users?limit=1`).catch(() => ({ data: { pagination: { total: 0 } } })),
        axios.get(`${API_BASE_URL}/courses?limit=1`).catch(() => ({ data: { pagination: { total: 0 } } })),
        axios.get(`${API_BASE_URL}/analytics/admin/overview`).catch(() => ({ data: { overview: {} } })),
        axios.get(`${API_BASE_URL}/recommendations?limit=1`).catch(() => ({ data: { pagination: { total: 0 } } })),
        axios.get(`${API_BASE_URL}/feedback/stats/overview`).catch(() => ({ data: {} })),
      ]);

      setAnalytics({
        users: users.data?.pagination?.total || 0,
        courses: courses.data?.pagination?.total || 0,
        tests: adminOverview.data?.overview?.total_assessments_taken || 0,
        recommendations: adminOverview.data?.overview?.total_recommendations_generated || recs.data?.pagination?.total || 0,
      });

      setFeedbackStats({
        total_feedback: feedback.data?.total_feedback || 0,
        average_rating: feedback.data?.average_rating || 0,
        positive_feedback: feedback.data?.positive_feedback || 0,
        neutral_feedback: feedback.data?.neutral_feedback || 0,
        negative_feedback: feedback.data?.negative_feedback || 0,
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate percentages for bar chart
  const totalFeedback = feedbackStats.positive_feedback + feedbackStats.neutral_feedback + feedbackStats.negative_feedback;
  const positivePercent = totalFeedback > 0 ? (feedbackStats.positive_feedback / totalFeedback) * 100 : 0;
  const neutralPercent = totalFeedback > 0 ? (feedbackStats.neutral_feedback / totalFeedback) * 100 : 0;
  const negativePercent = totalFeedback > 0 ? (feedbackStats.negative_feedback / totalFeedback) * 100 : 0;

  // Calculate total for distribution chart
  const total = analytics.users + analytics.courses + analytics.tests + analytics.recommendations;
  const usersPercent = total > 0 ? (analytics.users / total) * 100 : 25;
  const coursesPercent = total > 0 ? (analytics.courses / total) * 100 : 25;
  const testsPercent = total > 0 ? (analytics.tests / total) * 100 : 25;
  const recsPercent = total > 0 ? (analytics.recommendations / total) * 100 : 25;

  // Export to PDF
  const exportToPDF = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/analytics/export/pdf`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics_report_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('Failed to export PDF report');
    }
  };

  // Send Daily Digest Email
  const [sendingDigest, setSendingDigest] = useState(false);
  const sendDailyDigest = async () => {
    try {
      setSendingDigest(true);
      const response = await axios.post(`${API_BASE_URL}/analytics/send-daily-digest`);
      if (response.data.success) {
        alert('✅ Daily digest email sent successfully!\n\nCheck your inbox for the summary.');
      } else {
        alert('⚠️ ' + (response.data.message || 'Email service is disabled'));
      }
    } catch (err) {
      console.error('Failed to send daily digest:', err);
      alert('❌ Failed to send daily digest email. Check email configuration.');
    } finally {
      setSendingDigest(false);
    }
  };

  return (
    <div className="page analytics-page">
      <div className="page-header">
        <div>
          <h1><i className="fas fa-chart-bar"></i> Analytics Dashboard</h1>
          <p>System performance and statistics overview</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={sendDailyDigest} 
            disabled={sendingDigest}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <i className={sendingDigest ? "fas fa-spinner fa-spin" : "fas fa-envelope"}></i> 
            {sendingDigest ? 'Sending...' : 'Send Daily Digest'}
          </button>
          <button className="btn btn-primary" onClick={exportToPDF} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fas fa-file-pdf"></i> Export PDF Report
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner"></div><p>Loading analytics...</p></div>
      ) : (
        <>
          {/* Main Stats Cards */}
          <div className="analytics-stats-grid">
            <div className="analytics-stat-card users">
              <div className="stat-icon-wrapper">
                <i className="fas fa-users"></i>
              </div>
              <div className="stat-content">
                <span className="stat-label">Total Users</span>
                <span className="stat-number">{analytics.users}</span>
                <span className="stat-sublabel">Registered Students</span>
              </div>
            </div>

            <div className="analytics-stat-card courses">
              <div className="stat-icon-wrapper">
                <i className="fas fa-book"></i>
              </div>
              <div className="stat-content">
                <span className="stat-label">Total Courses</span>
                <span className="stat-number">{analytics.courses}</span>
                <span className="stat-sublabel">Available Programs</span>
              </div>
            </div>

            <div className="analytics-stat-card tests">
              <div className="stat-icon-wrapper">
                <i className="fas fa-clipboard-check"></i>
              </div>
              <div className="stat-content">
                <span className="stat-label">Total Tests</span>
                <span className="stat-number">{analytics.tests}</span>
                <span className="stat-sublabel">Assessment Modules</span>
              </div>
            </div>

            <div className="analytics-stat-card recommendations">
              <div className="stat-icon-wrapper">
                <i className="fas fa-lightbulb"></i>
              </div>
              <div className="stat-content">
                <span className="stat-label">Recommendations</span>
                <span className="stat-number">{analytics.recommendations}</span>
                <span className="stat-sublabel">Generated</span>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="analytics-charts-grid">
            {/* Data Distribution Chart */}
            <div className="analytics-chart-card">
              <h3><i className="fas fa-chart-pie"></i> Data Distribution</h3>
              <div className="bar-chart-container">
                <div className="bar-chart-item">
                  <div className="bar-label">
                    <span>Users</span>
                    <span>{analytics.users}</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill users" style={{width: `${usersPercent}%`}}></div>
                  </div>
                </div>
                <div className="bar-chart-item">
                  <div className="bar-label">
                    <span>Courses</span>
                    <span>{analytics.courses}</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill courses" style={{width: `${coursesPercent}%`}}></div>
                  </div>
                </div>
                <div className="bar-chart-item">
                  <div className="bar-label">
                    <span>Tests</span>
                    <span>{analytics.tests}</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill tests" style={{width: `${testsPercent}%`}}></div>
                  </div>
                </div>
                <div className="bar-chart-item">
                  <div className="bar-label">
                    <span>Recommendations</span>
                    <span>{analytics.recommendations}</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill recommendations" style={{width: `${recsPercent}%`}}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feedback Overview */}
            <div className="analytics-chart-card">
              <h3><i className="fas fa-star"></i> Feedback Overview</h3>
              <div className="feedback-overview">
                <div className="feedback-rating-display">
                  <div className="rating-circle">
                    <span className="rating-number">{feedbackStats.average_rating.toFixed(1)}</span>
                    <span className="rating-max">/5</span>
                  </div>
                  <div className="rating-stars">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <i 
                        key={star} 
                        className={`fas fa-star ${star <= Math.round(feedbackStats.average_rating) ? 'filled' : ''}`}
                      ></i>
                    ))}
                  </div>
                  <span className="total-feedback">{feedbackStats.total_feedback} total reviews</span>
                </div>
              </div>
            </div>

            {/* Feedback Sentiment */}
            <div className="analytics-chart-card">
              <h3><i className="fas fa-smile"></i> Feedback Sentiment</h3>
              <div className="sentiment-chart">
                <div className="sentiment-item positive">
                  <div className="sentiment-icon">
                    <i className="fas fa-smile"></i>
                  </div>
                  <div className="sentiment-details">
                    <span className="sentiment-label">Positive</span>
                    <span className="sentiment-count">{feedbackStats.positive_feedback}</span>
                  </div>
                  <div className="sentiment-bar">
                    <div className="sentiment-fill" style={{width: `${positivePercent}%`}}></div>
                  </div>
                  <span className="sentiment-percent">{positivePercent.toFixed(0)}%</span>
                </div>
                <div className="sentiment-item neutral">
                  <div className="sentiment-icon">
                    <i className="fas fa-meh"></i>
                  </div>
                  <div className="sentiment-details">
                    <span className="sentiment-label">Neutral</span>
                    <span className="sentiment-count">{feedbackStats.neutral_feedback}</span>
                  </div>
                  <div className="sentiment-bar">
                    <div className="sentiment-fill" style={{width: `${neutralPercent}%`}}></div>
                  </div>
                  <span className="sentiment-percent">{neutralPercent.toFixed(0)}%</span>
                </div>
                <div className="sentiment-item negative">
                  <div className="sentiment-icon">
                    <i className="fas fa-frown"></i>
                  </div>
                  <div className="sentiment-details">
                    <span className="sentiment-label">Negative</span>
                    <span className="sentiment-count">{feedbackStats.negative_feedback}</span>
                  </div>
                  <div className="sentiment-bar">
                    <div className="sentiment-fill" style={{width: `${negativePercent}%`}}></div>
                  </div>
                  <span className="sentiment-percent">{negativePercent.toFixed(0)}%</span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="analytics-chart-card">
              <h3><i className="fas fa-tachometer-alt"></i> Quick Stats</h3>
              <div className="quick-stats-grid">
                <div className="quick-stat">
                  <i className="fas fa-user-graduate"></i>
                  <div className="quick-stat-info">
                    <span className="quick-stat-value">
                      {analytics.users > 0 ? (analytics.recommendations / analytics.users).toFixed(1) : 0}
                    </span>
                    <span className="quick-stat-label">Avg Recommendations per User</span>
                  </div>
                </div>
                <div className="quick-stat">
                  <i className="fas fa-percentage"></i>
                  <div className="quick-stat-info">
                    <span className="quick-stat-value">
                      {totalFeedback > 0 ? ((feedbackStats.positive_feedback / totalFeedback) * 100).toFixed(0) : 0}%
                    </span>
                    <span className="quick-stat-label">Satisfaction Rate</span>
                  </div>
                </div>
                <div className="quick-stat">
                  <i className="fas fa-comments"></i>
                  <div className="quick-stat-info">
                    <span className="quick-stat-value">{feedbackStats.total_feedback}</span>
                    <span className="quick-stat-label">Total Feedback Received</span>
                  </div>
                </div>
                <div className="quick-stat">
                  <i className="fas fa-database"></i>
                  <div className="quick-stat-info">
                    <span className="quick-stat-value">{total}</span>
                    <span className="quick-stat-label">Total Records</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default AnalyticsPage;
