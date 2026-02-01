import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../components/Toast';

const API_BASE_URL = 'http://localhost:5000/api';

function TestsPage() {
  const toast = useToast();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ test_name: '', description: '' });
  const [editModal, setEditModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/tests`);
      setTests(response.data.tests || []);
    } catch (err) {
      setError('Failed to load tests');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTest = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE_URL}/tests`, formData);
      setFormData({ test_name: '', description: '' });
      setShowModal(false);
      fetchTests();
      toast.success('Test created successfully!');
    } catch (err) {
      toast.error('Failed to add test');
    }
  };

  // Open edit modal with test data
  const handleEditClick = (test) => {
    setEditData({
      test_id: test.test_id,
      test_name: test.test_name || '',
      description: test.description || '',
    });
    setEditModal(true);
  };

  // Submit edit form
  const handleEditTest = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_BASE_URL}/tests/${editData.test_id}`, {
        test_name: editData.test_name,
        description: editData.description,
      });
      setEditModal(false);
      setEditData(null);
      fetchTests();
      toast.success('Test updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update test');
    }
  };

  // Delete test - show confirmation modal
  const handleDeleteClick = (test) => {
    setDeleteTarget(test);
    setDeleteModal(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await axios.delete(`${API_BASE_URL}/tests/${deleteTarget.test_id}`);
      setDeleteModal(false);
      setDeleteTarget(null);
      fetchTests();
      toast.success('Test deleted successfully!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete test');
      setDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1><i className="fas fa-clipboard-check"></i> Tests Management</h1>
        <p>Create and manage assessment tests</p>
      </div>

      {error && <div className="alert alert-error"><i className="fas fa-exclamation-circle"></i>{error}</div>}

      <div className="filter-section">
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <i className="fas fa-plus"></i> Create Test
        </button>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner"></div><p>Loading tests...</p></div>
      ) : tests.length === 0 ? (
        <div className="empty-state"><i className="fas fa-inbox"></i><p>No tests created yet</p></div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Test Name</th><th>Description</th><th>Created</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {tests.map((test) => (
                <tr key={test.test_id}>
                  <td><strong>{test.test_name}</strong></td>
                  <td>{test.description || 'N/A'}</td>
                  <td>{new Date(test.created_at).toLocaleDateString()}</td>
                  <td className="actions">
                    <button className="btn btn-sm btn-secondary" onClick={() => handleEditClick(test)} title="Edit test"><i className="fas fa-edit"></i></button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDeleteClick(test)} title="Delete test"><i className="fas fa-trash"></i></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><i className="fas fa-plus-circle"></i> Create Test</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleAddTest}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Test Name</label>
                  <input type="text" value={formData.test_name} onChange={(e) => setFormData({ ...formData, test_name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Test</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Test Modal */}
      {editModal && editData && (
        <div className="modal-overlay" onClick={() => setEditModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><i className="fas fa-edit"></i> Edit Test</h2>
              <button className="close-btn" onClick={() => setEditModal(false)}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleEditTest}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Test Name</label>
                  <input 
                    type="text" 
                    value={editData.test_name} 
                    onChange={(e) => setEditData({ ...editData, test_name: e.target.value })} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea 
                    value={editData.description} 
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    rows="4"
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><i className="fas fa-save"></i> Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteModal(false)}>
          <div className="modal delete-modal" onClick={(e) => e.stopPropagation()} style={{maxWidth: '450px', textAlign: 'center'}}>
            <div className="modal-header" style={{background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)', borderBottom: '2px solid #7f1d1d'}}>
              <h2 style={{color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}>
                <i className="fas fa-exclamation-triangle"></i> Confirm Delete
              </h2>
            </div>
            <div className="modal-body" style={{padding: '30px 25px'}}>
              <div style={{fontSize: '48px', color: '#dc2626', marginBottom: '15px'}}>
                <i className="fas fa-trash-alt"></i>
              </div>
              <h3 style={{color: '#e2e8f0', marginBottom: '10px', fontSize: '18px'}}>
                Delete "{deleteTarget.test_name}"?
              </h3>
              <p style={{color: '#94a3b8', fontSize: '14px', lineHeight: '1.6'}}>
                This action cannot be undone. This will permanently delete the test and all associated questions.
              </p>
            </div>
            <div className="modal-footer" style={{justifyContent: 'center', gap: '15px', padding: '20px 25px', borderTop: '1px solid #334155'}}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setDeleteModal(false)}
                style={{minWidth: '120px', padding: '12px 24px'}}
              >
                <i className="fas fa-times"></i> Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-danger" 
                onClick={confirmDelete}
                style={{minWidth: '120px', padding: '12px 24px', background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'}}
              >
                <i className="fas fa-trash"></i> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TestsPage;
