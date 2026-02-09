import React, { useState, useEffect, useCallback } from 'react';
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
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(50); // Show 50 courses per page
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [formData, setFormData] = useState({
    course_name: '',
    description: '',
    required_strand: '',
    minimum_gwa: '',
    trait_tag: '',
  });
  const [editModal, setEditModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  
  // Trait selector state
  const [showTraitSelector, setShowTraitSelector] = useState(false);
  const [traitSelectorTarget, setTraitSelectorTarget] = useState('add'); // 'add' or 'edit'
  const [selectedTraits, setSelectedTraits] = useState([]);
  const [showNewTraitInput, setShowNewTraitInput] = useState(false);
  const [newTraitText, setNewTraitText] = useState('');
  const [newTraitCategory, setNewTraitCategory] = useState('Skill Traits');
  const [dynamicTraits, setDynamicTraits] = useState({});

  // Same trait categories as options
  const traitCategories = {
    'RIASEC Types': ['Realistic', 'Investigative', 'Artistic', 'Social', 'Enterprising', 'Conventional'],
    'Healthcare Path': ['Patient-Care', 'Medical-Lab', 'Rehab-Therapy', 'Health-Admin'],
    'Technology Path': ['Software-Dev', 'Hardware-Systems', 'Data-Analytics', 'Cyber-Defense'],
    'Engineering Path': ['Civil-Build', 'Electrical-Power', 'Mechanical-Design', 'Industrial-Ops'],
    'Business Path': ['Finance-Acct', 'Marketing-Sales', 'Startup-Venture'],
    'Education Path': ['Teaching-Ed'],
    'Arts Path': ['Visual-Design', 'Digital-Media', 'Spatial-Design'],
    'Science Path': ['Lab-Research', 'Field-Research'],
    'Public Service Path': ['Law-Enforce', 'Community-Serve'],
    'Other Paths': ['Maritime-Sea', 'Agri-Nature', 'Hospitality-Svc'],
    'Skill Traits': ['Technical-Skill', 'People-Skill', 'Creative-Skill', 'Analytical-Skill', 'Physical-Skill', 'Admin-Skill'],
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 when search changes
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchCourses();
  }, [page, pageSize, debouncedSearch]);

  useEffect(() => {
    // No longer need client-side filtering, search is now server-side
    setFilteredCourses(courses);
  }, [courses]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/courses`, {
        params: {
          page: page,
          limit: pageSize,
          search: debouncedSearch || undefined  // Server-side search
        }
      });
      console.log('Fetched courses:', response.data);
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
        c.course_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.description?.toLowerCase().includes(search.toLowerCase()) ||
        c.trait_tag?.toLowerCase().includes(search.toLowerCase())
      );
    }
    setFilteredCourses(filtered);
  };

  const handleAddCourse = async (e) => {
    e.preventDefault();
    // Validate exactly 3 traits
    const traits = (formData.trait_tag || '').split(',').map(t => t.trim()).filter(Boolean);
    if (traits.length !== 3) {
      toast.error('Please select exactly 3 trait tags');
      return;
    }
    try {
      await axios.post(`${API_BASE_URL}/courses`, {
        course_name: formData.course_name,
        description: formData.description,
        required_strand: formData.required_strand || null,
        minimum_gwa: formData.minimum_gwa ? parseFloat(formData.minimum_gwa) : null,
        trait_tag: formData.trait_tag || null,
      });
      setFormData({ course_name: '', description: '', required_strand: '', minimum_gwa: '', trait_tag: '' });
      setShowModal(false);
      fetchCourses();
      toast.success('Course added successfully!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add course');
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
      required_strand: course.required_strand || '',
      minimum_gwa: course.minimum_gwa || '',
      trait_tag: course.trait_tag || '',
    });
    setEditModal(true);
  };

  // Submit edit form
  const handleEditCourse = async (e) => {
    e.preventDefault();
    // Validate exactly 3 traits
    const traits = (editData.trait_tag || '').split(',').map(t => t.trim()).filter(Boolean);
    if (traits.length !== 3) {
      toast.error('Please select exactly 3 trait tags');
      return;
    }
    try {
      const updatePayload = {
        course_name: editData.course_name,
        description: editData.description,
        required_strand: editData.required_strand || null,
        minimum_gwa: editData.minimum_gwa ? parseFloat(editData.minimum_gwa) : null,
        trait_tag: editData.trait_tag || null,
      };
      console.log('Updating course with payload:', updatePayload);
      const response = await axios.put(`${API_BASE_URL}/courses/${editData.course_id}`, updatePayload);
      console.log('Update response:', response.data);
      setEditModal(false);
      setEditData(null);
      fetchCourses();
      toast.success('Course updated successfully!');
    } catch (err) {
      console.error('Update failed:', err.response?.data || err.message);
      toast.error(err.response?.data?.detail || 'Failed to update course');
    }
  };

  // Trait selector functions
  const getMergedTraitCategories = () => {
    const merged = { ...traitCategories };
    Object.entries(dynamicTraits).forEach(([category, traits]) => {
      if (!merged[category]) {
        merged[category] = [];
      }
      merged[category] = [...merged[category], ...traits];
    });
    return merged;
  };

  const openTraitSelector = (target) => {
    setTraitSelectorTarget(target);
    // Parse existing traits into array
    const existingTraits = target === 'add' 
      ? (formData.trait_tag || '').split(',').map(t => t.trim()).filter(Boolean)
      : (editData?.trait_tag || '').split(',').map(t => t.trim()).filter(Boolean);
    setSelectedTraits(existingTraits);
    setShowTraitSelector(true);
  };

  const toggleTrait = (trait) => {
    setSelectedTraits(prev => {
      if (prev.includes(trait)) {
        return prev.filter(t => t !== trait);
      } else {
        // Limit to exactly 3 traits
        if (prev.length >= 3) {
          toast.error('Maximum 3 traits allowed. Remove one first.');
          return prev;
        }
        return [...prev, trait];
      }
    });
  };

  const applySelectedTraits = () => {
    if (selectedTraits.length !== 3) {
      toast.error('Please select exactly 3 traits');
      return;
    }
    const traitString = selectedTraits.join(', ');
    if (traitSelectorTarget === 'add') {
      setFormData({ ...formData, trait_tag: traitString });
    } else {
      setEditData({ ...editData, trait_tag: traitString });
    }
    setShowTraitSelector(false);
    setSelectedTraits([]);
  };

  const addNewTrait = () => {
    const trimmedTrait = newTraitText.trim();
    if (!trimmedTrait) return;
    
    const updatedDynamicTraits = { ...dynamicTraits };
    if (!updatedDynamicTraits[newTraitCategory]) {
      updatedDynamicTraits[newTraitCategory] = [];
    }
    
    const allTraitsInCategory = [
      ...traitCategories[newTraitCategory] || [],
      ...updatedDynamicTraits[newTraitCategory] || []
    ];
    
    if (!allTraitsInCategory.includes(trimmedTrait)) {
      updatedDynamicTraits[newTraitCategory] = [
        ...updatedDynamicTraits[newTraitCategory],
        trimmedTrait
      ];
      setDynamicTraits(updatedDynamicTraits);
      // Auto-select the new trait (only if under limit)
      setSelectedTraits(prev => {
        if (prev.length >= 3) {
          toast.error('Maximum 3 traits. Remove one to add this.');
          return prev;
        }
        return [...prev, trimmedTrait];
      });
    }
    
    setNewTraitText('');
    setShowNewTraitInput(false);
  };

  // Export courses to CSV
  const exportToCSV = () => {
    const headers = ['Course Name', 'Description', 'Trait Tags', 'Required Strand', 'Minimum GWA'];
    const csvData = filteredCourses.map(course => [
      course.course_name || '',
      course.description || '',
      course.trait_tag || '',
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
                <th>Trait Tags</th>
                <th>Required Strand</th>
                <th>Min GWA</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCourses.map((course) => (
                <tr key={course.course_id}>
                  <td><strong>{course.course_name}</strong></td>
                  <td style={{maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}} title={course.description}>{course.description || 'N/A'}</td>
                  <td style={{maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}} title={course.trait_tag}>{course.trait_tag || 'N/A'}</td>
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
                    <span className="label">Min GWA:</span>
                    <span className="value">{course.minimum_gwa || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Traits:</span>
                    <span className="value" style={{fontSize: '12px'}}>{course.trait_tag || 'N/A'}</span>
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
                  <label>Course Name *</label>
                  <input type="text" value={formData.course_name} onChange={(e) => setFormData({ ...formData, course_name: e.target.value })} required placeholder="e.g., BS Computer Science" />
                </div>
                <div className="form-group">
                  <label>Description *</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required rows="3" placeholder="Course description..."></textarea>
                </div>
                <div className="form-group">
                  <label>Required Strand</label>
                  <select value={formData.required_strand} onChange={(e) => setFormData({ ...formData, required_strand: e.target.value })}>
                    <option value="">Any Strand</option>
                    <option value="STEM">STEM</option>
                    <option value="HUMSS">HUMSS</option>
                    <option value="ABM">ABM</option>
                    <option value="TVL">TVL</option>
                    <option value="GAS">GAS</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Minimum GWA</label>
                  <input type="number" step="0.01" min="75" max="100" value={formData.minimum_gwa} onChange={(e) => setFormData({ ...formData, minimum_gwa: e.target.value })} placeholder="e.g., 85.00" />
                </div>
                <div className="form-group">
                  <label>Trait Tags * <span style={{fontWeight: 'normal', fontSize: '12px', color: '#94a3b8'}}>(exactly 3 required)</span></label>
                  <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                    <div 
                      style={{
                        flex: 1, 
                        padding: '10px 12px', 
                        border: formData.trait_tag && formData.trait_tag.split(',').filter(t => t.trim()).length === 3 ? '1px solid #10b981' : '1px solid #374151', 
                        borderRadius: '6px', 
                        background: '#1f2937',
                        minHeight: '40px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '6px',
                        alignItems: 'center'
                      }}
                    >
                      {formData.trait_tag ? formData.trait_tag.split(',').map((t, i) => (
                        <span key={i} style={{
                          background: '#8b5cf6',
                          color: '#fff',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>{t.trim()}</span>
                      )) : <span style={{color: '#f59e0b', fontSize: '14px'}}>Select 3 traits</span>}
                    </div>
                    <button 
                      type="button" 
                      onClick={() => openTraitSelector('add')}
                      style={{
                        padding: '10px 16px',
                        background: '#8b5cf6',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <i className="fas fa-tags" style={{marginRight: '6px'}}></i> Select Traits
                    </button>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><i className="fas fa-plus"></i> Add Course</button>
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
                  <label>Course Name *</label>
                  <input 
                    type="text" 
                    value={editData.course_name} 
                    onChange={(e) => setEditData({ ...editData, course_name: e.target.value })} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea 
                    value={editData.description} 
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    rows="3"
                  ></textarea>
                </div>
                <div className="form-group">
                  <label>Required Strand</label>
                  <select 
                    value={editData.required_strand} 
                    onChange={(e) => setEditData({ ...editData, required_strand: e.target.value })}
                  >
                    <option value="">Any Strand</option>
                    <option value="STEM">STEM</option>
                    <option value="HUMSS">HUMSS</option>
                    <option value="ABM">ABM</option>
                    <option value="TVL">TVL</option>
                    <option value="GAS">GAS</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Minimum GWA</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="75"
                    max="100"
                    value={editData.minimum_gwa} 
                    onChange={(e) => setEditData({ ...editData, minimum_gwa: e.target.value })} 
                    placeholder="e.g., 85.00"
                  />
                </div>
                <div className="form-group">
                  <label>Trait Tags * <span style={{fontWeight: 'normal', fontSize: '12px', color: '#94a3b8'}}>(exactly 3 required)</span></label>
                  <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                    <div 
                      style={{
                        flex: 1, 
                        padding: '10px 12px', 
                        border: editData.trait_tag && editData.trait_tag.split(',').filter(t => t.trim()).length === 3 ? '1px solid #10b981' : '1px solid #374151', 
                        borderRadius: '6px', 
                        background: '#1f2937',
                        minHeight: '40px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '6px',
                        alignItems: 'center'
                      }}
                    >
                      {editData.trait_tag ? editData.trait_tag.split(',').map((t, i) => (
                        <span key={i} style={{
                          background: '#8b5cf6',
                          color: '#fff',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>{t.trim()}</span>
                      )) : <span style={{color: '#f59e0b', fontSize: '14px'}}>Select 3 traits</span>}
                    </div>
                    <button 
                      type="button" 
                      onClick={() => openTraitSelector('edit')}
                      style={{
                        padding: '10px 16px',
                        background: '#8b5cf6',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <i className="fas fa-tags" style={{marginRight: '6px'}}></i> Select Traits
                    </button>
                  </div>
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

      {/* Trait Selector Modal */}
      {showTraitSelector && (
        <div className="modal-overlay" onClick={() => setShowTraitSelector(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()} style={{maxHeight: '90vh', overflowY: 'auto', maxWidth: '1000px', width: '90%'}}>
            <div className="modal-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h2><i className="fas fa-tags" style={{marginRight: '10px'}}></i>Select Trait Tags</h2>
              <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                <button 
                  type="button" 
                  onClick={() => setShowNewTraitInput(!showNewTraitInput)}
                  style={{padding: '8px 12px', background: '#10b981', color: '#FFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500'}}
                >
                  <i className="fas fa-plus" style={{marginRight: '6px'}}></i> Add Trait
                </button>
                <button className="close-btn" onClick={() => setShowTraitSelector(false)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
            <div className="modal-body" style={{padding: '20px'}}>
              {/* Selected traits display */}
              <div style={{marginBottom: '20px', padding: '15px', background: '#1e293b', borderRadius: '8px', border: selectedTraits.length === 3 ? '1px solid #10b981' : '1px solid #334155'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                  <div style={{fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#94a3b8'}}>
                    Selected Traits
                  </div>
                  <div style={{
                    fontSize: '13px', 
                    fontWeight: '600', 
                    color: selectedTraits.length === 3 ? '#10b981' : selectedTraits.length > 3 ? '#ef4444' : '#f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    {selectedTraits.length === 3 && <i className="fas fa-check-circle"></i>}
                    {selectedTraits.length}/3 required
                  </div>
                </div>
                <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px', minHeight: '32px'}}>
                  {selectedTraits.length > 0 ? selectedTraits.map((trait, i) => (
                    <span 
                      key={i} 
                      onClick={() => toggleTrait(trait)}
                      style={{
                        background: '#8b5cf6',
                        color: '#fff',
                        padding: '6px 12px',
                        borderRadius: '16px',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {trait}
                      <i className="fas fa-times" style={{fontSize: '10px'}}></i>
                    </span>
                  )) : <span style={{color: '#6b7280', fontSize: '14px'}}>Select exactly 3 traits from the options below</span>}
                </div>
              </div>

              {/* Add new trait section */}
              {showNewTraitInput && (
                <div style={{marginBottom: '20px', padding: '15px', background: '#1e3a5f', borderRadius: '8px', border: '1px solid #3b82f6'}}>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px', alignItems: 'flex-end'}}>
                    <div>
                      <label style={{fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#93c5fd', marginBottom: '6px', display: 'block'}}>Trait Name</label>
                      <input
                        type="text"
                        value={newTraitText}
                        onChange={(e) => setNewTraitText(e.target.value)}
                        placeholder="Enter new trait..."
                        onKeyPress={(e) => e.key === 'Enter' && addNewTrait()}
                        style={{width: '100%', padding: '10px', border: '1px solid #3b82f6', borderRadius: '6px', background: '#1e293b', color: '#fff', fontSize: '14px'}}
                      />
                    </div>
                    <div>
                      <label style={{fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#93c5fd', marginBottom: '6px', display: 'block'}}>Category</label>
                      <select
                        value={newTraitCategory}
                        onChange={(e) => setNewTraitCategory(e.target.value)}
                        style={{width: '100%', padding: '10px', border: '1px solid #3b82f6', borderRadius: '6px', background: '#1e293b', color: '#fff', fontSize: '14px'}}
                      >
                        {Object.keys(traitCategories).map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={addNewTrait}
                      style={{padding: '10px 20px', background: '#3b82f6', color: '#FFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500'}}
                    >
                      <i className="fas fa-plus"></i> Add
                    </button>
                  </div>
                </div>
              )}

              {/* Trait categories */}
              {Object.entries(getMergedTraitCategories()).map(([category, traits]) => (
                <div key={category} style={{marginBottom: '25px'}}>
                  <h3 style={{fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', color: '#8b5cf6', marginBottom: '12px', letterSpacing: '0.5px'}}>
                    {category}
                  </h3>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px'}}>
                    {traits.map(trait => (
                      <button
                        key={trait}
                        type="button"
                        onClick={() => toggleTrait(trait)}
                        style={{
                          padding: '10px 14px',
                          border: selectedTraits.includes(trait) ? '2px solid #8b5cf6' : '2px solid #374151',
                          borderRadius: '6px',
                          background: selectedTraits.includes(trait) ? '#8b5cf6' : '#1e293b',
                          color: selectedTraits.includes(trait) ? '#FFF' : '#e2e8f0',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '500',
                          transition: 'all 0.2s ease',
                          textAlign: 'center'
                        }}
                      >
                        {selectedTraits.includes(trait) && <i className="fas fa-check" style={{marginRight: '6px'}}></i>}
                        {trait}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-footer" style={{justifyContent: 'space-between', alignItems: 'center'}}>
              <div style={{fontSize: '13px', color: selectedTraits.length === 3 ? '#10b981' : '#94a3b8'}}>
                {selectedTraits.length === 3 
                  ? <><i className="fas fa-check-circle" style={{marginRight: '6px'}}></i>Ready to apply</>
                  : `Select ${3 - selectedTraits.length} more trait${3 - selectedTraits.length !== 1 ? 's' : ''}`
                }
              </div>
              <div style={{display: 'flex', gap: '10px'}}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowTraitSelector(false)}>
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={applySelectedTraits}
                  disabled={selectedTraits.length !== 3}
                  style={{
                    background: selectedTraits.length === 3 ? '#8b5cf6' : '#4b5563',
                    cursor: selectedTraits.length === 3 ? 'pointer' : 'not-allowed',
                    opacity: selectedTraits.length === 3 ? 1 : 0.6
                  }}
                >
                  <i className="fas fa-check" style={{marginRight: '6px'}}></i> Apply 3 Traits
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CoursesPage;
