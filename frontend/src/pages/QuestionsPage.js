import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './QuestionsPage.css';
import { useToast } from '../components/Toast';

const API_BASE_URL = 'http://localhost:5000/api';

function QuestionsPage() {
  const toast = useToast();
  const [questions, setQuestionsData] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [testFilter, setTestFilter] = useState('');
  const [tests, setTests] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editModal, setEditModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState('table');
  const [formData, setFormData] = useState({
    test_id: '',
    question_text: '',
    category: ''
  });
  
  const questionCategoryGroups = {
    'Career Discovery': ['Dream Career', 'Work Environment', 'Daily Work', 'Skill Mastery', 'Career Achievement'],
    'Field-Specific Specialization': ['Healthcare Career', 'Healthcare Scenario', 'Technology Career', 'Technology Project', 'Engineering Career', 'Engineering Project', 'Business Career', 'Business Activity', 'Public Service Career', 'Public Service Scenario', 'Education Career', 'Teaching Subject', 'Arts Career', 'Creative Project', 'Maritime Career', 'Agriculture Career', 'Hospitality Career'],
    'Situational & Scenario-Based': ['Situational - Emergency', 'Situational - Teamwork', 'Situational - Accident', 'Situational - Community', 'Situational - Leadership', 'Situational - Disaster Response', 'Situational - School Event', 'Situational - Ethics', 'Situational - Family Business', 'Situational - Mental Health', 'Situational - Technology Crisis', 'Situational - Survival', 'Situational - Business', 'Situational - Environmental', 'Situational - Event Planning', 'Situational - Cyberbullying', 'Situational - Family Health', 'Situational - Technology', 'Situational - Media', 'Situational - Academic Integrity', 'Situational - Financial Decision'],
    'Scale/Rating Questions': ['Scale - Math', 'Scale - Stress', 'Scale - Communication', 'Scale - Physical', 'Scale - Creativity'],
    'Academic Questions': ['Academic - Favorite', 'Academic - Challenge', 'Academic - Study Style'],
    'Skills & Competencies': ['Language Skill', 'Tech Skill', 'Leadership Skill', 'Stress Management', 'Math Skill', 'Science Skill'],
    'Professional & Career Planning': ['Professional Licensure', 'Board Exam Preference', 'Work Location', 'Dream Employer', 'PH Industry', 'Career Priority', 'Salary Importance'],
    'Work & Lifestyle Preferences': ['Lifestyle', 'Career Values', 'Work Lifestyle', 'International Work', 'Work Schedule'],
    'Personality & Interests': ['Personality', 'Interest Type', 'Hobbies', 'Entertainment Preference', 'Role Model', 'Fun - Role', 'Fun - Superpower'],
    'School & Learning': ['School Involvement', 'Project Preference', 'Favorite Subject', 'Challenging Subject'],
    'Specialized Career Tracks': ['Nursing Specialization', 'Programming Specialization', 'Accounting Specialization', 'Criminology Specialization', 'Education Specialization'],
    'Personal Vision & Goals': ['Future Vision', 'Life Legacy', 'Career Fear', 'Decision Making'],
    'Soft Skills & Interpersonal': ['Problem Solving', 'Learning Style', 'Conflict Resolution', 'Team Role', 'Emotional Intelligence'],
    'Community & Social': ['Community Scenario', 'Event Planning'],
    'Miscellaneous': ['Survival Scenario', 'Disaster Response']
  };
  
  const [dynamicCategories, setDynamicCategories] = useState({});
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryParent, setNewCategoryParent] = useState('Career Discovery');
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [options, setOptions] = useState([
    { text: '', trait: '' },
    { text: '', trait: '' },
    { text: '', trait: '' },
    { text: '', trait: '' }
  ]);
  const [availableTraits, setAvailableTraits] = useState([]);
  const [showAddOptions, setShowAddOptions] = useState(false);
  const [showTraitSelector, setShowTraitSelector] = useState(false);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(null);
  const [showNewTraitInput, setShowNewTraitInput] = useState(false);
  const [newTraitText, setNewTraitText] = useState('');
  const [newTraitCategory, setNewTraitCategory] = useState('Skill Traits');
  const [dynamicTraits, setDynamicTraits] = useState({});

  const traitCategories = {
    // Specialized Path Traits (Career-Specific)
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
    // General Trait Categories
    'Helping Others': ['Helping-others', 'Empathetic', 'Patient-focused', 'Service-oriented', 'Compassionate', 'Collaborative', 'Mentoring', 'Nurturing', 'Encouraging', 'Supportive'],
    'Problem Solving': ['Problem-solving', 'Analytical', 'Logical', 'Critical-thinking', 'Investigative', 'Research-oriented', 'Methodical', 'Detail-focused', 'Strategic', 'Systematic'],
    'Creative': ['Creative-expression', 'Artistic-passion', 'Innovative', 'Visual-learner', 'Aesthetic-sense', 'Digital-art', 'Expressive', 'Imaginative', 'Design-thinking', 'Experimental'],
    'Leadership': ['Leading-teams', 'Leadership', 'Ambitious', 'Strategic', 'Big-picture', 'Confident', 'Decisive', 'Motivational', 'Organized', 'Collaborative'],
    'Technical': ['Tech-savvy', 'Hands-on', 'Technical', 'Laboratory', 'Precision-oriented', 'Algorithm-focused', 'Mechanical-minded', 'Circuit-design', 'Practical', 'Detail-focused'],
    'Healthcare': ['Patient-focused', 'Clinical-setting', 'Empathetic', 'Helping-others', 'Health-conscious', 'Compassionate', 'Resilient', 'Crisis-management', 'Service-oriented'],
    'Business': ['Business-minded', 'Analytical', 'Strategic', 'Ambitious', 'Risk-taking', 'Quantitative', 'Leadership', 'Organized', 'Persuasive', 'Negotiation-skills'],
    'Social': ['Extroverted', 'Collaborative', 'Social', 'Empathetic', 'Team-centric', 'Articulate', 'Persuasive', 'Cultural-awareness', 'Mentoring', 'Community-focused'],
    'Research': ['Research-oriented', 'Analytical', 'Theoretical', 'Investigative', 'Independent', 'Detail-focused', 'Methodical', 'Scientific-thinking', 'Observational', 'Contemplative'],
    'Outdoor': ['Field-work', 'Outdoor-enthusiast', 'Active', 'Adventurous', 'Nature-focused', 'Physical-fitness', 'Exploratory', 'Hands-on', 'Practical']
  };

  useEffect(() => {
    fetchQuestions();
    fetchTests();
    fetchAvailableTraits();
  }, [page, pageSize]);

  useEffect(() => {
    filterQuestions();
  }, [questions, search, testFilter]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/tests/questions/list/all`, {
        params: {
          page: page,
          limit: pageSize,
          test_id: testFilter || undefined
        }
      });
      setQuestionsData(response.data.questions || []);
      setTotalPages(response.data.pagination.pages || 1);
    } catch (err) {
      setError('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const fetchTests = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/tests?limit=100`);
      setTests(response.data.tests || []);
    } catch (err) {
      console.error('Failed to load tests');
    }
  };

  const fetchAvailableTraits = async () => {
    try {
      // Traits are now organized in categories above
      setAvailableTraits(true);
    } catch (err) {
      console.error('Failed to load traits');
    }
  };

  const filterQuestions = () => {
    let filtered = questions;
    if (search) {
      filtered = filtered.filter(q =>
        q.question_text.toLowerCase().includes(search.toLowerCase()) ||
        q.test_name.toLowerCase().includes(search.toLowerCase())
      );
    }
    setFilteredQuestions(filtered);
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    
    try {
      setError('');
      
      // Validate that at least one option has text
      const filledOptions = options.filter(o => o.text.trim());
      if (filledOptions.length === 0) {
        setError('Please add at least one option');
        return;
      }

      // Find Smart Assessment (Adaptive) test ID
      const smartAssessmentTest = tests.find(t => t.test_name === 'Smart Assessment (Adaptive)');
      if (!smartAssessmentTest) {
        setError('Smart Assessment (Adaptive) test not found');
        return;
      }

      // First create the question
      const questionResponse = await axios.post(`${API_BASE_URL}/tests/questions`, {
        test_id: smartAssessmentTest.test_id,
        question_text: formData.question_text,
        question_order: 1,
        question_type: 'standard',
        category: formData.category || null
      });

      const questionId = questionResponse.data.question_id;
      if (!questionId) {
        throw new Error('No question ID returned from server');
      }

      // Then add all options
      let optionCount = 0;
      for (let i = 0; i < options.length; i++) {
        const option = options[i];
        if (option.text.trim()) {
          await axios.post(`${API_BASE_URL}/tests/questions/${questionId}/options`, {
            option_text: option.text.trim(),
            trait: option.trait || null
          });
          optionCount++;
        }
      }

      if (optionCount === 0) {
        setError('Failed to add options');
        return;
      }

      // Reset form on success
      setFormData({ test_id: '', question_text: '', category: '' });
      setOptions([
        { text: '', trait: '' },
        { text: '', trait: '' },
        { text: '', trait: '' },
        { text: '', trait: '' }
      ]);
      setShowModal(false);
      setError('');
      fetchQuestions();
      toast.success('Question created successfully!');
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to add question';
      setError(errorMsg);
      toast.error(errorMsg);
      console.error('Error adding question:', err);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('Are you sure you want to delete this question and all its options?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/tests/questions/${questionId}`);
      fetchQuestions();
      setShowDetailModal(false);
    } catch (err) {
      setError('Failed to delete question');
    }
  };

  // Open delete confirmation modal
  const handleDeleteClick = (question) => {
    setDeleteTarget(question);
    setDeleteModal(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await axios.delete(`${API_BASE_URL}/tests/questions/${deleteTarget.question_id}`);
      setDeleteModal(false);
      setDeleteTarget(null);
      setShowDetailModal(false);
      fetchQuestions();
      toast.success('Question deleted successfully!');
    } catch (err) {
      toast.error('Failed to delete question');
      setDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  // Open edit modal
  const handleEditClick = (question) => {
    setEditData({
      question_id: question.question_id,
      question_text: question.question_text || '',
      question_type: question.question_type || 'multiple_choice',
      question_order: question.question_order || 1,
    });
    setEditModal(true);
  };

  // Submit edit
  const handleEditQuestion = async () => {
    if (!editData) return;
    try {
      await axios.put(`${API_BASE_URL}/tests/questions/${editData.question_id}`, {
        question_text: editData.question_text,
        question_type: editData.question_type,
        question_order: editData.question_order,
      });
      setEditModal(false);
      setEditData(null);
      fetchQuestions();
      toast.success('Question updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update question');
    }
  };

  const addOption = () => {
    setOptions([...options, { text: '', trait: '' }]);
  };

  const removeOption = (index) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index, field, value) => {
    const newOptions = [...options];
    newOptions[index][field] = value;
    setOptions(newOptions);
  };

  const openTraitSelector = (index) => {
    setSelectedOptionIndex(index);
    setShowTraitSelector(true);
  };

  const selectTrait = (trait) => {
    if (selectedOptionIndex !== null) {
      updateOption(selectedOptionIndex, 'trait', trait);
      setShowTraitSelector(false);
      setSelectedOptionIndex(null);
    }
  };

  const addNewTrait = () => {
    const trimmedTrait = newTraitText.trim();
    if (!trimmedTrait) return;
    
    // Add to dynamic traits state
    const updatedDynamicTraits = { ...dynamicTraits };
    if (!updatedDynamicTraits[newTraitCategory]) {
      updatedDynamicTraits[newTraitCategory] = [];
    }
    
    // Only add if it doesn't already exist
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
    }
    
    setNewTraitText('');
    setShowNewTraitInput(false);
  };

  // Merge hardcoded and dynamic traits
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

  const handleViewDetails = async (question) => {
    setSelectedQuestion(question);
    setShowDetailModal(true);
  };

  const getMergedCategories = () => {
    const merged = { ...questionCategoryGroups };
    Object.entries(dynamicCategories).forEach(([groupName, categories]) => {
      if (!merged[groupName]) {
        merged[groupName] = [];
      }
      merged[groupName] = [...new Set([...merged[groupName], ...categories])];
    });
    return merged;
  };

  const addNewCategory = () => {
    const trimmedCategory = newCategoryName.trim();
    if (!trimmedCategory) return;
    
    const updatedDynamicCategories = { ...dynamicCategories };
    if (!updatedDynamicCategories[newCategoryParent]) {
      updatedDynamicCategories[newCategoryParent] = [];
    }
    
    const allInParent = [
      ...questionCategoryGroups[newCategoryParent] || [],
      ...updatedDynamicCategories[newCategoryParent] || []
    ];
    
    if (!allInParent.includes(trimmedCategory)) {
      updatedDynamicCategories[newCategoryParent] = [
        ...updatedDynamicCategories[newCategoryParent],
        trimmedCategory
      ];
      setDynamicCategories(updatedDynamicCategories);
    }
    
    setNewCategoryName('');
    setShowNewCategoryInput(false);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1><i className="fas fa-question-circle"></i> Questions Management</h1>
        <p>Manage test questions and answers</p>
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
          placeholder="Search questions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
        <select
          value={testFilter}
          onChange={(e) => { setTestFilter(e.target.value); setPage(1); }}
          className="test-select"
        >
          <option value="">All Tests</option>
          {tests.map(test => (
            <option key={test.test_id} value={test.test_id}>{test.test_name}</option>
          ))}
        </select>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <i className="fas fa-plus"></i> Add Question
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
          >
            <i className="fas fa-table"></i> Table
          </button>
          <button 
            className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('grid')}
          >
            <i className="fas fa-th"></i> Grid
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-center">
          <div className="spinner"></div>
          <p>Loading questions...</p>
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-inbox"></i>
          <p>No questions found</p>
        </div>
      ) : viewMode === 'table' ? (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Test Name</th>
                <th>Question</th>
                <th>Type</th>
                <th>Options</th>
                <th>Order</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuestions.map((question) => (
                <tr key={question.question_id}>
                  <td><span className="badge">{question.test_name}</span></td>
                  <td className="question-text">{question.question_text}</td>
                  <td><span className="type-badge">{question.question_type}</span></td>
                  <td className="text-center">{question.option_count}</td>
                  <td className="text-center">{question.question_order}</td>
                  <td className="actions">
                    <button 
                      className="btn btn-sm btn-info"
                      onClick={() => handleViewDetails(question)}
                    >
                      <i className="fas fa-eye"></i>
                    </button>
                    <button 
                      className="btn btn-sm btn-warning"
                      onClick={() => handleEditClick(question)}
                      title="Edit Question"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeleteClick(question)}
                      title="Delete Question"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="questions-grid">
          {filteredQuestions.map((question) => (
            <div key={question.question_id} className="question-card">
              <div className="question-card-header">
                <span className="badge">{question.test_name}</span>
                <span className="type-badge">{question.question_type}</span>
              </div>
              <div className="question-card-body">
                <p className="question-text">{question.question_text}</p>
                <div className="question-meta">
                  <span>Q {question.question_order}</span>
                  <span>{question.option_count} options</span>
                </div>
              </div>
              <div className="question-card-footer">
                <button 
                  className="btn btn-sm btn-info"
                  onClick={() => handleViewDetails(question)}
                >
                  <i className="fas fa-eye"></i> View
                </button>
                <button 
                  className="btn btn-sm btn-warning"
                  onClick={() => handleEditClick(question)}
                >
                  <i className="fas fa-edit"></i> Edit
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDeleteClick(question)}
                >
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
            First
          </button>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            Previous
          </button>
          <span style={{padding: '0 10px'}}>Page {page} of {totalPages}</span>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
          >
            Next
          </button>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages}
          >
            Last
          </button>
        </div>
      )}

      {showDetailModal && selectedQuestion && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><i className="fas fa-question-circle"></i> Question Details</h2>
              <button className="close-btn" onClick={() => setShowDetailModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-section">
                <h3>Question</h3>
                <p className="question-display">{selectedQuestion.question_text}</p>
              </div>

              <div className="detail-section">
                <h3>Properties</h3>
                <div className="properties-grid">
                  <div className="property">
                    <span className="label">Test:</span>
                    <span className="value">{selectedQuestion.test_name}</span>
                  </div>
                  <div className="property">
                    <span className="label">Type:</span>
                    <span className="value"><span className="type-badge">{selectedQuestion.question_type}</span></span>
                  </div>
                  <div className="property">
                    <span className="label">Order:</span>
                    <span className="value">Question {selectedQuestion.question_order}</span>
                  </div>
                  <div className="property">
                    <span className="label">Options:</span>
                    <span className="value">{selectedQuestion.option_count} options</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-danger"
                onClick={() => handleDeleteQuestion(selectedQuestion.question_id)}
              >
                <i className="fas fa-trash"></i> Delete Question
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => {setShowModal(false); setError('');}}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{maxWidth: '900px', maxHeight: '95vh', overflowY: 'auto'}}>
            <div className="modal-header">
              <h2><i className="fas fa-plus-circle"></i> Add New Question</h2>
              <button className="close-btn" onClick={() => {setShowModal(false); setError('');}}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleAddQuestion}>
              <div className="modal-body" style={{padding: '30px'}}>
                {error && (
                  <div style={{padding: '12px', background: '#C97A6F', color: '#FFF', borderRadius: '6px', marginBottom: '20px', fontSize: '14px'}}>
                    <i className="fas fa-exclamation-circle"></i> {error}
                  </div>
                )}

                <div className="form-group" style={{marginBottom: '25px'}}>
                  <label style={{fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: '#5A4A3A', letterSpacing: '0.5px', marginBottom: '12px'}}>Smart Assessment (Adaptive)</label>
                  <input
                    type="text"
                    value="Smart Assessment (Adaptive)"
                    disabled
                    style={{opacity: 0.6, padding: '12px', background: '#FAF5F0', border: '1px solid #E8D5C4', borderRadius: '6px', color: '#5A4A3A'}}
                  />
                  <input
                    type="hidden"
                    value={tests.find(t => t.test_name === 'Smart Assessment (Adaptive)')?.test_id || ''}
                    onChange={(e) => setFormData({ ...formData, test_id: parseInt(e.target.value) })}
                  />
                </div>
                <div className="form-group" style={{marginBottom: '30px'}}>
                  <label style={{fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: '#5A4A3A', letterSpacing: '0.5px', marginBottom: '12px', display: 'block'}}>Question Category</label>
                  <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                    <button
                      type="button"
                      onClick={() => setShowCategorySelector(true)}
                      style={{flex: 1, padding: '12px', border: '1px solid #E8D5C4', borderRadius: '6px', background: '#FAF5F0', color: '#5A4A3A', fontFamily: 'inherit', fontSize: '14px', textAlign: 'left', cursor: 'pointer'}}
                    >
                      {formData.category || 'Select a category...'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewCategoryInput(!showNewCategoryInput)}
                      style={{padding: '12px 16px', background: '#90B58D', color: '#FFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', whiteSpace: 'nowrap'}}
                    >
                      <i className="fas fa-plus" style={{marginRight: '6px'}}></i> Add Category
                    </button>
                  </div>
                  {showNewCategoryInput && (
                    <div style={{marginTop: '12px', padding: '12px', background: '#FAF5F0', borderRadius: '6px', border: '1px solid #E8D5C4', display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '10px', alignItems: 'flex-end'}}>
                      <div>
                        <label style={{fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#5A4A3A', marginBottom: '6px', display: 'block'}}>Category Name</label>
                        <input
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Enter new category..."
                          onKeyPress={(e) => e.key === 'Enter' && addNewCategory()}
                          style={{width: '100%', padding: '8px', border: '1px solid #E8D5C4', borderRadius: '4px', background: '#FFF', color: '#5A4A3A', fontSize: '13px'}}
                        />
                      </div>
                      <div>
                        <label style={{fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#5A4A3A', marginBottom: '6px', display: 'block'}}>Parent Group</label>
                        <select
                          value={newCategoryParent}
                          onChange={(e) => setNewCategoryParent(e.target.value)}
                          style={{width: '100%', padding: '8px', border: '1px solid #E8D5C4', borderRadius: '4px', background: '#FFF', color: '#5A4A3A', fontSize: '13px'}}
                        >
                          {Object.keys(getMergedCategories()).sort().map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={addNewCategory}
                        style={{padding: '8px 12px', background: '#C97A6F', color: '#FFF', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '500'}}
                      >
                        <i className="fas fa-plus"></i> Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {setShowNewCategoryInput(false); setNewCategoryName('');}}
                        style={{padding: '8px 12px', background: '#999', color: '#FFF', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '500'}}
                      >
                        <i className="fas fa-times"></i> Cancel
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="form-group" style={{marginBottom: '30px'}}>
                  <label style={{fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: '#5A4A3A', letterSpacing: '0.5px', marginBottom: '12px', display: 'block'}}>Question Text</label>
                  <textarea
                    value={formData.question_text}
                    onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                    placeholder="Enter the question..."
                    required
                    rows="5"
                    style={{width: '100%', padding: '12px', border: '1px solid #E8D5C4', borderRadius: '6px', background: '#FAF5F0', color: '#5A4A3A', fontFamily: 'inherit', fontSize: '14px', resize: 'vertical'}}
                  ></textarea>
                </div>

                <div className="form-group" style={{marginBottom: '20px'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                    <label style={{fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: '#5A4A3A', letterSpacing: '0.5px', marginBottom: 0}}>Options</label>
                    <button 
                      type="button" 
                      className="btn btn-sm btn-success"
                      onClick={addOption}
                      style={{marginBottom: 0, background: '#90B58D', padding: '8px 16px'}}
                    >
                      <i className="fas fa-plus"></i> Add Option
                    </button>
                  </div>
                  <div className="options-list" style={{maxHeight: '350px', overflowY: 'auto'}}>
                    {options.length === 0 ? (
                      <p style={{color: '#999', textAlign: 'center', padding: '20px 0', fontSize: '14px'}}>No options added yet.</p>
                    ) : (
                      options.map((option, index) => (
                        <div key={index} style={{marginBottom: '10px', display: 'flex', gap: '10px', alignItems: 'flex-start'}}>
                          <div style={{flex: 1}}>
                            <textarea
                              placeholder={`Option ${index + 1}`}
                              value={option.text}
                              onChange={(e) => updateOption(index, 'text', e.target.value)}
                              rows="2"
                              style={{width: '100%', padding: '14px 16px', border: '1px solid #2A2A3E', borderRadius: '8px', background: '#1F1F2E', color: '#FFF', fontSize: '14px', fontFamily: 'inherit', resize: 'none', transition: 'all 0.2s ease'}}
                              onFocus={(e) => e.target.style.borderColor = '#C97A6F'}
                              onBlur={(e) => e.target.style.borderColor = '#2A2A3E'}
                            />
                          </div>
                          <div style={{display: 'flex', gap: '8px', paddingTop: '0px'}}>
                            <button
                              type="button"
                              onClick={() => openTraitSelector(index)}
                              style={{padding: '14px 16px', border: '1px solid #2A2A3E', borderRadius: '8px', background: option.trait ? '#C97A6F' : '#2A2A3E', color: '#FFF', cursor: 'pointer', fontSize: '12px', fontWeight: '500', transition: 'all 0.2s ease', whiteSpace: 'nowrap', minWidth: '120px', textAlign: 'center'}}
                              onMouseEnter={(e) => {
                                e.target.style.borderColor = '#C97A6F';
                                if (!option.trait) {
                                  e.target.style.background = '#3A3A4E';
                                } else {
                                  e.target.style.background = '#B8634F';
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.borderColor = '#2A2A3E';
                                if (!option.trait) {
                                  e.target.style.background = '#2A2A3E';
                                } else {
                                  e.target.style.background = '#C97A6F';
                                }
                              }}
                            >
                              <i className="fas fa-tag" style={{marginRight: '6px'}}></i>
                              {option.trait || 'Trait'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={() => removeOption(index)}
                              style={{marginBottom: 0, padding: '14px 12px', borderRadius: '8px'}}
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{padding: '20px 30px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #E8D5C4'}}>
                <button type="button" className="btn btn-secondary" onClick={() => {setShowModal(false); setError(''); setFormData({test_id: '', question_text: '', category: ''}); setOptions([{ text: '', trait: '' }, { text: '', trait: '' }, { text: '', trait: '' }, { text: '', trait: '' }]);}}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={!formData.question_text.trim() || options.filter(o => o.text.trim()).length === 0} style={{opacity: !formData.question_text.trim() || options.filter(o => o.text.trim()).length === 0 ? 0.5 : 1, cursor: !formData.question_text.trim() || options.filter(o => o.text.trim()).length === 0 ? 'not-allowed' : 'pointer'}}>
                  <i className="fas fa-check"></i> Add Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCategorySelector && (
        <div className="modal-overlay" onClick={() => setShowCategorySelector(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()} style={{maxHeight: '90vh', overflowY: 'auto', maxWidth: '1000px', width: '90%'}}>
            <div className="modal-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h2>Select Category</h2>
              <button className="close-btn" onClick={() => setShowCategorySelector(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body" style={{padding: '30px'}}>
              {Object.entries(getMergedCategories()).map(([group, categories]) => (
                <div key={group} style={{marginBottom: '30px'}}>
                  <h3 style={{fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', color: '#C97A6F', marginBottom: '15px', letterSpacing: '0.5px'}}>
                    {group}
                  </h3>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px'}}>
                    {categories.map(category => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, category });
                          setShowCategorySelector(false);
                        }}
                        style={{
                          padding: '12px 15px',
                          border: '2px solid #E8D5C4',
                          borderRadius: '6px',
                          background: formData.category === category ? '#C97A6F' : '#FAF5F0',
                          color: formData.category === category ? '#FFF' : '#5A4A3A',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '500',
                          transition: 'all 0.2s ease',
                          textAlign: 'center'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = formData.category === category ? '#B8634F' : '#F5E6D3';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = formData.category === category ? '#C97A6F' : '#FAF5F0';
                        }}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowCategorySelector(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showTraitSelector && (
        <div className="modal-overlay" onClick={() => setShowTraitSelector(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()} style={{maxHeight: '90vh', overflowY: 'auto', maxWidth: '1000px', width: '90%'}}>
            <div className="modal-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h2>Select Trait</h2>
              <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                <button 
                  type="button" 
                  onClick={() => setShowNewTraitInput(!showNewTraitInput)}
                  style={{padding: '8px 12px', background: '#90B58D', color: '#FFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500'}}
                >
                  <i className="fas fa-plus" style={{marginRight: '6px'}}></i> Add Trait
                </button>
                <button className="close-btn" onClick={() => setShowTraitSelector(false)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
            <div className="modal-body" style={{padding: '30px'}}>
              {showNewTraitInput && (
                <div style={{marginBottom: '25px', padding: '20px', background: '#FAF5F0', borderRadius: '8px', border: '1px solid #E8D5C4'}}>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px', alignItems: 'flex-end'}}>
                    <div>
                      <label style={{fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: '#5A4A3A', marginBottom: '6px', display: 'block'}}>Trait Name</label>
                      <input
                        type="text"
                        value={newTraitText}
                        onChange={(e) => setNewTraitText(e.target.value)}
                        placeholder="Enter new trait..."
                        onKeyPress={(e) => e.key === 'Enter' && addNewTrait()}
                        style={{width: '100%', padding: '10px', border: '1px solid #E8D5C4', borderRadius: '6px', background: '#FFF', color: '#5A4A3A', fontSize: '14px'}}
                      />
                    </div>
                    <div>
                      <label style={{fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: '#5A4A3A', marginBottom: '6px', display: 'block'}}>Category</label>
                      <select
                        value={newTraitCategory}
                        onChange={(e) => setNewTraitCategory(e.target.value)}
                        style={{width: '100%', padding: '10px', border: '1px solid #E8D5C4', borderRadius: '6px', background: '#FFF', color: '#5A4A3A', fontSize: '14px'}}
                      >
                        {Object.keys(traitCategories).map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={addNewTrait}
                      style={{padding: '10px 20px', background: '#C97A6F', color: '#FFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500'}}
                    >
                      <i className="fas fa-plus"></i> Add
                    </button>
                  </div>
                </div>
              )}
              {Object.entries(getMergedTraitCategories()).map(([category, traits]) => (
                <div key={category} style={{marginBottom: '30px'}}>
                  <h3 style={{fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', color: '#C97A6F', marginBottom: '15px', letterSpacing: '0.5px'}}>
                    {category}
                  </h3>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px'}}>
                    {traits.map(trait => (
                      <button
                        key={trait}
                        type="button"
                        onClick={() => selectTrait(trait)}
                        style={{
                          padding: '12px 15px',
                          border: '2px solid #E8D5C4',
                          borderRadius: '6px',
                          background: options[selectedOptionIndex]?.trait === trait ? '#C97A6F' : '#FAF5F0',
                          color: options[selectedOptionIndex]?.trait === trait ? '#FFF' : '#5A4A3A',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '500',
                          transition: 'all 0.2s ease',
                          textAlign: 'center'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = options[selectedOptionIndex]?.trait === trait ? '#B8634F' : '#F5E6D3';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = options[selectedOptionIndex]?.trait === trait ? '#C97A6F' : '#FAF5F0';
                        }}
                      >
                        {trait}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowTraitSelector(false)}>
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
              <i className="fas fa-exclamation-triangle" style={{ fontSize: '30px', color: 'white' }}></i>
            </div>
            <h3 style={{ color: '#fff', marginBottom: '15px', fontSize: '22px' }}>Delete Question?</h3>
            <p style={{ color: '#a0a0a0', marginBottom: '25px', lineHeight: '1.6' }}>
              Are you sure you want to delete this question?<br />
              <span style={{ color: '#ff6b6b', fontWeight: '500' }}>"{deleteTarget.question_text?.substring(0, 50)}..."</span><br />
              <small style={{ color: '#888' }}>This action cannot be undone.</small>
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
                Delete Question
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Question Modal */}
      {editModal && editData && (
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
          <div className="edit-modal" style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            borderRadius: '16px',
            padding: '30px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <h3 style={{ color: '#fff', margin: 0, fontSize: '22px' }}>
                <i className="fas fa-edit" style={{ marginRight: '10px', color: '#4CAF50' }}></i>
                Edit Question
              </h3>
              <button
                onClick={() => {
                  setEditModal(false);
                  setEditData(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#a0a0a0',
                  cursor: 'pointer',
                  fontSize: '20px'
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              handleEditQuestion();
            }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#a0a0a0', marginBottom: '8px', fontSize: '14px' }}>
                  Question Text
                </label>
                <textarea
                  value={editData.question_text || ''}
                  onChange={(e) => setEditData({ ...editData, question_text: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                    fontSize: '14px',
                    minHeight: '100px',
                    resize: 'vertical'
                  }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', color: '#a0a0a0', marginBottom: '8px', fontSize: '14px' }}>
                    Question Type
                  </label>
                  <select
                    value={editData.question_type || 'multiple_choice'}
                    onChange={(e) => setEditData({ ...editData, question_type: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: '#fff',
                      fontSize: '14px'
                    }}
                  >
                    <option value="multiple_choice" style={{ background: '#1a1a2e' }}>Multiple Choice</option>
                    <option value="likert" style={{ background: '#1a1a2e' }}>Likert Scale</option>
                    <option value="true_false" style={{ background: '#1a1a2e' }}>True/False</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', color: '#a0a0a0', marginBottom: '8px', fontSize: '14px' }}>
                    Question Order
                  </label>
                  <input
                    type="number"
                    value={editData.question_order || 1}
                    onChange={(e) => setEditData({ ...editData, question_order: parseInt(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: '#fff',
                      fontSize: '14px'
                    }}
                    min="1"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end', marginTop: '25px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setEditModal(false);
                    setEditData(null);
                  }}
                  style={{
                    padding: '12px 25px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'transparent',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '12px 25px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    boxShadow: '0 4px 15px rgba(76, 175, 80, 0.4)'
                  }}
                >
                  <i className="fas fa-save" style={{ marginRight: '8px' }}></i>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuestionsPage;
