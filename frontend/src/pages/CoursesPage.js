import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './CoursesPage.css';
import { useToast } from '../components/Toast';

const API_BASE_URL = 'http://localhost:5000/api';

function CoursesPage() {
  const toast = useToast();
  const [courses, setCoursesData] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(50); // Show 50 courses per page
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [formData, setFormData] = useState({
    course_name: '',
    course_code: '',
    description: '',
    strand: 'STEM',
    credits: '',
  });
  const [editModal, setEditModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    fetchCourses();
  }, [page, pageSize]);

  useEffect(() => {
    filterCourses();
  }, [courses, search]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/courses`, {
        params: {
          page: page,
          limit: pageSize
        }
      });
      setCoursesData(response.data.courses || []);
      setTotalPages(response.data.pagination.pages || 1);
    } catch (err) {
      setError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const filterCourses = () => {
    let filtered = courses;
    if (search) {
      filtered = filtered.filter(c =>
        c.course_name.toLowerCase().includes(search.toLowerCase()) ||
        c.course_code.toLowerCase().includes(search.toLowerCase())
      );
    }
    setFilteredCourses(filtered);
  };

  const handleAddCourse = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE_URL}/courses`, formData);
      setFormData({ course_name: '', course_code: '', description: '', strand: 'STEM', credits: '' });
      setShowModal(false);
      fetchCourses();
      toast.success('Course added successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add course');
    }
  };

  // Delete course - show confirmation modal
  const handleDeleteClick = (course) => {
    setDeleteTarget(course);
    setDeleteModal(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await axios.delete(`${API_BASE_URL}/courses/${deleteTarget.course_id}`);
      setDeleteModal(false);
      setDeleteTarget(null);
      fetchCourses();
      toast.success('Course deleted successfully!');
    } catch (err) {
      toast.error('Failed to delete course');
      setDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  // Open edit modal with course data
  const handleEditClick = (course) => {
    setEditData({
      course_id: course.course_id,
      course_name: course.course_name || '',
      description: course.description || '',
      required_strand: course.required_strand || 'Any',
      minimum_gwa: course.minimum_gwa || '',
    });
    setEditModal(true);
  };

  // Submit edit form
  const handleEditCourse = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_BASE_URL}/courses/${editData.course_id}`, {
        course_name: editData.course_name,
        description: editData.description,
        required_strand: editData.required_strand,
        minimum_gwa: editData.minimum_gwa ? parseFloat(editData.minimum_gwa) : null,
      });
      setEditModal(false);
      setEditData(null);
      fetchCourses();
      toast.success('Course updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update course');
    }
  };

  // Export courses to CSV
  const exportToCSV = () => {
    const headers = ['Course Name', 'Description', 'Required Strand', 'Minimum GWA'];
    const csvData = filteredCourses.map(course => [
      course.course_name || '',
      course.description || '',
      course.required_strand || 'Any',
      course.minimum_gwa || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `courses_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1><i className="fas fa-book"></i> Courses Management</h1>
        <p>Manage available college courses</p>
      </div>

      {error && <div className="alert alert-error"><i className="fas fa-exclamation-circle"></i>{error}</div>}

      <div className="filter-section">
        <input
          type="text"
          placeholder="Search courses..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
        <button className="btn btn-secondary" onClick={exportToCSV} title="Export to CSV">
          <i className="fas fa-download"></i> Export CSV
        </button>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <i className="fas fa-plus"></i> Add Course
        </button>
      </div>

      <div className="page-size-selector" style={{marginBottom: '15px', display: 'flex', gap: '10px', alignItems: 'center'}}>
        <label>Show:</label>
        <select value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value)); setPage(1); }} style={{padding: '5px 10px'}}>
          <option value={10}>10 per page</option>
          <option value={25}>25 per page</option>
          <option value={50}>50 per page</option>
          <option value={100}>100 per page</option>
        </select>
        <div style={{marginLeft: 'auto', display: 'flex', gap: '5px'}}>
          <button 
            className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('table')}
            title="Table view"
          >
            <i className="fas fa-table"></i> Table
          </button>
          <button 
            className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('grid')}
            title="Grid view"
          >
            <i className="fas fa-th"></i> Grid
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-center">
          <div className="spinner"></div>
          <p>Loading courses...</p>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-inbox"></i>
          <p>No courses found</p>
        </div>
      ) : viewMode === 'table' ? (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Course Name</th>
                <th>Description</th>
                <th>Required Strand</th>
                <th>Minimum GWA</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCourses.map((course) => (
                <tr key={course.course_id}>
                  <td><strong>{course.course_name}</strong></td>
                  <td>{course.description || 'N/A'}</td>
                  <td><span className="badge">{course.required_strand || 'Any'}</span></td>
                  <td>{course.minimum_gwa || 'N/A'}</td>
                  <td className="actions">
                    <button className="btn btn-sm btn-secondary" onClick={() => handleEditClick(course)} title="Edit course"><i className="fas fa-edit"></i></button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDeleteClick(course)} title="Delete course">
                      <i className="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="courses-grid">
          {filteredCourses.map((course) => (
            <div key={course.course_id} className="course-card">
              <div className="course-card-header">
                <h3>{course.course_name}</h3>
                <span className="badge">{course.required_strand || 'Any'}</span>
              </div>
              <div className="course-card-body">
                <p className="description">{course.description || 'No description'}</p>
                <div className="course-info">
                  <div className="info-item">
                    <span className="label">GWA:</span>
                    <span className="value">{course.minimum_gwa || 'N/A'}</span>
                  </div>
                </div>
              </div>
              <div className="course-card-footer">
                <button className="btn btn-sm btn-secondary" onClick={() => handleEditClick(course)}><i className="fas fa-edit"></i> Edit</button>
                <button className="btn btn-sm btn-danger" onClick={() => handleDeleteClick(course)}>
                  <i className="fas fa-trash"></i> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination" style={{marginTop: '20px', display: 'flex', gap: '5px', justifyContent: 'center', alignItems: 'center'}}>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => setPage(1)}
            disabled={page === 1}
          >
            <i className="fas fa-step-backward"></i> First
          </button>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            <i className="fas fa-chevron-left"></i> Previous
          </button>
          <span style={{padding: '0 10px'}}>Page {page} of {totalPages}</span>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
          >
            Next <i className="fas fa-chevron-right"></i>
          </button>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages}
          >
            Last <i className="fas fa-step-forward"></i>
          </button>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><i className="fas fa-book-plus"></i> Add New Course</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleAddCourse}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Course Code</label>
                  <input type="text" value={formData.course_code} onChange={(e) => setFormData({ ...formData, course_code: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Course Name</label>
                  <input type="text" value={formData.course_name} onChange={(e) => setFormData({ ...formData, course_name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Strand</label>
                  <select value={formData.strand} onChange={(e) => setFormData({ ...formData, strand: e.target.value })}>
                    <option value="STEM">STEM</option>
                    <option value="HUMSS">HUMSS</option>
                    <option value="ABM">ABM</option>
                    <option value="TVL">TVL</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Credits</label>
                  <input type="number" value={formData.credits} onChange={(e) => setFormData({ ...formData, credits: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Course</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Course Modal */}
      {editModal && editData && (
        <div className="modal-overlay" onClick={() => setEditModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><i className="fas fa-edit"></i> Edit Course</h2>
              <button className="close-btn" onClick={() => setEditModal(false)}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleEditCourse}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Course Name</label>
                  <input 
                    type="text" 
                    value={editData.course_name} 
                    onChange={(e) => setEditData({ ...editData, course_name: e.target.value })} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Required Strand</label>
                  <select 
                    value={editData.required_strand} 
                    onChange={(e) => setEditData({ ...editData, required_strand: e.target.value })}
                  >
                    <option value="Any">Any</option>
                    <option value="STEM">STEM</option>
                    <option value="HUMSS">HUMSS</option>
                    <option value="ABM">ABM</option>
                    <option value="TVL">TVL</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Minimum GWA</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    max="100"
                    value={editData.minimum_gwa} 
                    onChange={(e) => setEditData({ ...editData, minimum_gwa: e.target.value })} 
                    placeholder="e.g., 85.00"
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
                Delete "{deleteTarget.course_name}"?
              </h3>
              <p style={{color: '#94a3b8', fontSize: '14px', lineHeight: '1.6'}}>
                This action cannot be undone. This will permanently delete the course from the system.
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

export default CoursesPage;
