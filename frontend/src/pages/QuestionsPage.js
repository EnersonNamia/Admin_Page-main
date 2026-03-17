import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './QuestionsPage.css';
import { useToast } from '../components/Toast';
import cacheManager, { CACHE_TTL } from '../utils/cache';

const API_BASE_URL = 'http://localhost:5000/api';

// CoursePro production backend URL - for cache invalidation
const PRODUCTION_API_URL = process.env.REACT_APP_PRODUCTION_API_URL || '';

// Helper function to invalidate production cache after question/option changes
const invalidateProductionCache = async () => {
  if (!PRODUCTION_API_URL) {
    console.log('[Cache] No production URL configured, skipping production cache invalidation');
    return;
  }
  try {
    await axios.post(`${PRODUCTION_API_URL}/admin/cache/invalidate`, {}, {
      timeout: 5000 // 5 second timeout
    });
    console.log('[Cache] Production cache invalidated successfully');
  } catch (err) {
    console.warn('[Cache] Failed to invalidate production cache:', err.message);
    // Don't throw - this is a best-effort operation
  }
};

function QuestionsPage() {
  const toast = useToast();
  const [questions, setQuestionsData] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [testFilter, setTestFilter] = useState('');
  const [tests, setTests] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editModal, setEditModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [editOptions, setEditOptions] = useState([]);
  const [editOptionsLoading, setEditOptionsLoading] = useState(false);
  const [showEditTraitSelector, setShowEditTraitSelector] = useState(false);
  const [editSelectedOptionIndex, setEditSelectedOptionIndex] = useState(null);
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
  const [showEditCategorySelector, setShowEditCategorySelector] = useState(false);
  const [options, setOptions] = useState([
    { text: '', trait: [] },
    { text: '', trait: [] },
    { text: '', trait: [] },
    { text: '', trait: [] }
  ]);
  // eslint-disable-next-line no-unused-vars
  const [availableTraits, setAvailableTraits] = useState([]);
  // eslint-disable-next-line no-unused-vars
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

  // Debounce search input - wait 300ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 when search changes
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchQuestions();
    fetchTests();
    fetchAvailableTraits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, debouncedSearch, testFilter]);

  useEffect(() => {
    // Server-side filtering is now used, just pass through
    setFilteredQuestions(questions);
  }, [questions]);

  const fetchQuestions = async (forceRefresh = false) => {
    const cacheKey = `questions_${page}_${pageSize}_${testFilter}_${debouncedSearch}`;
    try {
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cachedData = cacheManager.get(cacheKey);
        if (cachedData) {
          setQuestionsData(cachedData.questions);
          setTotalPages(cachedData.totalPages);
          setLoading(false);
          return;
        }
      }

      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/tests/questions/list/all`, {
        params: {
          page: page,
          limit: pageSize,
          test_id: testFilter || undefined,
          search: debouncedSearch || undefined  // Server-side search
        }
      });
      console.log('Fetched questions:', response.data);
      const questionsData = response.data.questions || [];
      const pages = response.data.pagination.pages || 1;
      
      // Cache the result
      cacheManager.set(cacheKey, { questions: questionsData, totalPages: pages }, CACHE_TTL.SHORT);
      
      setQuestionsData(questionsData);
      setTotalPages(pages);
    } catch (err) {
      setError('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const fetchTests = async () => {
    const cacheKey = 'questions_page_tests';
    try {
      // Check cache first
      const cachedTests = cacheManager.get(cacheKey);
      if (cachedTests) {
        setTests(cachedTests);
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/tests?limit=100`);
      const testsData = response.data.tests || [];
      
      // Cache the tests
      cacheManager.set(cacheKey, testsData, CACHE_TTL.MEDIUM);
      setTests(testsData);
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



  const handleAddQuestion = async (e) => {
    e.preventDefault();
    
    try {
      setError('');
      
      // Validate that at least one category is selected
      if (!formData.category || !formData.category.trim()) {
        setError('Please select at least one question category');
        return;
      }

      // Validate that all 4 options have text
      const filledOptions = options.filter(o => o.text.trim());
      if (filledOptions.length < 4) {
        setError('Please fill in all 4 options');
        return;
      }

      // Validate that all filled options have traits
      const optionsWithoutTraits = filledOptions.filter(o => !o.trait || o.trait.length === 0);
      if (optionsWithoutTraits.length > 0) {
        setError('Please assign at least one trait to each option');
        return;
      }

      // Find Career Assessment test ID (test_id=1)
      const careerAssessmentTest = tests.find(t => t.test_name === 'Career Assessment');
      if (!careerAssessmentTest) {
        setError('Career Assessment test not found');
        return;
      }

      // First create the question
      const questionResponse = await axios.post(`${API_BASE_URL}/tests/questions`, {
        test_id: careerAssessmentTest.test_id,
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
            trait: Array.isArray(option.trait) ? option.trait.join(',') : (option.trait || null)
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
        { text: '', trait: [] },
        { text: '', trait: [] },
        { text: '', trait: [] },
        { text: '', trait: [] }
      ]);
      setShowModal(false);
      setError('');
      cacheManager.invalidate(/^questions_/);
      fetchQuestions(true);
      await invalidateProductionCache(); // Notify CoursePro to refresh
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
      cacheManager.invalidate(/^questions_/);
      fetchQuestions(true);
      await invalidateProductionCache(); // Notify CoursePro to refresh
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
      cacheManager.invalidate(/^questions_/);
      fetchQuestions(true);
      await invalidateProductionCache(); // Notify CoursePro to refresh
      toast.success('Question deleted successfully!');
    } catch (err) {
      toast.error('Failed to delete question');
      setDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  // Open edit modal
  const handleEditClick = async (question) => {
    setEditData({
      question_id: question.question_id,
      question_text: question.question_text || '',
      question_order: question.question_order || 1,
      category: question.category || '',
      test_id: question.test_id,
    });
    setEditOptions([]);
    setEditOptionsLoading(true);
    setEditModal(true);
    
    // Fetch options for this question
    try {
      const response = await axios.get(`${API_BASE_URL}/tests/questions/${question.question_id}/options`);
      // Convert trait_tag from comma-separated string to array for multi-trait support
      const optionsWithTraitArrays = (response.data.options || []).map(opt => ({
        ...opt,
        trait_tag: opt.trait_tag ? opt.trait_tag.split(',').map(t => t.trim()).filter(Boolean) : []
      }));
      setEditOptions(optionsWithTraitArrays);
    } catch (err) {
      console.error('Failed to fetch options:', err);
      toast.error('Failed to load question options');
    } finally {
      setEditOptionsLoading(false);
    }
  };

  // Update a single edit option
  const updateEditOption = (index, field, value) => {
    setEditOptions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Add new option in edit mode
  const addEditOption = () => {
    setEditOptions([...editOptions, { option_id: `new_${Date.now()}`, option_text: '', trait_tag: [], isNew: true }]);
  };

  // Remove option in edit mode
  const removeEditOption = async (index) => {
    const option = editOptions[index];
    if (option.isNew) {
      // Just remove from local state
      setEditOptions(editOptions.filter((_, i) => i !== index));
    } else {
      // Delete from database
      try {
        await axios.delete(`${API_BASE_URL}/tests/options/${option.option_id}`);
        setEditOptions(editOptions.filter((_, i) => i !== index));
        await invalidateProductionCache(); // Notify CoursePro to refresh
        toast.success('Option deleted');
      } catch (err) {
        toast.error('Failed to delete option');
      }
    }
  };

  // Submit edit
  const handleEditQuestion = async () => {
    if (!editData) return;
    try {
      // Update question text, order, and category
      const updatePayload = {
        question_text: editData.question_text,
        question_order: editData.question_order,
        category: editData.category,
      };
      console.log('Updating question with payload:', updatePayload);
      await axios.put(`${API_BASE_URL}/tests/questions/${editData.question_id}`, updatePayload);
      
      // Update existing options and create new ones
      let newOptionsCreated = 0;
      let optionsUpdated = 0;
      
      for (const option of editOptions) {
        const traitValue = Array.isArray(option.trait_tag) ? option.trait_tag.join(',') : (option.trait_tag || '');
        if (option.isNew) {
          // Create new option
          console.log('Creating new option:', option);
          const response = await axios.post(`${API_BASE_URL}/tests/questions/${editData.question_id}/options`, {
            option_text: option.option_text,
            trait: traitValue || null
          });
          console.log('New option created:', response.data);
          newOptionsCreated++;
        } else {
          // Update existing option
          await axios.put(`${API_BASE_URL}/tests/options/${option.option_id}`, {
            option_text: option.option_text,
            trait_tag: traitValue || null
          });
          optionsUpdated++;
        }
      }
      
      console.log(`Question updated. Options: ${optionsUpdated} updated, ${newOptionsCreated} created`);
      setEditModal(false);
      setEditData(null);
      setEditOptions([]);
      cacheManager.invalidate(/^questions_/);
      fetchQuestions(true);
      await invalidateProductionCache(); // Notify CoursePro to refresh
      toast.success(`Question updated! ${newOptionsCreated > 0 ? `${newOptionsCreated} new option(s) added.` : ''}`);
    } catch (err) {
      console.error('Update failed:', err.response?.data || err.message);
      toast.error(err.response?.data?.detail || 'Failed to update question');
    }
  };

  const addOption = () => {
    setOptions([...options, { text: '', trait: [] }]);
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
      const currentTraits = options[selectedOptionIndex]?.trait || [];
      const traitArray = Array.isArray(currentTraits) ? currentTraits : (currentTraits ? currentTraits.split(',').filter(Boolean) : []);
      const updatedTraits = traitArray.includes(trait)
        ? traitArray.filter(t => t !== trait)
        : [...traitArray, trait];
      updateOption(selectedOptionIndex, 'trait', updatedTraits);
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
                  <label style={{fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: '#5A4A3A', letterSpacing: '0.5px', marginBottom: '12px'}}>Career Assessment</label>
                  <input
                    type="text"
                    value="Career Assessment"
                    disabled
                    style={{opacity: 0.6, padding: '12px', background: '#FAF5F0', border: '1px solid #E8D5C4', borderRadius: '6px', color: '#5A4A3A'}}
                  />
                  <input
                    type="hidden"
                    value={tests.find(t => t.test_name === 'Career Assessment')?.test_id || ''}
                    onChange={(e) => setFormData({ ...formData, test_id: parseInt(e.target.value) })}
                  />
                </div>
                <div className="form-group" style={{marginBottom: '30px'}}>
                  <label style={{fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: '#5A4A3A', letterSpacing: '0.5px', marginBottom: '12px', display: 'block'}}>Question Category <span style={{fontWeight: 'normal', fontSize: '11px', color: '#8B7A6A'}}>(select one or more)</span></label>
                  <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                    <div
                      onClick={() => setShowCategorySelector(true)}
                      style={{flex: 1, padding: '10px 12px', border: formData.category && formData.category.trim() ? '1px solid #90B58D' : '1px solid #E8D5C4', borderRadius: '6px', background: '#FAF5F0', minHeight: '40px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', cursor: 'pointer'}}
                    >
                      {formData.category ? formData.category.split(',').map((c, i) => (
                        <span key={i} style={{background: '#C97A6F', color: '#fff', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '500'}}>{c.trim()}</span>
                      )) : <span style={{color: '#8B7A6A', fontSize: '14px'}}>Select categories...</span>}
                    </div>
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
                          <div style={{display: 'flex', gap: '8px', paddingTop: '0px', flexWrap: 'wrap', alignItems: 'center'}}>
                            <button
                              type="button"
                              onClick={() => openTraitSelector(index)}
                              style={{padding: '10px 14px', border: '1px solid #2A2A3E', borderRadius: '8px', background: (option.trait && option.trait.length > 0) ? '#C97A6F' : '#2A2A3E', color: '#FFF', cursor: 'pointer', fontSize: '12px', fontWeight: '500', transition: 'all 0.2s ease', whiteSpace: 'nowrap', minWidth: '80px', textAlign: 'center'}}
                              onMouseEnter={(e) => {
                                e.target.style.borderColor = '#C97A6F';
                                if (!option.trait || option.trait.length === 0) {
                                  e.target.style.background = '#3A3A4E';
                                } else {
                                  e.target.style.background = '#B8634F';
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.borderColor = '#2A2A3E';
                                if (!option.trait || option.trait.length === 0) {
                                  e.target.style.background = '#2A2A3E';
                                } else {
                                  e.target.style.background = '#C97A6F';
                                }
                              }}
                            >
                              <i className="fas fa-tags" style={{marginRight: '6px'}}></i>
                              {(option.trait && option.trait.length > 0) ? `${option.trait.length} Trait${option.trait.length > 1 ? 's' : ''}` : 'Traits'}
                            </button>
                            {option.trait && option.trait.length > 0 && (
                              <div style={{display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '200px'}}>
                                {option.trait.map((t, ti) => (
                                  <span key={ti} style={{padding: '3px 8px', background: 'rgba(201, 122, 111, 0.3)', color: '#C97A6F', borderRadius: '12px', fontSize: '10px', fontWeight: '500', border: '1px solid rgba(201, 122, 111, 0.4)'}}>
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}
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
                <button type="button" className="btn btn-secondary" onClick={() => {setShowModal(false); setError(''); setFormData({test_id: '', question_text: '', category: ''}); setOptions([{ text: '', trait: [] }, { text: '', trait: [] }, { text: '', trait: [] }, { text: '', trait: [] }]);}}>
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
              <h2>Select Categories</h2>
              <button className="close-btn" onClick={() => setShowCategorySelector(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body" style={{padding: '30px'}}>
              {/* Selected categories display */}
              <div style={{marginBottom: '20px', padding: '15px', background: '#FAF5F0', borderRadius: '8px', border: (formData.category && formData.category.trim()) ? '1px solid #90B58D' : '1px solid #E8D5C4'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                  <div style={{fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#8B7A6A'}}>Selected Categories</div>
                  <div style={{fontSize: '13px', fontWeight: '600', color: (formData.category && formData.category.trim()) ? '#90B58D' : '#C97A6F'}}>
                    {(formData.category && formData.category.trim()) && <i className="fas fa-check-circle" style={{marginRight: '4px'}}></i>}
                    {formData.category ? formData.category.split(',').filter(c => c.trim()).length : 0} selected
                  </div>
                </div>
                <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px', minHeight: '32px'}}>
                  {formData.category && formData.category.trim() ? formData.category.split(',').filter(c => c.trim()).map((cat, i) => (
                    <span key={i} onClick={() => {
                      const cats = formData.category.split(',').map(c => c.trim()).filter(Boolean);
                      const updated = cats.filter(c => c !== cat.trim());
                      setFormData({ ...formData, category: updated.join(', ') });
                    }} style={{background: '#C97A6F', color: '#fff', padding: '6px 12px', borderRadius: '16px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'}}>
                      {cat.trim()}
                      <i className="fas fa-times" style={{fontSize: '10px'}}></i>
                    </span>
                  )) : <span style={{color: '#8B7A6A', fontSize: '14px'}}>Select categories from the options below</span>}
                </div>
              </div>
              {Object.entries(getMergedCategories()).map(([group, categories]) => (
                <div key={group} style={{marginBottom: '30px'}}>
                  <h3 style={{fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', color: '#C97A6F', marginBottom: '15px', letterSpacing: '0.5px'}}>
                    {group}
                  </h3>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px'}}>
                    {categories.map(category => {
                      const selectedCats = formData.category ? formData.category.split(',').map(c => c.trim()).filter(Boolean) : [];
                      const isSelected = selectedCats.includes(category);
                      return (
                        <button
                          key={category}
                          type="button"
                          onClick={() => {
                            const cats = formData.category ? formData.category.split(',').map(c => c.trim()).filter(Boolean) : [];
                            const updated = isSelected ? cats.filter(c => c !== category) : [...cats, category];
                            setFormData({ ...formData, category: updated.join(', ') });
                          }}
                          style={{
                            padding: '12px 15px',
                            border: isSelected ? '2px solid #C97A6F' : '2px solid #E8D5C4',
                            borderRadius: '6px',
                            background: isSelected ? '#C97A6F' : '#FAF5F0',
                            color: isSelected ? '#FFF' : '#5A4A3A',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '500',
                            transition: 'all 0.2s ease',
                            textAlign: 'center'
                          }}
                        >
                          {isSelected && <i className="fas fa-check" style={{marginRight: '6px'}}></i>}
                          {category}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-footer" style={{justifyContent: 'space-between', alignItems: 'center'}}>
              <div style={{fontSize: '13px', color: (formData.category && formData.category.trim()) ? '#90B58D' : '#8B7A6A'}}>
                {(formData.category && formData.category.trim())
                  ? <><i className="fas fa-check-circle" style={{marginRight: '6px'}}></i>Ready ({formData.category.split(',').filter(c => c.trim()).length} selected)</>
                  : 'Select at least 1 category'}
              </div>
              <button type="button" className="btn btn-primary" onClick={() => setShowCategorySelector(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {showTraitSelector && (
        <div className="modal-overlay" onClick={() => { setShowTraitSelector(false); setSelectedOptionIndex(null); }}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()} style={{maxHeight: '90vh', overflowY: 'auto', maxWidth: '1000px', width: '90%'}}>
            <div className="modal-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h2>
                <i className="fas fa-tags" style={{marginRight: '8px'}}></i>
                Select Trait Tags
                {selectedOptionIndex !== null && options[selectedOptionIndex]?.trait?.length > 0 && (
                  <span style={{fontSize: '14px', fontWeight: '400', marginLeft: '12px', color: '#90B58D'}}>
                    ({options[selectedOptionIndex].trait.length} selected)
                  </span>
                )}
              </h2>
              <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                <button 
                  type="button" 
                  onClick={() => setShowNewTraitInput(!showNewTraitInput)}
                  style={{padding: '8px 12px', background: '#90B58D', color: '#FFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500'}}
                >
                  <i className="fas fa-plus" style={{marginRight: '6px'}}></i> Add Trait
                </button>
                <button className="close-btn" onClick={() => { setShowTraitSelector(false); setSelectedOptionIndex(null); }}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
            {/* Show selected traits summary */}
            {selectedOptionIndex !== null && options[selectedOptionIndex]?.trait?.length > 0 && (
              <div style={{padding: '12px 30px', background: 'rgba(144, 181, 141, 0.1)', borderBottom: '1px solid #E8D5C4', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center'}}>
                <span style={{fontSize: '12px', fontWeight: '600', color: '#5A4A3A', marginRight: '8px'}}>Selected:</span>
                {options[selectedOptionIndex].trait.map((t, i) => (
                  <span key={i} style={{padding: '4px 10px', background: '#C97A6F', color: '#FFF', borderRadius: '12px', fontSize: '11px', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '4px'}}>
                    {t}
                    <span 
                      onClick={() => selectTrait(t)} 
                      style={{cursor: 'pointer', marginLeft: '2px', fontWeight: '700'}}
                    >×</span>
                  </span>
                ))}
              </div>
            )}
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
              {Object.entries(getMergedTraitCategories()).map(([category, traits]) => {
                const currentTraits = (selectedOptionIndex !== null && options[selectedOptionIndex]?.trait) || [];
                return (
                <div key={category} style={{marginBottom: '30px'}}>
                  <h3 style={{fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', color: '#C97A6F', marginBottom: '15px', letterSpacing: '0.5px'}}>
                    {category}
                  </h3>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px'}}>
                    {traits.map(trait => {
                      const isSelected = Array.isArray(currentTraits) && currentTraits.includes(trait);
                      return (
                      <button
                        key={trait}
                        type="button"
                        onClick={() => selectTrait(trait)}
                        style={{
                          padding: '12px 15px',
                          border: isSelected ? '2px solid #C97A6F' : '2px solid #E8D5C4',
                          borderRadius: '6px',
                          background: isSelected ? '#C97A6F' : '#FAF5F0',
                          color: isSelected ? '#FFF' : '#5A4A3A',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '500',
                          transition: 'all 0.2s ease',
                          textAlign: 'center',
                          position: 'relative'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = isSelected ? '#B8634F' : '#F5E6D3';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = isSelected ? '#C97A6F' : '#FAF5F0';
                        }}
                      >
                        {isSelected && <i className="fas fa-check" style={{marginRight: '6px', fontSize: '11px'}}></i>}
                        {trait}
                      </button>
                      );
                    })}
                  </div>
                </div>
                );
              })}
            </div>
            <div className="modal-footer" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <span style={{fontSize: '13px', color: '#888'}}>
                Click traits to select/deselect. You can choose multiple.
              </span>
              <button type="button" className="btn btn-primary" onClick={() => { setShowTraitSelector(false); setSelectedOptionIndex(null); }}>
                <i className="fas fa-check" style={{marginRight: '6px'}}></i> Done
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
            maxWidth: '800px',
            width: '95%',
            maxHeight: '90vh',
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
                  setEditOptions([]);
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
              {/* Question Text */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#a0a0a0', marginBottom: '8px', fontSize: '14px' }}>
                  Question Text *
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
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                  required
                />
              </div>

              {/* Question Order */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#a0a0a0', marginBottom: '8px', fontSize: '14px' }}>
                  Question Order
                </label>
                <input
                  type="number"
                  value={editData.question_order || 1}
                  onChange={(e) => setEditData({ ...editData, question_order: parseInt(e.target.value) })}
                  style={{
                    width: '120px',
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

              {/* Question Category */}
              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', color: '#a0a0a0', marginBottom: '8px', fontSize: '14px' }}>
                  Question Category <span style={{fontWeight: 'normal', fontSize: '12px', color: '#666'}}>(select one or more)</span>
                </label>
                <div
                  onClick={() => setShowEditCategorySelector(true)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: editData.category && editData.category.trim() ? '1px solid #4CAF50' : '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    minHeight: '44px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                    alignItems: 'center',
                    cursor: 'pointer'
                  }}
                >
                  {editData.category && editData.category.trim() ? editData.category.split(',').filter(c => c.trim()).map((cat, i) => (
                    <span key={i} style={{background: '#C97A6F', color: '#fff', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '500'}}>{cat.trim()}</span>
                  )) : <span style={{color: '#666', fontSize: '14px'}}>Click to select categories...</span>}
                </div>
              </div>

              {/* Options Section */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ color: '#a0a0a0', fontSize: '14px' }}>
                    <i className="fas fa-list" style={{ marginRight: '8px' }}></i>
                    Answer Options & Trait Tags
                  </label>
                  <button
                    type="button"
                    onClick={addEditOption}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500'
                    }}
                  >
                    <i className="fas fa-plus" style={{ marginRight: '6px' }}></i>
                    Add Option
                  </button>
                </div>
                
                {editOptionsLoading ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#a0a0a0' }}>
                    <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                    Loading options...
                  </div>
                ) : editOptions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#a0a0a0', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                    No options yet. Click "Add Option" to create one.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
                    {editOptions.map((option, index) => (
                      <div key={option.option_id} style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto 40px',
                        gap: '12px',
                        padding: '15px',
                        background: option.isNew ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '10px',
                        border: option.isNew ? '1px solid rgba(76, 175, 80, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)'
                      }}>
                        <div>
                          <label style={{ display: 'block', color: '#6b7280', marginBottom: '6px', fontSize: '12px' }}>
                            Option {index + 1} {option.isNew && <span style={{ color: '#4CAF50' }}>(new)</span>}
                          </label>
                          <input
                            type="text"
                            value={option.option_text || ''}
                            onChange={(e) => updateEditOption(index, 'option_text', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: '6px',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              background: 'rgba(255, 255, 255, 0.05)',
                              color: '#fff',
                              fontSize: '14px'
                            }}
                            placeholder="Option text..."
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', color: '#6b7280', marginBottom: '6px', fontSize: '12px' }}>
                            Trait Tags
                          </label>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setEditSelectedOptionIndex(index);
                                setShowEditTraitSelector(true);
                              }}
                              style={{
                                padding: '10px 12px',
                                borderRadius: '6px',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                background: (Array.isArray(option.trait_tag) ? option.trait_tag.length > 0 : !!option.trait_tag) ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                color: (Array.isArray(option.trait_tag) ? option.trait_tag.length > 0 : !!option.trait_tag) ? '#a78bfa' : '#6b7280',
                                fontSize: '13px',
                                cursor: 'pointer',
                                textAlign: 'left',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                minWidth: '140px'
                              }}
                            >
                              <span>
                                <i className="fas fa-tags" style={{ marginRight: '6px' }}></i>
                                {Array.isArray(option.trait_tag) && option.trait_tag.length > 0 
                                  ? `${option.trait_tag.length} Trait${option.trait_tag.length > 1 ? 's' : ''}` 
                                  : 'Select traits...'}
                              </span>
                              <i className="fas fa-chevron-down" style={{ fontSize: '10px' }}></i>
                            </button>
                            {Array.isArray(option.trait_tag) && option.trait_tag.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {option.trait_tag.map((t, ti) => (
                                  <span key={ti} style={{
                                    padding: '2px 8px',
                                    background: 'rgba(139, 92, 246, 0.2)',
                                    color: '#a78bfa',
                                    borderRadius: '10px',
                                    fontSize: '10px',
                                    fontWeight: '500',
                                    border: '1px solid rgba(139, 92, 246, 0.3)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                  }}>
                                    {t}
                                    <span 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const updated = option.trait_tag.filter(tr => tr !== t);
                                        updateEditOption(index, 'trait_tag', updated);
                                      }}
                                      style={{ cursor: 'pointer', fontWeight: '700', fontSize: '12px' }}
                                    >×</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '2px' }}>
                          <button
                            type="button"
                            onClick={() => removeEditOption(index)}
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '6px',
                              border: 'none',
                              background: 'rgba(239, 68, 68, 0.2)',
                              color: '#ef4444',
                              cursor: 'pointer',
                              fontSize: '14px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = 'rgba(239, 68, 68, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = 'rgba(239, 68, 68, 0.2)';
                            }}
                            title="Delete option"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end', marginTop: '25px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setEditModal(false);
                    setEditData(null);
                    setEditOptions([]);
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

      {/* Edit Trait Selector Modal */}
      {showEditTraitSelector && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            borderRadius: '16px',
            padding: '25px',
            maxWidth: '700px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#fff', margin: 0 }}>
                <i className="fas fa-tags" style={{ marginRight: '10px', color: '#8b5cf6' }}></i>
                Select Trait Tags
                {editSelectedOptionIndex !== null && Array.isArray(editOptions[editSelectedOptionIndex]?.trait_tag) && editOptions[editSelectedOptionIndex].trait_tag.length > 0 && (
                  <span style={{ fontSize: '14px', fontWeight: '400', marginLeft: '12px', color: '#a78bfa' }}>
                    ({editOptions[editSelectedOptionIndex].trait_tag.length} selected)
                  </span>
                )}
              </h3>
              <button
                onClick={() => setShowEditTraitSelector(false)}
                style={{ background: 'none', border: 'none', color: '#a0a0a0', cursor: 'pointer', fontSize: '20px' }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            {/* Selected traits summary */}
            {editSelectedOptionIndex !== null && Array.isArray(editOptions[editSelectedOptionIndex]?.trait_tag) && editOptions[editSelectedOptionIndex].trait_tag.length > 0 && (
              <div style={{ padding: '10px 15px', marginBottom: '15px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#a78bfa', marginRight: '8px' }}>Selected:</span>
                {editOptions[editSelectedOptionIndex].trait_tag.map((t, i) => (
                  <span key={i} style={{
                    padding: '3px 10px',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                    color: '#fff',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '500',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {t}
                    <span 
                      onClick={() => {
                        const updated = editOptions[editSelectedOptionIndex].trait_tag.filter(tr => tr !== t);
                        updateEditOption(editSelectedOptionIndex, 'trait_tag', updated);
                      }}
                      style={{ cursor: 'pointer', marginLeft: '2px', fontWeight: '700' }}
                    >×</span>
                  </span>
                ))}
              </div>
            )}
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
              {Object.entries(traitCategories).slice(0, 11).map(([category, traits]) => {
                const currentEditTraits = (editSelectedOptionIndex !== null && Array.isArray(editOptions[editSelectedOptionIndex]?.trait_tag)) 
                  ? editOptions[editSelectedOptionIndex].trait_tag 
                  : [];
                return (
                <div key={category} style={{ marginBottom: '15px' }}>
                  <div style={{ color: '#8b5cf6', fontSize: '12px', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>
                    {category}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {traits.map(trait => {
                      const isSelected = currentEditTraits.includes(trait);
                      return (
                      <button
                        key={trait}
                        type="button"
                        onClick={() => {
                          const updatedTraits = isSelected
                            ? currentEditTraits.filter(t => t !== trait)
                            : [...currentEditTraits, trait];
                          updateEditOption(editSelectedOptionIndex, 'trait_tag', updatedTraits);
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '15px',
                          border: 'none',
                          background: isSelected 
                            ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' 
                            : 'rgba(255, 255, 255, 0.1)',
                          color: '#fff',
                          fontSize: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        {isSelected && <i className="fas fa-check" style={{ marginRight: '4px', fontSize: '10px' }}></i>}
                        {trait}
                      </button>
                      );
                    })}
                  </div>
                </div>
                );
              })}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize: '13px', color: '#6b7280' }}>
                Click traits to select/deselect. You can choose multiple.
              </span>
              <button
                type="button"
                onClick={() => setShowEditTraitSelector(false)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600'
                }}
              >
                <i className="fas fa-check" style={{ marginRight: '6px' }}></i> Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Category Selector Modal */}
      {showEditCategorySelector && editData && (
        <div className="modal-overlay" onClick={() => setShowEditCategorySelector(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()} style={{maxHeight: '90vh', overflowY: 'auto', maxWidth: '1000px', width: '90%'}}>
            <div className="modal-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h2>Select Categories</h2>
              <button className="close-btn" onClick={() => setShowEditCategorySelector(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body" style={{padding: '30px'}}>
              {/* Selected categories display */}
              <div style={{marginBottom: '20px', padding: '15px', background: '#1e293b', borderRadius: '8px', border: (editData.category && editData.category.trim()) ? '1px solid #4CAF50' : '1px solid #334155'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                  <div style={{fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#94a3b8'}}>Selected Categories</div>
                  <div style={{fontSize: '13px', fontWeight: '600', color: (editData.category && editData.category.trim()) ? '#4CAF50' : '#f59e0b'}}>
                    {(editData.category && editData.category.trim()) && <i className="fas fa-check-circle" style={{marginRight: '4px'}}></i>}
                    {editData.category ? editData.category.split(',').filter(c => c.trim()).length : 0} selected
                  </div>
                </div>
                <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px', minHeight: '32px'}}>
                  {editData.category && editData.category.trim() ? editData.category.split(',').filter(c => c.trim()).map((cat, i) => (
                    <span key={i} onClick={() => {
                      const cats = editData.category.split(',').map(c => c.trim()).filter(Boolean);
                      const updated = cats.filter(c => c !== cat.trim());
                      setEditData({ ...editData, category: updated.join(', ') });
                    }} style={{background: '#C97A6F', color: '#fff', padding: '6px 12px', borderRadius: '16px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'}}>
                      {cat.trim()}
                      <i className="fas fa-times" style={{fontSize: '10px'}}></i>
                    </span>
                  )) : <span style={{color: '#6b7280', fontSize: '14px'}}>Select categories from the options below</span>}
                </div>
              </div>
              {Object.entries(getMergedCategories()).map(([group, categories]) => (
                <div key={group} style={{marginBottom: '30px'}}>
                  <h3 style={{fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', color: '#C97A6F', marginBottom: '15px', letterSpacing: '0.5px'}}>
                    {group}
                  </h3>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px'}}>
                    {categories.map(category => {
                      const selectedCats = editData.category ? editData.category.split(',').map(c => c.trim()).filter(Boolean) : [];
                      const isSelected = selectedCats.includes(category);
                      return (
                        <button
                          key={category}
                          type="button"
                          onClick={() => {
                            const cats = editData.category ? editData.category.split(',').map(c => c.trim()).filter(Boolean) : [];
                            const updated = isSelected ? cats.filter(c => c !== category) : [...cats, category];
                            setEditData({ ...editData, category: updated.join(', ') });
                          }}
                          style={{
                            padding: '12px 15px',
                            border: isSelected ? '2px solid #C97A6F' : '2px solid #374151',
                            borderRadius: '6px',
                            background: isSelected ? '#C97A6F' : '#1e293b',
                            color: isSelected ? '#FFF' : '#e2e8f0',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '500',
                            transition: 'all 0.2s ease',
                            textAlign: 'center'
                          }}
                        >
                          {isSelected && <i className="fas fa-check" style={{marginRight: '6px'}}></i>}
                          {category}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-footer" style={{justifyContent: 'space-between', alignItems: 'center'}}>
              <div style={{fontSize: '13px', color: (editData.category && editData.category.trim()) ? '#4CAF50' : '#94a3b8'}}>
                {(editData.category && editData.category.trim())
                  ? <><i className="fas fa-check-circle" style={{marginRight: '6px'}}></i>Ready ({editData.category.split(',').filter(c => c.trim()).length} selected)</>
                  : 'Select at least 1 category'}
              </div>
              <button type="button" className="btn btn-primary" onClick={() => setShowEditCategorySelector(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuestionsPage;
