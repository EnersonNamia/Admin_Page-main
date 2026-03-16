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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Pagination state for recommendations
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecommendations, setTotalRecommendations] = useState(0);
  const [itemsPerPage] = useState(25);
  
  // Expanded rows state (for showing other 4 recommendations)
  const [expandedRows, setExpandedRows] = useState([]);
  
  // Generate recommendations state (reserved for future use)
  // eslint-disable-next-line no-unused-vars
  const [generating, setGenerating] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [generateResult, setGenerateResult] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  // eslint-disable-next-line no-unused-vars
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

  // Assessment viewer state
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [assessmentAnswers, setAssessmentAnswers] = useState([]);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [viewingAssessment, setViewingAssessment] = useState(null);

  // Export state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportSummary, setExportSummary] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchRules();
    fetchRecommendations(1);
    fetchCourses();
    fetchTraits();
  }, []);

  useEffect(() => {
    fetchRecommendations(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Clear expanded rows when page changes
  useEffect(() => {
    setExpandedRows([]);
  }, [currentPage]);

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
      const response = await axios.get(`${API_BASE_URL}/recommendations/filter/status/all?page=${page}&limit=${itemsPerPage}`);
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
        
        // Helper function to extract match percentage from reasoning
        const extractMatchPercentage = (reasoning) => {
          if (!reasoning) return 0;
          const match = reasoning.match(/Match:\s*([\d.]+)%/);
          return match ? parseFloat(match[1]) : 0;
        };
        
        // Add match_percentage to each rec
        flatRecs.forEach(rec => {
          rec.match_percentage = extractMatchPercentage(rec.reasoning);
        });
        
        // Sort by match_percentage descending (highest match first)
        flatRecs.sort((a, b) => (b.match_percentage || 0) - (a.match_percentage || 0));
        
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
              all_recommendations: []
            };
          }
          
          const recData = {
            recommendation_id: rec.recommendation_id,
            course_id: rec.course_id,
            course_name: rec.course_name,
            reasoning: rec.reasoning,
            status: rec.status || 'pending',
            recommendation_rank: rec.recommendation_rank || 1,
            recommended_at: rec.recommended_at,
            match_percentage: rec.match_percentage
          };
          
          groupedByAttempt[attemptId].all_recommendations.push(recData);
        }
        
        // Sort each group by match_percentage and assign top_recommendation/other_recommendations
        const groupedList = Object.values(groupedByAttempt).map(group => {
          // Sort by match percentage descending
          group.all_recommendations.sort((a, b) => (b.match_percentage || 0) - (a.match_percentage || 0));
          
          // Assign proper ranks
          group.all_recommendations.forEach((rec, idx) => {
            rec.recommendation_rank = idx + 1;
          });
          
          return {
            ...group,
            top_recommendation: group.all_recommendations[0] || null,
            other_recommendations: group.all_recommendations.slice(1),
            all_recommendations: undefined // Remove temp field
          };
        });
        
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


  const handleDeleteRecommendation = async (recId) => {
    if (!window.confirm('Are you sure you want to delete this recommendation? This action cannot be undone.')) return;
    try {
      await axios.delete(`${API_BASE_URL}/recommendations/delete/${recId}`);
      fetchRecommendations();
    } catch (err) {
      setError('Failed to delete recommendation');
    }
  };

  // View assessment answers
  const handleViewAssessment = async (assessment) => {
    setViewingAssessment(assessment);
    setShowAssessmentModal(true);
    setAssessmentLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/recommendations/attempt/${assessment.attempt_id}/answers`);
      setAssessmentAnswers(response.data.answers || []);
    } catch (err) {
      console.error('Failed to load assessment answers:', err);
      setAssessmentAnswers([]);
    } finally {
      setAssessmentLoading(false);
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



  const getStatusIcon = (status) => {
    switch(status) {
      case 'approved': return 'fa-check-circle';
      case 'rejected': return 'fa-times-circle';
      case 'completed': return 'fa-flag-checkered';
      default: return 'fa-clock';
    }
  };

  // Generate Recommendations
  // eslint-disable-next-line no-unused-vars
  const handleGenerateRecommendations = async () => {
    setGenerating(true);
    setGenerateResult(null);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/recommendations/generate`, {
        overwrite_existing: generateOptions.overwrite_existing
      });
      
      setGenerateResult(response.data);
      fetchRecommendations();
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
            <p>Review recommendations generated from student assessments. View questions answered and recommended courses.</p>
            <button className="btn btn-secondary" onClick={handleOpenExport}>
              <i className="fas fa-file-export"></i> Export Reports
            </button>
          </div>

          {recommendations.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-inbox"></i>
              <p>No recommendations found</p>
            </div>
          ) : (
            <>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th style={{width: '30px'}}></th>
                      <th>Student</th>
                      <th>Top Recommended Course</th>
                      <th>Assessment Info</th>
                      <th>Match Reason</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recommendations.map((assessment) => {
                      const topRec = assessment.top_recommendation;
                      // Sort other recommendations by match_percentage descending (highest first), fallback to recommendation_rank
                      const otherRecs = (assessment.other_recommendations || []).slice().sort((a, b) => {
                        // If match_percentage is available, use it (descending)
                        if (a.match_percentage !== undefined && b.match_percentage !== undefined) {
                          return (b.match_percentage || 0) - (a.match_percentage || 0);
                        }
                        // Fallback to recommendation_rank (ascending)
                        return (a.recommendation_rank || 999) - (b.recommendation_rank || 999);
                      });
                      const isExpanded = expandedRows.includes(assessment.attempt_id);
                      
                      if (!topRec) return null;
                      
                      return (
                        <React.Fragment key={assessment.attempt_id || topRec.recommendation_id}>
                          {/* Main row - Top Recommendation */}
                          <tr className="main-recommendation-row">
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
                            <td className="actions-cell">
                              <button 
                                className="btn btn-sm btn-secondary" 
                                onClick={() => handleViewAssessment({...assessment, top_recommendation: topRec, other_recommendations: otherRecs})}
                                title="View Assessment"
                              >
                                <i className="fas fa-eye"></i>
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
                          
                          {/* Expanded rows - Other Recommendations (display only) */}
                          {isExpanded && otherRecs.map((otherRec, index) => (
                            <tr key={otherRec.recommendation_id} className="sub-recommendation-row">
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

      {/* Assessment Answers Modal */}
      {showAssessmentModal && viewingAssessment && (
        <div className="modal-overlay" onClick={() => setShowAssessmentModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><i className="fas fa-clipboard-list"></i> Assessment Details</h2>
              <button className="close-btn" onClick={() => setShowAssessmentModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="review-context">
                <div className="context-section student-section">
                  <h3><i className="fas fa-user-graduate"></i> Student Information</h3>
                  <div className="context-grid">
                    <div className="context-item">
                      <span className="context-label">Name</span>
                      <span className="context-value">{viewingAssessment.user_name}</span>
                    </div>
                    <div className="context-item">
                      <span className="context-label">Email</span>
                      <span className="context-value">{viewingAssessment.user_email}</span>
                    </div>
                  </div>
                </div>

                {/* Top 6 Recommended Courses */}
                <div className="context-section">
                  <h3><i className="fas fa-graduation-cap"></i> Top Recommended Courses</h3>
                  <div className="recommended-courses-list">
                    {viewingAssessment.top_recommendation && (
                      <div className="recommended-course-item top">
                        <span className="rank-badge">#1</span>
                        <span className="course-badge top-course">
                          <i className="fas fa-trophy"></i> {viewingAssessment.top_recommendation.course_name}
                        </span>
                        <span className="match-info">{viewingAssessment.top_recommendation.reasoning || ''}</span>
                      </div>
                    )}
                    {(viewingAssessment.other_recommendations || []).slice(0, 5).map((rec, idx) => (
                      <div key={rec.recommendation_id} className="recommended-course-item">
                        <span className="rank-badge">#{idx + 2}</span>
                        <span className="course-badge sub-course">{rec.course_name}</span>
                        <span className="match-info">{rec.reasoning || ''}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Questions and Answers */}
                <div className="context-section">
                  <h3><i className="fas fa-question-circle"></i> Questions &amp; Answers ({assessmentAnswers.length})</h3>
                  {assessmentLoading ? (
                    <div className="loading-center"><div className="spinner"></div><p>Loading answers...</p></div>
                  ) : assessmentAnswers.length === 0 ? (
                    <div className="empty-state">
                      <i className="fas fa-inbox"></i>
                      <p>No answer data available for this assessment</p>
                    </div>
                  ) : (
                    <div className="assessment-answers-list">
                      {assessmentAnswers.map((answer, idx) => (
                        <div key={answer.question_id} className="answer-item">
                          <div className="answer-question">
                            <span className="question-number">Q{idx + 1}.</span>
                            <span className="question-text">{answer.question_text}</span>
                          </div>
                          <div className="answer-chosen">
                            <i className="fas fa-check-circle" style={{color: '#22c55e'}}></i>
                            <span className="chosen-option">{answer.chosen_option_text}</span>
                            {answer.trait_tag && (
                              <span className="trait-badge">{answer.trait_tag}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAssessmentModal(false)}>
                Close
              </button>
            </div>
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
                      <button className="btn btn-secondary" onClick={() => handleExportCSV('rejected')}>
                        <i className="fas fa-times"></i> Rejected Only
                      </button>
                      <button className="btn btn-secondary" onClick={() => handleExportCSV('completed')}>
                        <i className="fas fa-flag-checkered"></i> Completed Only
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
