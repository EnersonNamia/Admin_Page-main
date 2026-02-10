import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './RecommendationsPage.css';

const API_BASE_URL = 'http://localhost:5000/api';

function RecommendationsPage() {
  const [activeTab, setActiveTab] = useState('recommendations'); // Default to recommendations review
  
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
  
  // Pagination state for recommendations
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecommendations, setTotalRecommendations] = useState(0);
  const [itemsPerPage] = useState(25);
  
  // Bulk selection state
  const [selectedRecommendations, setSelectedRecommendations] = useState([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  
  // Expanded rows state (for showing other 4 recommendations)
  const [expandedRows, setExpandedRows] = useState([]);
  
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
    fetchRecommendations(1);
    fetchStatusStats();
    fetchCourses();
    fetchTraits();
  }, []);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filter changes
  }, [statusFilter]);

  useEffect(() => {
    fetchRecommendations(currentPage);
  }, [currentPage, statusFilter]);

  // Clear selections and expanded rows when filter or page changes
  useEffect(() => {
    setSelectedRecommendations([]);
    setExpandedRows([]);
  }, [statusFilter, currentPage]);

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

  const fetchRecommendations = async (page = currentPage) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/recommendations/filter/status/${statusFilter}?page=${page}&limit=${itemsPerPage}`);
      setRecommendations(response.data.recommendations || []);
      if (response.data.pagination) {
        setTotalPages(response.data.pagination.pages || 1);
        setTotalRecommendations(response.data.pagination.total || 0);
      }
    } catch (err) {
      console.error('Failed to load recommendations:', err);
      // Fallback to regular endpoint if filter fails
      try {
        const response = await axios.get(`${API_BASE_URL}/recommendations?page=${page}&limit=${itemsPerPage}`);
        const flatRecs = response.data.recommendations || [];
        
        // Transform flat recommendations to grouped format
        const groupedByAttempt = {};
        for (const rec of flatRecs) {
          const attemptId = rec.attempt_id || `no_attempt_${rec.recommendation_id}`;
          
          if (!groupedByAttempt[attemptId]) {
            groupedByAttempt[attemptId] = {
              attempt_id: rec.attempt_id,
              user_id: rec.user_id,
              user_name: rec.user_name,
              user_email: rec.user_email,
              top_recommendation: null,
              other_recommendations: []
            };
          }
          
          const recData = {
            recommendation_id: rec.recommendation_id,
            course_id: rec.course_id,
            course_name: rec.course_name,
            reasoning: rec.reasoning,
            status: rec.status || 'pending',
            recommendation_rank: rec.recommendation_rank || 1,
            recommended_at: rec.recommended_at
          };
          
          if (groupedByAttempt[attemptId].top_recommendation === null) {
            groupedByAttempt[attemptId].top_recommendation = recData;
          } else {
            groupedByAttempt[attemptId].other_recommendations.push(recData);
          }
        }
        
        const groupedList = Object.values(groupedByAttempt);
        setRecommendations(groupedList);
        
        if (response.data.pagination) {
          setTotalPages(response.data.pagination.pages || 1);
          setTotalRecommendations(response.data.pagination.total || 0);
        }
      } catch (e) {
        console.error('Fallback also failed:', e);
      }
    } finally {
      setLoading(false);
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
      course_id: '', // Empty means keep original
      reasoning: rec.reasoning || '',
      status: rec.status || 'pending',
      admin_notes: rec.admin_notes || ''
    });
    setShowEditModal(true);
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    try {
      // Build payload - only include course_id if it was changed
      const payload = {
        status: editForm.status,
        admin_notes: editForm.admin_notes
      };
      
      // Only include course_id if admin wants to override
      if (editForm.course_id) {
        payload.course_id = parseInt(editForm.course_id);
      }
      
      // Keep original reasoning unless course was changed
      if (editForm.reasoning !== editingRecommendation.reasoning) {
        payload.reasoning = editForm.reasoning;
      }
      
      await axios.put(`${API_BASE_URL}/recommendations/edit/${editingRecommendation.recommendation_id}`, payload);
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

  // Bulk selection functions
  const handleSelectRecommendation = (recId) => {
    setSelectedRecommendations(prev => {
      if (prev.includes(recId)) {
        return prev.filter(id => id !== recId);
      } else {
        return [...prev, recId];
      }
    });
  };

  const handleSelectAll = () => {
    // Get all top recommendation IDs that are pending
    const pendingTopRecs = recommendations
      .filter(r => r.top_recommendation && (!r.top_recommendation.status || r.top_recommendation.status === 'pending'))
      .map(r => r.top_recommendation.recommendation_id);
    
    if (selectedRecommendations.length === pendingTopRecs.length && pendingTopRecs.length > 0) {
      setSelectedRecommendations([]);
    } else {
      setSelectedRecommendations(pendingTopRecs);
    }
  };

  // Toggle expanded row to show other recommendations
  const toggleExpandRow = (attemptId) => {
    setExpandedRows(prev => {
      if (prev.includes(attemptId)) {
        return prev.filter(id => id !== attemptId);
      } else {
        return [...prev, attemptId];
      }
    });
  };

  const handleBulkAction = async (newStatus) => {
    if (selectedRecommendations.length === 0) {
      setError('Please select at least one recommendation');
      return;
    }

    const actionWord = newStatus === 'approved' ? 'approve' : newStatus === 'rejected' ? 'reject' : 'update';
    if (!window.confirm(`Are you sure you want to ${actionWord} ${selectedRecommendations.length} recommendation(s)?`)) {
      return;
    }

    setBulkActionLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/recommendations/bulk-update`, {
        recommendation_ids: selectedRecommendations,
        status: newStatus
      });
      setSelectedRecommendations([]);
      fetchRecommendations();
      fetchStatusStats();
    } catch (err) {
      setError(err.response?.data?.detail || `Failed to ${actionWord} recommendations`);
    } finally {
      setBulkActionLoading(false);
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
        <h1><i className="fas fa-lightbulb"></i> Course Recommendations</h1>
        <p>Review and manage assessment-generated course recommendations</p>
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
          className={`tab-btn ${activeTab === 'recommendations' ? 'active' : ''}`}
          onClick={() => setActiveTab('recommendations')}
        >
          <i className="fas fa-clipboard-check"></i> Review Recommendations
        </button>
        <button 
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => { setActiveTab('history'); fetchHistory(); fetchTimeline(); }}
        >
          <i className="fas fa-history"></i> History
        </button>
        <button 
          className={`tab-btn ${activeTab === 'rules' ? 'active' : ''}`}
          onClick={() => setActiveTab('rules')}
        >
          <i className="fas fa-cogs"></i> Matching Rules
        </button>
      </div>

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div className="tab-content">
          <div className="section-header">
            <h2><i className="fas fa-cogs"></i> Course Matching Rules</h2>
            <p>These rules define how assessment scores are matched to course recommendations. When students complete assessments, these rules determine which courses to suggest.</p>
            <div className="header-actions">
              <button className="btn btn-primary" onClick={handleCreateRule}>
                <i className="fas fa-plus"></i> Create New Rule
              </button>
            </div>
          </div>

          <div className="info-banner">
            <i className="fas fa-info-circle"></i>
            <span>Rules are automatically applied when students complete their assessments. The system generates recommendations based on trait scores, GWA, and strand matching.</span>
          </div>

          {loading ? (
            <div className="loading-center"><div className="spinner"></div><p>Loading rules...</p></div>
          ) : rules.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-cogs"></i>
              <h3>No Matching Rules Created Yet</h3>
              <p>Create rules to define how assessment results are matched to course recommendations.</p>
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
            <h2><i className="fas fa-clipboard-check"></i> Assessment-Based Recommendations</h2>
            <p>Review recommendations generated from student assessments. Approve, reject, or mark as completed.</p>
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
              <i className="fas fa-hourglass-half"></i>
              <div className="stat-info">
                <span className="stat-value">{statusStats.pending || 0}</span>
                <span className="stat-label">Pending Review</span>
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
            <>
              {/* Bulk Actions Bar */}
              {selectedRecommendations.length > 0 && (
                <div className="bulk-actions-bar">
                  <div className="bulk-info">
                    <i className="fas fa-check-square"></i>
                    <span><strong>{selectedRecommendations.length}</strong> recommendation(s) selected</span>
                  </div>
                  <div className="bulk-buttons">
                    <button 
                      className="btn btn-success btn-sm"
                      onClick={() => handleBulkAction('approved')}
                      disabled={bulkActionLoading}
                    >
                      <i className="fas fa-check"></i> Approve All
                    </button>
                    <button 
                      className="btn btn-warning btn-sm"
                      onClick={() => handleBulkAction('rejected')}
                      disabled={bulkActionLoading}
                    >
                      <i className="fas fa-times"></i> Reject All
                    </button>
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => handleBulkAction('completed')}
                      disabled={bulkActionLoading}
                    >
                      <i className="fas fa-flag-checkered"></i> Mark Completed
                    </button>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => setSelectedRecommendations([])}
                      disabled={bulkActionLoading}
                    >
                      <i className="fas fa-times-circle"></i> Clear Selection
                    </button>
                  </div>
                  {bulkActionLoading && (
                    <div className="bulk-loading">
                      <i className="fas fa-spinner fa-spin"></i> Processing...
                    </div>
                  )}
                </div>
              )}

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th className="checkbox-col">
                        <input 
                          type="checkbox"
                          checked={selectedRecommendations.length > 0 && 
                            selectedRecommendations.length === recommendations.filter(r => r.top_recommendation && (!r.top_recommendation.status || r.top_recommendation.status === 'pending')).length}
                          onChange={handleSelectAll}
                          title="Select all pending recommendations"
                        />
                      </th>
                      <th style={{width: '30px'}}></th>
                      <th>Student</th>
                      <th>Top Recommended Course</th>
                      <th>Assessment Info</th>
                      <th>Match Reason</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recommendations.map((assessment) => {
                      const topRec = assessment.top_recommendation;
                      const otherRecs = assessment.other_recommendations || [];
                      const isExpanded = expandedRows.includes(assessment.attempt_id);
                      
                      if (!topRec) return null;
                      
                      return (
                        <React.Fragment key={assessment.attempt_id || topRec.recommendation_id}>
                          {/* Main row - Top Recommendation */}
                          <tr className={`status-row-${topRec.status || 'pending'} ${selectedRecommendations.includes(topRec.recommendation_id) ? 'selected' : ''} main-recommendation-row`}>
                            <td className="checkbox-col">
                              <input 
                                type="checkbox"
                                checked={selectedRecommendations.includes(topRec.recommendation_id)}
                                onChange={() => handleSelectRecommendation(topRec.recommendation_id)}
                                disabled={topRec.status && topRec.status !== 'pending'}
                              />
                            </td>
                            <td className="expand-col">
                              {otherRecs.length > 0 && (
                                <button 
                                  className={`expand-btn ${isExpanded ? 'expanded' : ''}`}
                                  onClick={() => toggleExpandRow(assessment.attempt_id)}
                                  title={isExpanded ? 'Hide other recommendations' : `Show ${otherRecs.length} more recommendations`}
                                >
                                  <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'}`}></i>
                                </button>
                              )}
                            </td>
                            <td>
                              <div className="student-info">
                                <strong>{assessment.user_name}</strong>
                                <span className="student-email">{assessment.user_email}</span>
                              </div>
                            </td>
                            <td>
                              <div className="top-course-container">
                                <span className="course-badge top-course">
                                  <i className="fas fa-trophy"></i> {topRec.course_name}
                                </span>
                                {otherRecs.length > 0 && (
                                  <span className="other-courses-count" onClick={() => toggleExpandRow(assessment.attempt_id)}>
                                    +{otherRecs.length} more
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <div className="assessment-info">
                                {assessment.confidence_score ? (
                                  <>
                                    <div className="assessment-stat">
                                      <i className="fas fa-chart-line"></i>
                                      <span className="stat-label">Confidence:</span>
                                      <span className={`stat-value ${assessment.confidence_score >= 70 ? 'high' : assessment.confidence_score >= 40 ? 'medium' : 'low'}`}>
                                        {assessment.confidence_score?.toFixed(1)}%
                                      </span>
                                    </div>
                                    <div className="assessment-stat">
                                      <i className="fas fa-brain"></i>
                                      <span className="stat-label">Traits:</span>
                                      <span className="stat-value">{assessment.traits_found || 0}</span>
                                    </div>
                                    <div className="assessment-stat">
                                      <i className="fas fa-question-circle"></i>
                                      <span className="stat-label">Questions:</span>
                                      <span className="stat-value">{assessment.total_questions || 0}</span>
                                    </div>
                                  </>
                                ) : (
                                  <span className="no-assessment">No assessment data</span>
                                )}
                              </div>
                            </td>
                            <td className="reasoning-cell" title={topRec.reasoning}>{topRec.reasoning || 'N/A'}</td>
                            <td>
                              <select 
                                value={topRec.status || 'pending'} 
                                onChange={(e) => handleQuickStatusChange(topRec.recommendation_id, e.target.value)}
                                className={`status-select ${topRec.status || 'pending'}`}
                                title="Click to change status"
                              >
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                                <option value="completed">Completed</option>
                              </select>
                            </td>
                            <td className="actions-cell">
                              {(topRec.status === 'pending' || !topRec.status) && (
                                <>
                                  <button 
                                    className="btn btn-sm btn-success" 
                                    onClick={() => handleQuickStatusChange(topRec.recommendation_id, 'approved')}
                                    title="Approve Recommendation"
                                  >
                                    <i className="fas fa-check"></i>
                                  </button>
                                  <button 
                                    className="btn btn-sm btn-warning" 
                                    onClick={() => handleQuickStatusChange(topRec.recommendation_id, 'rejected')}
                                    title="Reject Recommendation"
                                  >
                                    <i className="fas fa-times"></i>
                                  </button>
                                </>
                              )}
                              <button 
                                className="btn btn-sm btn-secondary" 
                                onClick={() => handleEditRecommendation({...topRec, user_name: assessment.user_name, user_email: assessment.user_email, confidence_score: assessment.confidence_score, traits_found: assessment.traits_found, total_questions: assessment.total_questions, assessment_date: assessment.assessment_date})}
                                title="Edit Details"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button 
                                className="btn btn-sm btn-danger" 
                                onClick={() => handleDeleteRecommendation(topRec.recommendation_id)}
                                title="Delete"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </td>
                          </tr>
                          
                          {/* Expanded rows - Other Recommendations (display only, no actions) */}
                          {isExpanded && otherRecs.map((otherRec, index) => (
                            <tr key={otherRec.recommendation_id} className={`status-row-${topRec.status || 'pending'} sub-recommendation-row`}>
                              <td className="checkbox-col"></td>
                              <td className="expand-col">
                                <span className="sub-row-indicator">└</span>
                              </td>
                              <td>
                                <span className="rank-badge">#{index + 2}</span>
                              </td>
                              <td>
                                <span className="course-badge sub-course">{otherRec.course_name}</span>
                              </td>
                              <td className="sub-assessment-cell">
                                <span className="sub-label">Alternative recommendation</span>
                              </td>
                              <td className="reasoning-cell" title={otherRec.reasoning}>{otherRec.reasoning || 'N/A'}</td>
                              <td>
                                <span className={`status-badge ${topRec.status || 'pending'}`} style={{
                                  padding: '4px 10px',
                                  borderRadius: '12px',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  textTransform: 'capitalize',
                                  backgroundColor: topRec.status === 'approved' ? 'rgba(34, 197, 94, 0.2)' : 
                                                   topRec.status === 'rejected' ? 'rgba(239, 68, 68, 0.2)' : 
                                                   topRec.status === 'completed' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                  color: topRec.status === 'approved' ? '#22c55e' : 
                                         topRec.status === 'rejected' ? '#ef4444' : 
                                         topRec.status === 'completed' ? '#6366f1' : '#f59e0b'
                                }}>
                                  {topRec.status || 'pending'}
                                </span>
                              </td>
                              <td className="actions-cell">
                                <span style={{ color: '#6b7280', fontSize: '11px', fontStyle: 'italic' }}>—</span>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Pagination Controls */}
          {recommendations.length > 0 && totalPages > 1 && (
            <div className="pagination-controls">
              <div className="pagination-info">
                Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalRecommendations)} of {totalRecommendations} assessments
              </div>
              <div className="pagination-buttons">
                <button 
                  className="btn btn-sm btn-secondary"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <i className="fas fa-angle-double-left"></i>
                </button>
                <button 
                  className="btn btn-sm btn-secondary"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <i className="fas fa-angle-left"></i> Previous
                </button>
                <span className="page-indicator">
                  Page {currentPage} of {totalPages}
                </span>
                <button 
                  className="btn btn-sm btn-secondary"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next <i className="fas fa-angle-right"></i>
                </button>
                <button 
                  className="btn btn-sm btn-secondary"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <i className="fas fa-angle-double-right"></i>
                </button>
              </div>
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

      {/* Generate Recommendations Modal - REMOVED: Recommendations are now auto-generated from assessments */}

      {/* Edit Recommendation Modal - Enhanced with Assessment Details */}
      {showEditModal && editingRecommendation && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal edit-recommendation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><i className="fas fa-clipboard-check"></i> Review Recommendation</h2>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleSubmitEdit}>
              <div className="modal-body">
                {/* Student & Assessment Context Section */}
                <div className="review-context">
                  <div className="context-section student-section">
                    <h3><i className="fas fa-user-graduate"></i> Student Information</h3>
                    <div className="context-grid">
                      <div className="context-item">
                        <span className="context-label">Name</span>
                        <span className="context-value">{editingRecommendation.user_name}</span>
                      </div>
                      <div className="context-item">
                        <span className="context-label">Email</span>
                        <span className="context-value">{editingRecommendation.user_email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="context-section assessment-section">
                    <h3><i className="fas fa-chart-bar"></i> Assessment Results</h3>
                    {editingRecommendation.confidence_score ? (
                      <div className="assessment-details">
                        <div className="assessment-metric">
                          <div className="metric-icon confidence">
                            <i className="fas fa-chart-line"></i>
                          </div>
                          <div className="metric-info">
                            <span className="metric-value">{editingRecommendation.confidence_score?.toFixed(1)}%</span>
                            <span className="metric-label">Confidence Score</span>
                          </div>
                          <div className={`metric-badge ${editingRecommendation.confidence_score >= 70 ? 'high' : editingRecommendation.confidence_score >= 40 ? 'medium' : 'low'}`}>
                            {editingRecommendation.confidence_score >= 70 ? 'High Match' : editingRecommendation.confidence_score >= 40 ? 'Moderate Match' : 'Low Match'}
                          </div>
                        </div>
                        <div className="assessment-metric">
                          <div className="metric-icon traits">
                            <i className="fas fa-brain"></i>
                          </div>
                          <div className="metric-info">
                            <span className="metric-value">{editingRecommendation.traits_found || 0}</span>
                            <span className="metric-label">Traits Identified</span>
                          </div>
                        </div>
                        <div className="assessment-metric">
                          <div className="metric-icon questions">
                            <i className="fas fa-question-circle"></i>
                          </div>
                          <div className="metric-info">
                            <span className="metric-value">{editingRecommendation.total_questions || 0}</span>
                            <span className="metric-label">Questions Answered</span>
                          </div>
                        </div>
                        <div className="assessment-metric">
                          <div className="metric-icon date">
                            <i className="fas fa-calendar-alt"></i>
                          </div>
                          <div className="metric-info">
                            <span className="metric-value">
                              {editingRecommendation.assessment_date 
                                ? new Date(editingRecommendation.assessment_date).toLocaleDateString() 
                                : 'N/A'}
                            </span>
                            <span className="metric-label">Assessment Date</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="no-assessment-data">
                        <i className="fas fa-exclamation-triangle"></i>
                        <p>No assessment data available for this recommendation</p>
                      </div>
                    )}
                  </div>

                  <div className="context-section recommendation-section">
                    <h3><i className="fas fa-graduation-cap"></i> System Recommendation</h3>
                    <div className="original-recommendation">
                      <span className="course-badge large">{editingRecommendation.course_name}</span>
                      <p className="original-reasoning">
                        <strong>Match Reason:</strong> {editingRecommendation.reasoning || 'No reasoning provided'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Admin Decision Section */}
                <div className="admin-decision-section">
                  <h3><i className="fas fa-user-shield"></i> Admin Decision</h3>
                  
                  <div className="quick-actions">
                    <button 
                      type="button"
                      className={`quick-action-btn approve ${editForm.status === 'approved' ? 'active' : ''}`}
                      onClick={() => setEditForm({...editForm, status: 'approved'})}
                    >
                      <i className="fas fa-check-circle"></i>
                      <span>Approve</span>
                    </button>
                    <button 
                      type="button"
                      className={`quick-action-btn reject ${editForm.status === 'rejected' ? 'active' : ''}`}
                      onClick={() => setEditForm({...editForm, status: 'rejected'})}
                    >
                      <i className="fas fa-times-circle"></i>
                      <span>Reject</span>
                    </button>
                    <button 
                      type="button"
                      className={`quick-action-btn complete ${editForm.status === 'completed' ? 'active' : ''}`}
                      onClick={() => setEditForm({...editForm, status: 'completed'})}
                    >
                      <i className="fas fa-flag-checkered"></i>
                      <span>Mark Completed</span>
                    </button>
                    <button 
                      type="button"
                      className={`quick-action-btn pending ${editForm.status === 'pending' ? 'active' : ''}`}
                      onClick={() => setEditForm({...editForm, status: 'pending'})}
                    >
                      <i className="fas fa-clock"></i>
                      <span>Keep Pending</span>
                    </button>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label><i className="fas fa-book"></i> Override Course (Optional)</label>
                      <select
                        value={editForm.course_id}
                        onChange={(e) => setEditForm({...editForm, course_id: e.target.value})}
                      >
                        <option value="">Keep original: {editingRecommendation.course_name}</option>
                        {courses.map(course => (
                          <option key={course.course_id} value={course.course_id}>
                            {course.course_name}
                          </option>
                        ))}
                      </select>
                      <small className="form-hint">Only change if you believe a different course is more suitable</small>
                    </div>
                  </div>

                  <div className="form-group">
                    <label><i className="fas fa-comment-alt"></i> Admin Notes</label>
                    <textarea
                      value={editForm.admin_notes}
                      onChange={(e) => setEditForm({...editForm, admin_notes: e.target.value})}
                      placeholder="Add notes explaining your decision (e.g., why you approved, rejected, or changed the course)..."
                      rows="3"
                    />
                    <small className="form-hint">These notes are for internal admin reference only</small>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-save"></i> Save Decision
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
