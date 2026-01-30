import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './RecommendationsPage.css';

const API_BASE_URL = 'http://localhost:5000/api';

function RecommendationsPage() {
  const [activeTab, setActiveTab] = useState('rules'); // 'rules' or 'recommendations'
  
  // Rules state
  const [rules, setRules] = useState([]);
  const [courses, setCourses] = useState([]);
  const [traits, setTraits] = useState([]);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [ruleForm, setRuleForm] = useState({
    rule_name: '',
    description: '',
    condition_type: 'gwa',
    gwa_min: '',
    gwa_max: '',
    strand: '',
    trait_tag: '',
    trait_min_score: '',
    assessment_min_score: '',
    assessment_max_score: '',
    recommended_course_id: '',
    priority: 0,
    is_active: true
  });
  
  // Recommendations state
  const [recommendations, setRecommendations] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [statusStats, setStatusStats] = useState({ pending: 0, approved: 0, rejected: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Generate recommendations state
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateOptions, setGenerateOptions] = useState({
    overwrite_existing: false
  });

  // History state
  const [history, setHistory] = useState([]);
  const [historyFilters, setHistoryFilters] = useState({
    startDate: '',
    endDate: '',
    status: 'all'
  });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [timeline, setTimeline] = useState([]);

  // Edit recommendation state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRecommendation, setEditingRecommendation] = useState(null);
  const [editForm, setEditForm] = useState({
    course_id: '',
    reasoning: '',
    status: '',
    admin_notes: ''
  });

  // Export state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportSummary, setExportSummary] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchRules();
    fetchRecommendations();
    fetchStatusStats();
    fetchCourses();
    fetchTraits();
  }, []);

  useEffect(() => {
    fetchRecommendations();
  }, [statusFilter]);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/recommendations/rules/all`);
      setRules(response.data.rules || []);
    } catch (err) {
      console.error('Failed to load rules:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/recommendations/filter/status/${statusFilter}`);
      setRecommendations(response.data.recommendations || []);
    } catch (err) {
      console.error('Failed to load recommendations:', err);
      // Fallback to regular endpoint if filter fails
      try {
        const response = await axios.get(`${API_BASE_URL}/recommendations`);
        setRecommendations(response.data.recommendations || []);
      } catch (e) {
        console.error('Fallback also failed:', e);
      }
    }
  };

  const fetchStatusStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/recommendations/stats/status`);
      setStatusStats(response.data.stats || { pending: 0, approved: 0, rejected: 0, completed: 0 });
    } catch (err) {
      console.error('Failed to load status stats:', err);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/courses?limit=100`);
      setCourses(response.data.courses || []);
    } catch (err) {
      console.error('Failed to load courses:', err);
    }
  };

  const fetchTraits = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/recommendations/rules/options/traits`);
      setTraits(response.data.traits || []);
    } catch (err) {
      console.error('Failed to load traits:', err);
    }
  };

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const params = new URLSearchParams();
      if (historyFilters.startDate) params.append('start_date', historyFilters.startDate);
      if (historyFilters.endDate) params.append('end_date', historyFilters.endDate);
      if (historyFilters.status && historyFilters.status !== 'all') params.append('status', historyFilters.status);
      params.append('limit', '50');
      
      const response = await axios.get(`${API_BASE_URL}/recommendations/history?${params.toString()}`);
      setHistory(response.data.recommendations || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchTimeline = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/recommendations/history/timeline?days=30`);
      setTimeline(response.data.timeline || []);
    } catch (err) {
      console.error('Failed to load timeline:', err);
    }
  };

  // Edit Recommendation functions
  const handleEditRecommendation = async (rec) => {
    setEditingRecommendation(rec);
    setEditForm({
      course_id: rec.course_id || '',
      reasoning: rec.reasoning || '',
      status: rec.status || 'pending',
      admin_notes: rec.admin_notes || ''
    });
    setShowEditModal(true);
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_BASE_URL}/recommendations/edit/${editingRecommendation.recommendation_id}`, {
        course_id: parseInt(editForm.course_id),
        reasoning: editForm.reasoning,
        status: editForm.status,
        admin_notes: editForm.admin_notes
      });
      setShowEditModal(false);
      setEditingRecommendation(null);
      fetchRecommendations();
      fetchStatusStats();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update recommendation');
    }
  };

  // Quick status change from table
  const handleQuickStatusChange = async (recId, newStatus) => {
    try {
      await axios.put(`${API_BASE_URL}/recommendations/edit/${recId}`, {
        status: newStatus
      });
      fetchRecommendations();
      fetchStatusStats();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update status');
      // Refresh to reset the dropdown if it failed
      fetchRecommendations();
    }
  };

  const handleDeleteRecommendation = async (recId) => {
    if (!window.confirm('Are you sure you want to delete this recommendation? This action cannot be undone.')) return;
    try {
      await axios.delete(`${API_BASE_URL}/recommendations/delete/${recId}`);
      fetchRecommendations();
      fetchStatusStats();
    } catch (err) {
      setError('Failed to delete recommendation');
    }
  };

  // Export functions
  const handleOpenExport = async () => {
    setShowExportModal(true);
    setExporting(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/recommendations/export/summary`);
      setExportSummary(response.data);
    } catch (err) {
      console.error('Failed to load export summary:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = async (status = null) => {
    try {
      let url = `${API_BASE_URL}/recommendations/export/csv`;
      if (status && status !== 'all') {
        url += `?status=${status}`;
      }
      
      // Create a link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'recommendations.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError('Failed to export CSV');
    }
  };

  const resetRuleForm = () => {
    setRuleForm({
      rule_name: '',
      description: '',
      condition_type: 'gwa',
      gwa_min: '',
      gwa_max: '',
      strand: '',
      trait_tag: '',
      trait_min_score: '',
      assessment_min_score: '',
      assessment_max_score: '',
      recommended_course_id: '',
      priority: 0,
      is_active: true
    });
    setEditingRule(null);
  };

  const handleCreateRule = () => {
    resetRuleForm();
    setShowRuleModal(true);
  };

  const handleEditRule = (rule) => {
    setEditingRule(rule);
    setRuleForm({
      rule_name: rule.rule_name || '',
      description: rule.description || '',
      condition_type: rule.condition_type || 'gwa',
      gwa_min: rule.gwa_min || '',
      gwa_max: rule.gwa_max || '',
      strand: rule.strand || '',
      trait_tag: rule.trait_tag || '',
      trait_min_score: rule.trait_min_score || '',
      assessment_min_score: rule.assessment_min_score || '',
      assessment_max_score: rule.assessment_max_score || '',
      recommended_course_id: rule.recommended_course_id || '',
      priority: rule.priority || 0,
      is_active: rule.is_active !== false
    });
    setShowRuleModal(true);
  };

  const handleSubmitRule = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...ruleForm,
        gwa_min: ruleForm.gwa_min ? parseFloat(ruleForm.gwa_min) : null,
        gwa_max: ruleForm.gwa_max ? parseFloat(ruleForm.gwa_max) : null,
        trait_min_score: ruleForm.trait_min_score ? parseInt(ruleForm.trait_min_score) : null,
        assessment_min_score: ruleForm.assessment_min_score ? parseInt(ruleForm.assessment_min_score) : null,
        assessment_max_score: ruleForm.assessment_max_score ? parseInt(ruleForm.assessment_max_score) : null,
        recommended_course_id: parseInt(ruleForm.recommended_course_id),
        priority: parseInt(ruleForm.priority) || 0,
        strand: ruleForm.strand || null,
        trait_tag: ruleForm.trait_tag || null
      };

      if (editingRule) {
        await axios.put(`${API_BASE_URL}/recommendations/rules/${editingRule.rule_id}`, payload);
      } else {
        await axios.post(`${API_BASE_URL}/recommendations/rules`, payload);
      }
      
      setShowRuleModal(false);
      resetRuleForm();
      fetchRules();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save rule');
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/recommendations/rules/${ruleId}`);
      fetchRules();
    } catch (err) {
      setError('Failed to delete rule');
    }
  };

  const handleToggleRule = async (ruleId) => {
    try {
      await axios.patch(`${API_BASE_URL}/recommendations/rules/${ruleId}/toggle`);
      fetchRules();
    } catch (err) {
      setError('Failed to toggle rule');
    }
  };

  const getConditionDescription = (rule) => {
    const parts = [];
    
    if (rule.condition_type === 'gwa' || rule.condition_type === 'combined') {
      if (rule.gwa_min && rule.gwa_max) {
        parts.push(`GWA between ${rule.gwa_min} - ${rule.gwa_max}`);
      } else if (rule.gwa_min) {
        parts.push(`GWA ≥ ${rule.gwa_min}`);
      } else if (rule.gwa_max) {
        parts.push(`GWA ≤ ${rule.gwa_max}`);
      }
    }
    
    if (rule.condition_type === 'strand' || rule.condition_type === 'combined') {
      if (rule.strand) {
        parts.push(`Strand: ${rule.strand}`);
      }
    }
    
    if (rule.condition_type === 'trait' || rule.condition_type === 'combined') {
      if (rule.trait_tag) {
        parts.push(`Trait: ${rule.trait_tag}${rule.trait_min_score ? ` (min ${rule.trait_min_score}%)` : ''}`);
      }
    }
    
    if (rule.condition_type === 'assessment_score' || rule.condition_type === 'combined') {
      if (rule.assessment_min_score || rule.assessment_max_score) {
        if (rule.assessment_min_score && rule.assessment_max_score) {
          parts.push(`Assessment: ${rule.assessment_min_score}% - ${rule.assessment_max_score}%`);
        } else if (rule.assessment_min_score) {
          parts.push(`Assessment ≥ ${rule.assessment_min_score}%`);
        } else {
          parts.push(`Assessment ≤ ${rule.assessment_max_score}%`);
        }
      }
    }
    
    return parts.length > 0 ? parts.join(' AND ') : 'No conditions set';
  };

  const updateStatus = async (recId, newStatus) => {
    try {
      await axios.put(`${API_BASE_URL}/recommendations/${recId}/status`, { status: newStatus });
      fetchRecommendations();
      fetchStatusStats();
    } catch (err) {
      setError('Failed to update status');
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'approved': return 'fa-check-circle';
      case 'rejected': return 'fa-times-circle';
      case 'completed': return 'fa-flag-checkered';
      default: return 'fa-clock';
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'approved': return '#22c55e';
      case 'rejected': return '#ef4444';
      case 'completed': return '#6366f1';
      default: return '#f59e0b';
    }
  };

  // Generate Recommendations
  const handleGenerateRecommendations = async () => {
    setGenerating(true);
    setGenerateResult(null);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/recommendations/generate`, {
        overwrite_existing: generateOptions.overwrite_existing
      });
      
      setGenerateResult(response.data);
      fetchRecommendations();
      fetchStatusStats();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate recommendations');
      setGenerateResult({
        error: true,
        message: err.response?.data?.detail || 'Failed to generate recommendations'
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1><i className="fas fa-lightbulb"></i> Recommendations</h1>
        <p>Manage recommendation rules and track course recommendations</p>
      </div>

      {error && (
        <div className="alert alert-error">
          <i className="fas fa-exclamation-circle"></i> {error}
          <button onClick={() => setError('')} className="alert-close">×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-container">
        <button 
          className={`tab-btn ${activeTab === 'rules' ? 'active' : ''}`}
          onClick={() => setActiveTab('rules')}
        >
          <i className="fas fa-cogs"></i> Recommendation Rules
        </button>
        <button 
          className={`tab-btn ${activeTab === 'recommendations' ? 'active' : ''}`}
          onClick={() => setActiveTab('recommendations')}
        >
          <i className="fas fa-list"></i> All Recommendations
        </button>
        <button 
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => { setActiveTab('history'); fetchHistory(); fetchTimeline(); }}
        >
          <i className="fas fa-history"></i> View History
        </button>
      </div>

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div className="tab-content">
          <div className="section-header">
            <h2>Recommendation Rules</h2>
            <p>Define criteria for automatic course recommendations</p>
            <div className="header-actions">
              <button className="btn btn-primary" onClick={handleCreateRule}>
                <i className="fas fa-plus"></i> Create New Rule
              </button>
              <button 
                className="btn btn-success" 
                onClick={() => setShowGenerateModal(true)}
                disabled={rules.length === 0}
              >
                <i className="fas fa-magic"></i> Generate Recommendations
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading-center"><div className="spinner"></div><p>Loading rules...</p></div>
          ) : rules.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-cogs"></i>
              <h3>No Rules Created Yet</h3>
              <p>Create your first recommendation rule to start automating course suggestions.</p>
              <button className="btn btn-primary" onClick={handleCreateRule}>
                <i className="fas fa-plus"></i> Create First Rule
              </button>
            </div>
          ) : (
            <div className="rules-grid">
              {rules.map((rule) => (
                <div key={rule.rule_id} className={`rule-card ${!rule.is_active ? 'inactive' : ''}`}>
                  <div className="rule-header">
                    <h3>{rule.rule_name}</h3>
                    <div className="rule-badges">
                      <span className={`badge priority-${rule.priority > 5 ? 'high' : rule.priority > 0 ? 'medium' : 'low'}`}>
                        Priority: {rule.priority}
                      </span>
                      <span className={`badge ${rule.is_active ? 'active' : 'inactive'}`}>
                        {rule.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  
                  {rule.description && (
                    <p className="rule-description">{rule.description}</p>
                  )}
                  
                  <div className="rule-details">
                    <div className="rule-condition">
                      <strong><i className="fas fa-filter"></i> Conditions:</strong>
                      <span>{getConditionDescription(rule)}</span>
                    </div>
                    <div className="rule-action">
                      <strong><i className="fas fa-graduation-cap"></i> Recommend:</strong>
                      <span className="course-badge">{rule.recommended_course_name || `Course #${rule.recommended_course_id}`}</span>
                    </div>
                  </div>
                  
                  <div className="rule-actions">
                    <button className="btn btn-sm btn-secondary" onClick={() => handleEditRule(rule)}>
                      <i className="fas fa-edit"></i> Edit
                    </button>
                    <button 
                      className={`btn btn-sm ${rule.is_active ? 'btn-warning' : 'btn-success'}`}
                      onClick={() => handleToggleRule(rule.rule_id)}
                    >
                      <i className={`fas fa-${rule.is_active ? 'pause' : 'play'}`}></i>
                      {rule.is_active ? ' Disable' : ' Enable'}
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDeleteRule(rule.rule_id)}>
                      <i className="fas fa-trash"></i> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recommendations Tab */}
      {activeTab === 'recommendations' && (
        <div className="tab-content">
          <div className="section-header">
            <h2>All Recommendations</h2>
            <p>View and manage student course recommendations</p>
            <button className="btn btn-secondary" onClick={handleOpenExport}>
              <i className="fas fa-file-export"></i> Export Reports
            </button>
          </div>

          {/* Status Stats Cards */}
          <div className="status-stats">
            <div 
              className={`stat-card ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              <i className="fas fa-list"></i>
              <div className="stat-info">
                <span className="stat-value">{statusStats.pending + statusStats.approved + statusStats.rejected + statusStats.completed}</span>
                <span className="stat-label">All</span>
              </div>
            </div>
            <div 
              className={`stat-card pending ${statusFilter === 'pending' ? 'active' : ''}`}
              onClick={() => setStatusFilter('pending')}
            >
              <i className="fas fa-clock"></i>
              <div className="stat-info">
                <span className="stat-value">{statusStats.pending || 0}</span>
                <span className="stat-label">Pending</span>
              </div>
            </div>
            <div 
              className={`stat-card approved ${statusFilter === 'approved' ? 'active' : ''}`}
              onClick={() => setStatusFilter('approved')}
            >
              <i className="fas fa-check-circle"></i>
              <div className="stat-info">
                <span className="stat-value">{statusStats.approved || 0}</span>
                <span className="stat-label">Approved</span>
              </div>
            </div>
            <div 
              className={`stat-card rejected ${statusFilter === 'rejected' ? 'active' : ''}`}
              onClick={() => setStatusFilter('rejected')}
            >
              <i className="fas fa-times-circle"></i>
              <div className="stat-info">
                <span className="stat-value">{statusStats.rejected || 0}</span>
                <span className="stat-label">Rejected</span>
              </div>
            </div>
            <div 
              className={`stat-card completed ${statusFilter === 'completed' ? 'active' : ''}`}
              onClick={() => setStatusFilter('completed')}
            >
              <i className="fas fa-flag-checkered"></i>
              <div className="stat-info">
                <span className="stat-value">{statusStats.completed || 0}</span>
                <span className="stat-label">Completed</span>
              </div>
            </div>
          </div>

          {recommendations.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-inbox"></i>
              <p>No {statusFilter !== 'all' ? statusFilter : ''} recommendations found</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Email</th>
                    <th>Recommended Course</th>
                    <th>Reasoning</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recommendations.map((rec) => (
                    <tr key={rec.recommendation_id}>
                      <td><strong>{rec.user_name}</strong></td>
                      <td>{rec.user_email}</td>
                      <td><span className="course-badge">{rec.course_name}</span></td>
                      <td className="reasoning-cell">{rec.reasoning || 'N/A'}</td>
                      <td>
                        <select 
                          value={rec.status || 'pending'} 
                          onChange={(e) => handleQuickStatusChange(rec.recommendation_id, e.target.value)}
                          className={`status-select ${rec.status || 'pending'}`}
                          title="Click to change status"
                        >
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                          <option value="completed">Completed</option>
                        </select>
                      </td>
                      <td>{rec.recommended_at ? new Date(rec.recommended_at).toLocaleDateString() : 'N/A'}</td>
                      <td className="actions-cell">
                        <button 
                          className="btn btn-sm btn-secondary" 
                          onClick={() => handleEditRecommendation(rec)}
                          title="Edit"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button 
                          className="btn btn-sm btn-danger" 
                          onClick={() => handleDeleteRecommendation(rec.recommendation_id)}
                          title="Delete"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="tab-content">
          <div className="section-header">
            <h2>Recommendation History</h2>
            <p>View and filter historical recommendations</p>
          </div>

          {/* History Filters */}
          <div className="history-filters">
            <div className="filter-group">
              <label><i className="fas fa-calendar-alt"></i> Start Date</label>
              <input
                type="date"
                value={historyFilters.startDate}
                onChange={(e) => setHistoryFilters({...historyFilters, startDate: e.target.value})}
              />
            </div>
            <div className="filter-group">
              <label><i className="fas fa-calendar-alt"></i> End Date</label>
              <input
                type="date"
                value={historyFilters.endDate}
                onChange={(e) => setHistoryFilters({...historyFilters, endDate: e.target.value})}
              />
            </div>
            <div className="filter-group">
              <label><i className="fas fa-filter"></i> Status</label>
              <select
                value={historyFilters.status}
                onChange={(e) => setHistoryFilters({...historyFilters, status: e.target.value})}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <button className="btn btn-primary" onClick={fetchHistory}>
              <i className="fas fa-search"></i> Apply Filters
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => { 
                setHistoryFilters({ startDate: '', endDate: '', status: 'all' }); 
                fetchHistory(); 
              }}
            >
              <i className="fas fa-times"></i> Clear
            </button>
          </div>

          {/* Timeline Summary */}
          {timeline.length > 0 && (
            <div className="timeline-summary">
              <h3><i className="fas fa-chart-line"></i> Last 30 Days Activity</h3>
              <div className="timeline-chart">
                {timeline.slice(0, 14).map((day, idx) => (
                  <div key={idx} className="timeline-bar" title={`${day.date}: ${day.count} recommendations`}>
                    <div 
                      className="bar-fill" 
                      style={{ height: `${Math.min((day.count / Math.max(...timeline.map(t => t.count))) * 100, 100)}%` }}
                    ></div>
                    <span className="bar-label">{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    <span className="bar-count">{day.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* History Table */}
          {historyLoading ? (
            <div className="loading-center"><div className="spinner"></div><p>Loading history...</p></div>
          ) : history.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-history"></i>
              <h3>No History Found</h3>
              <p>Try adjusting your filters or generating some recommendations first.</p>
            </div>
          ) : (
            <div className="history-results">
              <p className="results-count"><strong>{history.length}</strong> records found</p>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Student</th>
                      <th>Course</th>
                      <th>Status</th>
                      <th>Reasoning</th>
                      <th>Status Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((rec) => (
                      <tr key={rec.recommendation_id}>
                        <td>
                          <span className="date-cell">
                            <i className="fas fa-calendar"></i>
                            {rec.recommended_at ? new Date(rec.recommended_at).toLocaleDateString() : 'N/A'}
                          </span>
                        </td>
                        <td>
                          <div className="user-info-cell">
                            <strong>{rec.user_name}</strong>
                            <small>{rec.user_email}</small>
                          </div>
                        </td>
                        <td><span className="course-badge">{rec.course_name}</span></td>
                        <td>
                          <span className={`status-badge ${rec.status || 'pending'}`}>
                            <i className={`fas ${getStatusIcon(rec.status || 'pending')}`}></i>
                            {rec.status || 'pending'}
                          </span>
                        </td>
                        <td className="reasoning-cell">{rec.reasoning || '-'}</td>
                        <td>
                          {rec.status_updated_at 
                            ? new Date(rec.status_updated_at).toLocaleString() 
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Rule Modal */}
      {showRuleModal && (
        <div className="modal-overlay" onClick={() => setShowRuleModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><i className="fas fa-cogs"></i> {editingRule ? 'Edit Rule' : 'Create New Rule'}</h2>
              <button className="close-btn" onClick={() => setShowRuleModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleSubmitRule}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Rule Name *</label>
                    <input
                      type="text"
                      value={ruleForm.rule_name}
                      onChange={(e) => setRuleForm({...ruleForm, rule_name: e.target.value})}
                      placeholder="e.g., High GWA STEM Recommendation"
                      required
                    />
                  </div>
                  
                  <div className="form-group full-width">
                    <label>Description</label>
                    <textarea
                      value={ruleForm.description}
                      onChange={(e) => setRuleForm({...ruleForm, description: e.target.value})}
                      placeholder="Describe what this rule does..."
                      rows="2"
                    />
                  </div>

                  <div className="form-group">
                    <label>Condition Type *</label>
                    <select
                      value={ruleForm.condition_type}
                      onChange={(e) => setRuleForm({...ruleForm, condition_type: e.target.value})}
                      required
                    >
                      <option value="gwa">GWA Based</option>
                      <option value="strand">Strand Based</option>
                      <option value="trait">Trait Based</option>
                      <option value="assessment_score">Assessment Score</option>
                      <option value="combined">Combined Conditions</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Priority (Higher = Checked First)</label>
                    <input
                      type="number"
                      value={ruleForm.priority}
                      onChange={(e) => setRuleForm({...ruleForm, priority: e.target.value})}
                      min="0"
                      max="100"
                    />
                  </div>

                  {/* GWA Conditions */}
                  {(ruleForm.condition_type === 'gwa' || ruleForm.condition_type === 'combined') && (
                    <>
                      <div className="form-group">
                        <label>Minimum GWA</label>
                        <input
                          type="number"
                          value={ruleForm.gwa_min}
                          onChange={(e) => setRuleForm({...ruleForm, gwa_min: e.target.value})}
                          step="0.01"
                          min="75"
                          max="100"
                          placeholder="e.g., 85"
                        />
                      </div>
                      <div className="form-group">
                        <label>Maximum GWA</label>
                        <input
                          type="number"
                          value={ruleForm.gwa_max}
                          onChange={(e) => setRuleForm({...ruleForm, gwa_max: e.target.value})}
                          step="0.01"
                          min="75"
                          max="100"
                          placeholder="e.g., 100"
                        />
                      </div>
                    </>
                  )}

                  {/* Strand Condition */}
                  {(ruleForm.condition_type === 'strand' || ruleForm.condition_type === 'combined') && (
                    <div className="form-group">
                      <label>Strand</label>
                      <select
                        value={ruleForm.strand}
                        onChange={(e) => setRuleForm({...ruleForm, strand: e.target.value})}
                      >
                        <option value="">Any Strand</option>
                        <option value="STEM">STEM</option>
                        <option value="HUMSS">HUMSS</option>
                        <option value="ABM">ABM</option>
                        <option value="TVL">TVL</option>
                      </select>
                    </div>
                  )}

                  {/* Trait Conditions */}
                  {(ruleForm.condition_type === 'trait' || ruleForm.condition_type === 'combined') && (
                    <>
                      <div className="form-group">
                        <label>Trait</label>
                        <select
                          value={ruleForm.trait_tag}
                          onChange={(e) => setRuleForm({...ruleForm, trait_tag: e.target.value})}
                        >
                          <option value="">Select Trait</option>
                          {traits.map(trait => (
                            <option key={trait} value={trait}>{trait}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Minimum Trait Score (%)</label>
                        <input
                          type="number"
                          value={ruleForm.trait_min_score}
                          onChange={(e) => setRuleForm({...ruleForm, trait_min_score: e.target.value})}
                          min="0"
                          max="100"
                          placeholder="e.g., 70"
                        />
                      </div>
                    </>
                  )}

                  {/* Assessment Score Conditions */}
                  {(ruleForm.condition_type === 'assessment_score' || ruleForm.condition_type === 'combined') && (
                    <>
                      <div className="form-group">
                        <label>Min Assessment Score (%)</label>
                        <input
                          type="number"
                          value={ruleForm.assessment_min_score}
                          onChange={(e) => setRuleForm({...ruleForm, assessment_min_score: e.target.value})}
                          min="0"
                          max="100"
                          placeholder="e.g., 60"
                        />
                      </div>
                      <div className="form-group">
                        <label>Max Assessment Score (%)</label>
                        <input
                          type="number"
                          value={ruleForm.assessment_max_score}
                          onChange={(e) => setRuleForm({...ruleForm, assessment_max_score: e.target.value})}
                          min="0"
                          max="100"
                          placeholder="e.g., 80"
                        />
                      </div>
                    </>
                  )}

                  <div className="form-group full-width">
                    <label>Recommended Course *</label>
                    <select
                      value={ruleForm.recommended_course_id}
                      onChange={(e) => setRuleForm({...ruleForm, recommended_course_id: e.target.value})}
                      required
                    >
                      <option value="">Select a course to recommend</option>
                      {courses.map(course => (
                        <option key={course.course_id} value={course.course_id}>
                          {course.course_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={ruleForm.is_active}
                        onChange={(e) => setRuleForm({...ruleForm, is_active: e.target.checked})}
                      />
                      Rule is Active
                    </label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRuleModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-save"></i> {editingRule ? 'Update Rule' : 'Create Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generate Recommendations Modal */}
      {showGenerateModal && (
        <div className="modal-overlay" onClick={() => !generating && setShowGenerateModal(false)}>
          <div className="modal generate-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><i className="fas fa-magic"></i> Generate Recommendations</h2>
              <button 
                className="modal-close" 
                onClick={() => setShowGenerateModal(false)}
                disabled={generating}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              {!generateResult ? (
                <>
                  <div className="generate-info">
                    <i className="fas fa-info-circle"></i>
                    <p>
                      This will analyze all students and generate course recommendations based on your active rules.
                      The engine considers:
                    </p>
                    <ul>
                      <li><strong>GWA:</strong> Academic performance thresholds</li>
                      <li><strong>Strand:</strong> Senior high school track matching</li>
                      <li><strong>Traits:</strong> Personality and skill assessments</li>
                      <li><strong>Assessment Scores:</strong> Test performance ranges</li>
                    </ul>
                  </div>

                  <div className="generate-stats">
                    <div className="stat-item">
                      <i className="fas fa-cogs"></i>
                      <span className="stat-value">{rules.filter(r => r.is_active).length}</span>
                      <span className="stat-label">Active Rules</span>
                    </div>
                  </div>

                  <div className="generate-options">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={generateOptions.overwrite_existing}
                        onChange={(e) => setGenerateOptions({...generateOptions, overwrite_existing: e.target.checked})}
                        disabled={generating}
                      />
                      Overwrite existing recommendations
                    </label>
                    <small>If unchecked, existing recommendations will be preserved.</small>
                  </div>
                </>
              ) : (
                <div className={`generate-result ${generateResult.error ? 'error' : 'success'}`}>
                  {generateResult.error ? (
                    <>
                      <i className="fas fa-exclamation-circle"></i>
                      <h3>Generation Failed</h3>
                      <p>{generateResult.message}</p>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check-circle"></i>
                      <h3>Recommendations Generated!</h3>
                      <div className="result-stats">
                        <div className="result-stat">
                          <span className="number">{generateResult.generated}</span>
                          <span className="label">Created</span>
                        </div>
                        <div className="result-stat">
                          <span className="number">{generateResult.skipped || 0}</span>
                          <span className="label">Skipped</span>
                        </div>
                        <div className="result-stat">
                          <span className="number">{generateResult.students_processed || 0}</span>
                          <span className="label">Students</span>
                        </div>
                        <div className="result-stat">
                          <span className="number">{generateResult.rules_applied || 0}</span>
                          <span className="label">Rules Used</span>
                        </div>
                      </div>
                      {generateResult.details && generateResult.details.length > 0 && (
                        <div className="result-details">
                          <h4>Sample Results:</h4>
                          <ul>
                            {generateResult.details.slice(0, 5).map((detail, idx) => (
                              <li key={idx}>
                                <strong>{detail.name}</strong>
                                {detail.recommendations.map((rec, ridx) => (
                                  <span key={ridx} className="rec-badge">{rec.course}</span>
                                ))}
                              </li>
                            ))}
                          </ul>
                          {generateResult.details.length > 5 && (
                            <p className="more-results">...and {generateResult.details.length - 5} more students</p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              {!generateResult ? (
                <>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setShowGenerateModal(false)}
                    disabled={generating}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-success" 
                    onClick={handleGenerateRecommendations}
                    disabled={generating || rules.filter(r => r.is_active).length === 0}
                  >
                    {generating ? (
                      <><i className="fas fa-spinner fa-spin"></i> Generating...</>
                    ) : (
                      <><i className="fas fa-magic"></i> Generate Now</>
                    )}
                  </button>
                </>
              ) : (
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={() => {
                    setShowGenerateModal(false);
                    setGenerateResult(null);
                    setActiveTab('recommendations');
                  }}
                >
                  <i className="fas fa-list"></i> View Recommendations
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Recommendation Modal */}
      {showEditModal && editingRecommendation && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><i className="fas fa-edit"></i> Edit Recommendation</h2>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleSubmitEdit}>
              <div className="modal-body">
                <div className="edit-info">
                  <div className="info-row">
                    <span className="info-label">Student:</span>
                    <span className="info-value">{editingRecommendation.user_name}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Email:</span>
                    <span className="info-value">{editingRecommendation.user_email}</span>
                  </div>
                </div>

                <div className="form-group">
                  <label>Recommended Course *</label>
                  <select
                    value={editForm.course_id}
                    onChange={(e) => setEditForm({...editForm, course_id: e.target.value})}
                    required
                  >
                    <option value="">Select a course</option>
                    {courses.map(course => (
                      <option key={course.course_id} value={course.course_id}>
                        {course.course_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Reasoning</label>
                  <textarea
                    value={editForm.reasoning}
                    onChange={(e) => setEditForm({...editForm, reasoning: e.target.value})}
                    placeholder="Why is this course recommended?"
                    rows="3"
                  />
                </div>

                <div className="form-group">
                  <label>Admin Notes</label>
                  <textarea
                    value={editForm.admin_notes}
                    onChange={(e) => setEditForm({...editForm, admin_notes: e.target.value})}
                    placeholder="Internal notes (not visible to student)"
                    rows="2"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-save"></i> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal export-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><i className="fas fa-file-export"></i> Export Reports</h2>
              <button className="close-btn" onClick={() => setShowExportModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              {exporting ? (
                <div className="loading-center"><div className="spinner"></div><p>Loading summary...</p></div>
              ) : exportSummary ? (
                <>
                  <div className="export-summary">
                    <h3><i className="fas fa-chart-pie"></i> Summary Report</h3>
                    <div className="summary-grid">
                      <div className="summary-card total">
                        <span className="summary-value">{exportSummary.summary.total_recommendations}</span>
                        <span className="summary-label">Total Recommendations</span>
                      </div>
                      <div className="summary-card">
                        <span className="summary-value">{exportSummary.summary.unique_students}</span>
                        <span className="summary-label">Students</span>
                      </div>
                      <div className="summary-card">
                        <span className="summary-value">{exportSummary.summary.unique_courses}</span>
                        <span className="summary-label">Courses</span>
                      </div>
                    </div>
                    
                    <div className="status-breakdown">
                      <h4>Status Breakdown</h4>
                      <div className="breakdown-bars">
                        <div className="breakdown-item">
                          <span className="breakdown-label">Pending</span>
                          <div className="breakdown-bar">
                            <div 
                              className="bar-fill pending" 
                              style={{width: `${(exportSummary.summary.pending / exportSummary.summary.total_recommendations) * 100}%`}}
                            ></div>
                          </div>
                          <span className="breakdown-count">{exportSummary.summary.pending}</span>
                        </div>
                        <div className="breakdown-item">
                          <span className="breakdown-label">Approved</span>
                          <div className="breakdown-bar">
                            <div 
                              className="bar-fill approved" 
                              style={{width: `${(exportSummary.summary.approved / exportSummary.summary.total_recommendations) * 100}%`}}
                            ></div>
                          </div>
                          <span className="breakdown-count">{exportSummary.summary.approved}</span>
                        </div>
                        <div className="breakdown-item">
                          <span className="breakdown-label">Rejected</span>
                          <div className="breakdown-bar">
                            <div 
                              className="bar-fill rejected" 
                              style={{width: `${(exportSummary.summary.rejected / exportSummary.summary.total_recommendations) * 100}%`}}
                            ></div>
                          </div>
                          <span className="breakdown-count">{exportSummary.summary.rejected}</span>
                        </div>
                        <div className="breakdown-item">
                          <span className="breakdown-label">Completed</span>
                          <div className="breakdown-bar">
                            <div 
                              className="bar-fill completed" 
                              style={{width: `${(exportSummary.summary.completed / exportSummary.summary.total_recommendations) * 100}%`}}
                            ></div>
                          </div>
                          <span className="breakdown-count">{exportSummary.summary.completed}</span>
                        </div>
                      </div>
                    </div>

                    {exportSummary.top_courses && exportSummary.top_courses.length > 0 && (
                      <div className="top-courses">
                        <h4>Top Recommended Courses</h4>
                        <ul>
                          {exportSummary.top_courses.slice(0, 5).map((course, idx) => (
                            <li key={idx}>
                              <span className="course-name">{course.course_name}</span>
                              <span className="course-count">{course.recommendation_count} recommendations</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="export-actions">
                    <h3><i className="fas fa-download"></i> Download CSV</h3>
                    <div className="export-buttons">
                      <button className="btn btn-primary" onClick={() => handleExportCSV('all')}>
                        <i className="fas fa-file-csv"></i> All Recommendations
                      </button>
                      <button className="btn btn-secondary" onClick={() => handleExportCSV('pending')}>
                        <i className="fas fa-clock"></i> Pending Only
                      </button>
                      <button className="btn btn-secondary" onClick={() => handleExportCSV('approved')}>
                        <i className="fas fa-check"></i> Approved Only
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <p>Failed to load summary</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowExportModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecommendationsPage;
