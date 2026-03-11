import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './UsersPage.css';
import { useToast } from '../components/Toast';

const API_BASE_URL = 'http://localhost:5000/api';

function UsersPage() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [strandFilter, setStrandFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userTestHistory, setUserTestHistory] = useState([]);
  const [expandedAttempt, setExpandedAttempt] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, search, strandFilter, statusFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/users?limit=100`);
      setUsers(response.data.users || []);
    } catch (err) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    if (search) {
      filtered = filtered.filter(u =>
        u.full_name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (strandFilter) {
      filtered = filtered.filter(u => u.strand === strandFilter);
    }

    if (statusFilter === 'active') {
      filtered = filtered.filter(u => u.is_active);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(u => !u.is_active);
    }

    setFilteredUsers(filtered);
  };



  const handleDeleteClick = (user) => {
    setDeleteTarget(user);
    setDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await axios.delete(`${API_BASE_URL}/users/${deleteTarget.user_id}`);
      fetchUsers();
      setDeleteModal(false);
      setDeleteTarget(null);
      toast.success('User deleted successfully!');
    } catch (err) {
      toast.error('Failed to delete user');
    }
  };

  const handleDeleteUser = async (userId) => {
    // Legacy function - now uses modal
    const user = users.find(u => u.user_id === userId);
    if (user) {
      handleDeleteClick(user);
    }
  };
  const handleViewDetails = async (user) => {
    setSelectedUser(user);
    try {
      const response = await axios.get(`${API_BASE_URL}/users/${user.user_id}/test-history`);
      setUserTestHistory(response.data.test_history || []);
      setShowDetailModal(true);
    } catch (err) {
      setError('Failed to load user details');
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      await axios.patch(`${API_BASE_URL}/users/${userId}/status`, {
        is_active: !currentStatus
      });
      fetchUsers();
      setShowDetailModal(false);
    } catch (err) {
      setError('Failed to update user status');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getInactivityDays = (lastActive) => {
    if (!lastActive) return 'Never';
    const lastActiveDate = new Date(lastActive);
    const now = new Date();
    const diffMs = now - lastActiveDate;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 60) {
      return diffMins === 0 ? 'Just now' : `${diffMins} min ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return diffDays === 0 ? 'Today' : `${diffDays}d ago`;
    }
  };

  const getOnlineStatus = (lastActive) => {
    if (!lastActive) return 'Offline';
    const lastActiveDate = new Date(lastActive);
    const now = new Date();
    const diffMins = Math.floor((now - lastActiveDate) / (1000 * 60));
    // Online if logged in within last 30 minutes
    return diffMins < 30 ? 'Online' : 'Offline';
  };

  // Export users to CSV
  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Strand', 'GWA', 'Tests Taken', 'Status', 'Last Login', 'Created At'];
    const csvData = filteredUsers.map(user => [
      `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      user.email || '',
      user.strand || '',
      user.gwa || '',
      user.tests_taken || 0,
      user.is_active ? 'Active' : 'Inactive',
      user.last_login ? new Date(user.last_login).toLocaleString() : 'Never',
      user.created_at ? new Date(user.created_at).toLocaleString() : ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1><i className="fas fa-users"></i> Users Management</h1>
        <p>Manage student accounts and profiles</p>
      </div>

      {error && (
        <div className="alert alert-error">
          <i className="fas fa-exclamation-circle"></i>
          {error}
        </div>
      )}

      <div className="filter-section">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
        <select
          value={strandFilter}
          onChange={(e) => setStrandFilter(e.target.value)}
          className="strand-select"
        >
          <option value="">All Strands</option>
          <option value="STEM">STEM</option>
          <option value="HUMSS">HUMSS</option>
          <option value="ABM">ABM</option>
          <option value="TVL">TVL</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="status-select"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button className="btn btn-secondary" onClick={exportToCSV} title="Export to CSV">
          <i className="fas fa-download"></i> Export CSV
        </button>
      </div>

      {loading ? (
        <div className="loading-center">
          <div className="spinner"></div>
          <p>Loading users...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-inbox"></i>
          <p>No users found</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Strand</th>
                <th>GWA</th>
                <th>Tests Taken</th>
                <th>Last Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.user_id}>
                  <td><strong>{user.full_name}</strong></td>
                  <td>{user.email}</td>
                  <td><span className="badge">{user.strand}</span></td>
                  <td>{user.gwa || 'N/A'}</td>
                  <td className="text-center">{user.tests_taken || 0}</td>
                  <td className="text-sm">{user.last_login ? formatDate(user.last_login) : (user.last_test_date ? formatDate(user.last_test_date) : 'Never')}</td>
                  <td className="actions">
                    <button 
                      className="btn btn-sm btn-info"
                      onClick={() => handleViewDetails(user)}
                      title="View details"
                    >
                      <i className="fas fa-eye"></i>
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeleteUser(user.user_id)}
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

      {showDetailModal && selectedUser && (
        <div className="modal-overlay" onClick={() => { setShowDetailModal(false); setExpandedAttempt(null); }}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><i className="fas fa-user-circle"></i> User Details</h2>
              <button className="close-btn" onClick={() => { setShowDetailModal(false); setExpandedAttempt(null); }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="label">Name:</span>
                  <span className="value">{selectedUser.full_name}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Email:</span>
                  <span className="value">{selectedUser.email}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Strand:</span>
                  <span className="value"><span className="badge">{selectedUser.strand}</span></span>
                </div>
                <div className="detail-item">
                  <span className="label">GWA:</span>
                  <span className="value">{selectedUser.gwa || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Tests Taken:</span>
                  <span className="value">{selectedUser.tests_taken || 0}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Last Test:</span>
                  <span className="value">{selectedUser.last_test_date ? formatDate(selectedUser.last_test_date) : 'Never'}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Last Active:</span>
                  <span className="value">{selectedUser.last_login ? formatDate(selectedUser.last_login) : (selectedUser.last_test_date ? formatDate(selectedUser.last_test_date) : 'Never')}</span>
                </div>
              </div>

              <div className="test-history" style={{marginTop: '30px'}}>
                <h3><i className="fas fa-history"></i> Assessment History ({userTestHistory.length})</h3>
                {userTestHistory.length === 0 ? (
                  <p className="empty-text">No assessments taken yet</p>
                ) : (
                  <div className="assessment-history-list">
                    {userTestHistory.map((attempt, index) => (
                      <div key={attempt.attempt_id} className="assessment-card" style={{
                        background: '#1e293b',
                        borderRadius: '12px',
                        marginBottom: '12px',
                        overflow: 'hidden',
                        border: expandedAttempt === attempt.attempt_id ? '2px solid #6366f1' : '1px solid #334155',
                        transition: 'all 0.2s ease'
                      }}>
                        {/* Clickable Header - Always visible */}
                        <div 
                          onClick={() => setExpandedAttempt(expandedAttempt === attempt.attempt_id ? null : attempt.attempt_id)}
                          style={{
                            padding: '15px 20px',
                            background: expandedAttempt === attempt.attempt_id 
                              ? 'linear-gradient(135deg, #1e3a5f 0%, #2d1b4e 100%)' 
                              : '#1e293b',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'background 0.2s ease'
                          }}
                        >
                          <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                            <span style={{
                              background: '#6366f1',
                              color: '#fff',
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: 'bold'
                            }}>#{index + 1}</span>
                            <div>
                              <h4 style={{margin: 0, color: '#fff', fontSize: '14px'}}>{attempt.test_name}</h4>
                              <span style={{fontSize: '11px', color: '#94a3b8'}}>{formatDate(attempt.attempt_date)}</span>
                            </div>
                          </div>
                          
                          <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
                            {/* Quick Stats */}
                            <div style={{display: 'flex', gap: '15px', fontSize: '12px'}}>
                              <span style={{color: '#fff'}}><strong>{attempt.questions_answered}</strong> Q</span>
                              <span style={{color: '#a855f7'}}><strong>{attempt.traits_count}</strong> Traits</span>
                              <span style={{color: '#22c55e'}}><strong>{attempt.confidence}%</strong></span>
                            </div>
                            {/* Top Course Preview */}
                            {attempt.top_courses && attempt.top_courses.length > 0 && (
                              <span style={{
                                background: '#22c55e20',
                                color: '#22c55e',
                                padding: '4px 10px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '500',
                                maxWidth: '150px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {attempt.top_courses[0].course_name}
                              </span>
                            )}
                            {/* Expand Icon */}
                            <i className={`fas fa-chevron-${expandedAttempt === attempt.attempt_id ? 'up' : 'down'}`} 
                               style={{color: '#94a3b8', fontSize: '14px'}}></i>
                          </div>
                        </div>
                        
                        {/* Expanded Content */}
                        {expandedAttempt === attempt.attempt_id && (
                          <div style={{borderTop: '1px solid #334155'}}>
                            {/* Stats Row */}
                            <div style={{
                              padding: '20px',
                              background: 'linear-gradient(135deg, #1e3a5f 0%, #2d1b4e 100%)',
                              borderBottom: '1px solid #334155'
                            }}>
                              <div style={{display: 'flex', gap: '30px', justifyContent: 'center', marginBottom: '15px'}}>
                                <div style={{textAlign: 'center'}}>
                                  <div style={{fontSize: '28px', fontWeight: 'bold', color: '#fff'}}>{attempt.questions_answered}</div>
                                  <div style={{fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase'}}>Questions</div>
                                </div>
                                <div style={{textAlign: 'center'}}>
                                  <div style={{fontSize: '28px', fontWeight: 'bold', color: '#a855f7'}}>{attempt.traits_count || 0}</div>
                                  <div style={{fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase'}}>Traits Found</div>
                                </div>
                                <div style={{textAlign: 'center'}}>
                                  <div style={{fontSize: '28px', fontWeight: 'bold', color: '#22c55e'}}>{attempt.confidence || 0}%</div>
                                  <div style={{fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase'}}>Confidence</div>
                                </div>
                              </div>
                              
                              {/* Traits Tags */}
                              {attempt.traits_found && attempt.traits_found.length > 0 && (
                                <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center'}}>
                                  {attempt.traits_found.map((trait, idx) => (
                                    <span key={idx} style={{
                                      background: '#7c3aed',
                                      color: '#fff',
                                      padding: '4px 12px',
                                      borderRadius: '20px',
                                      fontSize: '11px',
                                      fontWeight: '500'
                                    }}>{trait}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                            
                            {/* Top Course Recommendations */}
                            <div style={{padding: '20px'}}>
                              <h5 style={{margin: '0 0 15px 0', color: '#94a3b8', fontSize: '13px', textTransform: 'uppercase', fontWeight: '600'}}>
                                <i className="fas fa-graduation-cap" style={{marginRight: '8px'}}></i>
                                Top Course Recommendations
                              </h5>
                              
                              {attempt.top_courses && attempt.top_courses.length > 0 ? (
                                <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                                  {attempt.top_courses.map((course, idx) => (
                                    <div key={idx} style={{
                                      background: '#0f172a',
                                      borderRadius: '10px',
                                      padding: '15px',
                                      border: `2px solid ${idx === 0 ? '#22c55e' : idx === 1 ? '#3b82f6' : '#6366f1'}`,
                                      position: 'relative'
                                    }}>
                                      {/* Rank Badge */}
                                      <div style={{
                                        position: 'absolute',
                                        top: '-10px',
                                        right: '15px',
                                        background: idx === 0 ? '#22c55e' : idx === 1 ? '#3b82f6' : '#6366f1',
                                        color: '#fff',
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '12px',
                                        fontWeight: 'bold'
                                      }}>#{idx + 1}</div>
                                      
                                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px'}}>
                                        <h6 style={{margin: 0, color: '#fff', fontSize: '14px', fontWeight: '600', flex: 1, paddingRight: '40px'}}>
                                          {course.course_name}
                                        </h6>
                                        <span style={{
                                          color: idx === 0 ? '#22c55e' : idx === 1 ? '#3b82f6' : '#a855f7',
                                          fontWeight: 'bold',
                                          fontSize: '14px'
                                        }}>{course.match_percentage}%</span>
                                      </div>
                                      
                                      {/* Match Bar */}
                                      <div style={{
                                        background: '#1e293b',
                                        borderRadius: '4px',
                                        height: '6px',
                                        marginBottom: '10px',
                                        overflow: 'hidden'
                                      }}>
                                        <div style={{
                                          width: `${course.match_percentage}%`,
                                          height: '100%',
                                          background: idx === 0 ? '#22c55e' : idx === 1 ? '#3b82f6' : '#6366f1',
                                          borderRadius: '4px',
                                          transition: 'width 0.3s ease'
                                        }}></div>
                                      </div>
                                      
                                      {course.course_description && (
                                        <p style={{margin: '0 0 10px 0', color: '#94a3b8', fontSize: '12px', lineHeight: '1.5'}}>
                                          {course.course_description}
                                        </p>
                                      )}
                                      
                                      {/* Trait Tag */}
                                      {course.trait_tag && (
                                        <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px'}}>
                                          <span style={{
                                            background: '#1e293b',
                                            color: '#60a5fa',
                                            padding: '3px 8px',
                                            borderRadius: '4px',
                                            fontSize: '10px',
                                            border: '1px solid #334155'
                                          }}>{course.trait_tag}</span>
                                        </div>
                                      )}
                                      
                                      {/* Reasoning */}
                                      <div style={{
                                        background: '#1e293b',
                                        borderRadius: '6px',
                                        padding: '10px',
                                        borderLeft: '3px solid #6366f1'
                                      }}>
                                        <p style={{margin: 0, fontSize: '12px', color: '#94a3b8', fontStyle: 'italic'}}>
                                          <strong style={{color: '#a5b4fc'}}>Why this course:</strong> {course.reasoning || 'Based on your assessment results and identified traits.'}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p style={{color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '20px'}}>
                                  No course recommendations available for this assessment.
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className={`btn ${selectedUser.is_active ? 'btn-warning' : 'btn-success'}`}
                onClick={() => handleToggleStatus(selectedUser.user_id, selectedUser.is_active)}
              >
                <i className={`fas fa-${selectedUser.is_active ? 'ban' : 'check'}`}></i>
                {selectedUser.is_active ? 'Deactivate Account' : 'Activate Account'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowDetailModal(false); setExpandedAttempt(null); }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Delete Confirmation Modal */}
      {deleteModal && deleteTarget && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="delete-modal" style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            borderRadius: '16px',
            padding: '30px',
            maxWidth: '450px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '70px',
              height: '70px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 10px 30px rgba(238, 90, 36, 0.3)'
            }}>
              <i className="fas fa-user-times" style={{ fontSize: '28px', color: 'white' }}></i>
            </div>
            <h3 style={{ color: '#fff', marginBottom: '15px', fontSize: '22px' }}>Delete User?</h3>
            <p style={{ color: '#a0a0a0', marginBottom: '25px', lineHeight: '1.6' }}>
              Are you sure you want to delete this user?<br />
              <span style={{ color: '#ff6b6b', fontWeight: '500' }}>{deleteTarget.full_name}</span><br />
              <span style={{ color: '#888', fontSize: '13px' }}>{deleteTarget.email}</span><br />
              <small style={{ color: '#666', marginTop: '10px', display: 'block' }}>This action cannot be undone. All user data will be permanently removed.</small>
            </p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  setDeleteModal(false);
                  setDeleteTarget(null);
                }}
                style={{
                  padding: '12px 30px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'transparent',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  padding: '12px 30px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  boxShadow: '0 4px 15px rgba(238, 90, 36, 0.4)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
              >
                <i className="fas fa-trash" style={{ marginRight: '8px' }}></i>
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UsersPage;
